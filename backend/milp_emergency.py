"""
STAGE 3F / 3E / 2C - Operational emergency solver using PuLP (free MILP, CBC backend).

Triggered when an IMR / KAVACH / OHE event fires, or when a task's
combined Weibull urgency crosses the emergency threshold.

Picks the best block window in the next 48 hours using three cost terms:
  1. TIME       - later start = higher cost (an emergency should not wait)
  2. GOODS RISK - goods trains have no fixed timetable (soft, probabilistic)
  3. DISRUPTION - XGBoost operational-impact score for that hour of day
                  (Stage 2C): peak-hour blocks disrupt more trains
Passenger trains (fixed COA timetable) are a HARD constraint.
"""
import pulp
from datetime import datetime, timedelta
from impact_scoring import predict_disruption, XGBOOST_AVAILABLE

EMERGENCY_URGENCY_THRESHOLD = 6.0   # combined Weibull urgency that triggers this

TIME_WEIGHT = 1.0          # cost per hour of waiting
GOODS_RISK_WEIGHT = 8.0    # cost per unit of cumulative goods-train probability
DISRUPTION_WEIGHT = 0.1    # cost per point of XGBoost disruption score (0-100)
CAUTION_THRESHOLD = 0.3    # goods risk above this gets a warning flag
LOCAL_UTC_OFFSET_HOURS = 5.5   # IST - so "peak hour" means local rush hour


def should_trigger_emergency(task_scoring: dict, defect_code: str) -> bool:
    if defect_code == "ROUTINE":
        return False
    if defect_code in {"IMR", "KAVACH", "OHE"}:
        return True
    return task_scoring.get("combined_weibull_urgency", 0) >= EMERGENCY_URGENCY_THRESHOLD


def run_emergency_solver(task_id: int, section_id: str, existing_blocked_hours: list,
                          goods_train_probability: dict = None,
                          window_hours: int = 48, duration_hours: int = 2,
                          trains_per_day: int = 50):
    goods_train_probability = goods_train_probability or {}
    hours = list(range(window_hours))
    now = datetime.utcnow()

    passenger_occupied = {
        h: 1 if any(s <= h < e for s, e in existing_blocked_hours) else 0 for h in hours
    }

    # hard constraint: the whole window must be free of passenger trains
    feasible_starts = [
        h for h in hours
        if h + duration_hours <= window_hours
        and all(passenger_occupied.get(x, 0) == 0 for x in range(h, h + duration_hours))
    ]
    if not feasible_starts:
        return None

    # XGBoost disruption score for every hour in the window (Stage 2C).
    # Synthetic assumption for the prototype: lower-density sections
    # (< 50 trains/day) are assumed to have an alternate route.
    has_alt_route = trains_per_day < 50

    def disruption_at(hour_offset: int) -> float:
        local = now + timedelta(hours=hour_offset + LOCAL_UTC_OFFSET_HOURS)
        return predict_disruption(
            trains_per_day=trains_per_day,
            hour=local.hour,
            is_weekend=local.weekday() >= 5,
            has_alt_route=has_alt_route,
            junction_complexity=0.5,
        )

    hourly_disruption = {x: disruption_at(x) for x in hours}

    risk_for_start = {
        h: sum(goods_train_probability.get(x, 0.0) for x in range(h, h + duration_hours))
        for h in feasible_starts
    }
    disruption_for_start = {
        h: sum(hourly_disruption[x] for x in range(h, h + duration_hours)) / duration_hours
        for h in feasible_starts
    }

    prob = pulp.LpProblem(f"emergency_block_task_{task_id}", pulp.LpMinimize)
    choice = pulp.LpVariable.dicts("choice", feasible_starts, cat="Binary")
    prob += pulp.lpSum(
        choice[h] * (
            TIME_WEIGHT * h
            + GOODS_RISK_WEIGHT * risk_for_start[h]
            + DISRUPTION_WEIGHT * disruption_for_start[h]
        )
        for h in feasible_starts
    )
    prob += pulp.lpSum(choice[h] for h in feasible_starts) == 1
    prob.solve(pulp.PULP_CBC_CMD(msg=False))

    chosen_start = next(h for h in feasible_starts if pulp.value(choice[h]) == 1)
    end = chosen_start + duration_hours
    chosen_risk = round(risk_for_start[chosen_start], 3)

    return {
        "task_id": task_id,
        "section_id": section_id,
        "start_time": (now + timedelta(hours=chosen_start)).isoformat(),
        "end_time": (now + timedelta(hours=end)).isoformat(),
        "horizon": "emergency",
        "solved_via": "PuLP/CBC MILP: passenger hard constraint + goods-train risk + XGBoost disruption cost",
        "goods_train_collision_risk": chosen_risk,
        "goods_train_caution": chosen_risk >= CAUTION_THRESHOLD,
        "operational_disruption_score": round(disruption_for_start[chosen_start], 1),
        "disruption_model": "XGBoost" if XGBOOST_AVAILABLE else "heuristic fallback",
    }