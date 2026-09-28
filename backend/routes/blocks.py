"""
GET  /blocks/strategic?horizon=weekly|monthly|strategic
     -> CP-SAT schedule for the chosen planning horizon (Gantt chart data source)
POST /blocks/emergency/{task_id}
     -> triggers the MILP emergency solver for one task
"""
from fastapi import APIRouter
from routes.tasks import get_scored_tasks
from cp_sat_solver import run_strategic_solver
from milp_emergency import run_emergency_solver, should_trigger_emergency
from synthetic_data import generate_train_timetable_blocks, generate_goods_train_probability

router = APIRouter()

# Horizon -> (planning window in hours, fraction of the priority-ranked
# backlog that gets planned into that window). Weekly plans only the most
# urgent slice, monthly widens it, strategic (26-week RBP) plans everything.
# Safety-critical tasks (IMR/KAVACH/OHE) are always included.
HORIZONS = {
    "weekly":    {"hours": 168,  "fraction": 0.4},
    "monthly":   {"hours": 720,  "fraction": 0.75},
    "strategic": {"hours": 4368, "fraction": 1.0},
}
CRITICAL_DEFECTS = {"IMR", "KAVACH", "OHE"}


@router.get("/blocks/strategic")
def strategic_schedule(horizon: str = "weekly"):
    cfg = HORIZONS.get(horizon, HORIZONS["weekly"])
    all_tasks = get_scored_tasks()  # already sorted by priority, highest first

    keep_n = max(1, round(len(all_tasks) * cfg["fraction"]))
    selected = [
        t for i, t in enumerate(all_tasks)
        if i < keep_n or t["defect_code"] in CRITICAL_DEFECTS
    ]

    solver_input = [
        {
            "id": t["id"],
            "section_id": t["section_id"],
            "department": t["department"],
            "priority_score": t["priority_score"],
            "defect_code": t["defect_code"],
        }
        for t in selected
    ]
    schedule = run_strategic_solver(solver_input, planning_horizon_hours=cfg["hours"])
    return {
        "blocks": schedule,
        "shadow_block_count": sum(1 for b in schedule if b["is_shadow_block"]),
        "horizon": horizon,
        "horizon_hours": cfg["hours"],
        "tasks_planned": len(selected),
        "tasks_total": len(all_tasks),
    }


@router.post("/blocks/emergency/{task_id}")
def trigger_emergency(task_id: int):
    tasks = get_scored_tasks()
    task = next((t for t in tasks if t["id"] == task_id), None)
    if not task:
        return {"error": "task not found"}

    if not should_trigger_emergency(task, task["defect_code"]):
        return {"triggered": False, "reason": "task does not meet emergency threshold"}

    occupied = generate_train_timetable_blocks(task["section_id"])
    goods_prob = generate_goods_train_probability(task["section_id"])
    result = run_emergency_solver(
        task_id, task["section_id"], occupied, goods_prob,
        trains_per_day=task["trains_per_day"],
    )

    if result is None:
        return {"triggered": True, "solved": False,
                "message": "No feasible window in next 48h - escalate to DRM"}

    return {"triggered": True, "solved": True, "block": result}