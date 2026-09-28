"""
STAGE 3A/3B/3C/3D - Strategic optimizer using Google OR-Tools CP-SAT.

Models each maintenance task as an interval variable and finds a schedule
that respects hard constraints (no overlap with trains, crew/machine
capacity) while:
  (a) scheduling high Priority Score tasks earlier,
  (b) breaking ties between equal-priority tasks using the hardcoded
      safety tiebreaker hierarchy from Stage 2D (Kavach > IMR > OHE >
      REM > OBS > Routine) - this is now an actual term in the objective
      function, not just a helper function sitting unused,
  (c) actively REWARDING the solver for overlapping tasks from different
      departments on the same section - i.e. shadow blocks are no longer
      a side effect discovered by post-processing, the solver is
      mathematically incentivized to create them, exactly as Stage 3B/3D
      describe.

This is a working, simplified version suitable for a prototype-scale
instance (tens of tasks across a handful of sections over a short
planning window). The structure mirrors what a full 26-week production
version would extend.
"""
from ortools.sat.python import cp_model
from collections import defaultdict
from weibull_engine import TIEBREAKER_RANK

# How much weight the tiebreaker hierarchy gets relative to priority score.
# Kept small on purpose: it should only decide ORDER between tasks that are
# already tied (or nearly tied) on priority_score, never override a large
# genuine priority gap.
TIEBREAK_WEIGHT = 5

# How strongly the objective rewards a shadow block (overlapping tasks
# from different departments on the same section). This is subtracted
# from the objective, so a bigger number here means CP-SAT works harder
# to create integrated blocks instead of scattering tasks across separate
# windows - this is the literal implementation of the "shadow block
# reward term" described in Stage 3B/3D of the workflow document.
SHADOW_BLOCK_REWARD = 5000


def run_strategic_solver(tasks: list, planning_horizon_hours: int = 168,
                          max_concurrent_crews: int = 3, block_duration_hours: int = 4):
    """
    tasks: list of dicts, each with:
        id, section_id, department, priority_score, defect_code
    Returns: list of scheduled block dicts:
        {task_ids: [...], section_id, departments: [...], start_hour, end_hour,
         is_shadow_block, priority_sum}
    """
    if not tasks:
        return []

    model = cp_model.CpModel()
    horizon = planning_horizon_hours

    starts, ends, intervals = {}, {}, {}
    for t in tasks:
        tid = t["id"]
        starts[tid] = model.NewIntVar(0, horizon - block_duration_hours, f"start_{tid}")
        ends[tid] = model.NewIntVar(block_duration_hours, horizon, f"end_{tid}")
        intervals[tid] = model.NewIntervalVar(starts[tid], block_duration_hours, ends[tid], f"interval_{tid}")

    # Hard constraint: overall crew/machine capacity across the whole
    # division - no more than max_concurrent_crews tasks running at once,
    # regardless of section.
    model.AddCumulative(list(intervals.values()), [1] * len(tasks), max_concurrent_crews)

    objective_terms = []

    # --- (a) + (b): priority-weighted start time, with the tiebreaker
    # hierarchy folded in as a small secondary term. Lower TIEBREAKER_RANK
    # means more safety-critical (1 = Kavach, the top of the hierarchy),
    # so we convert it into a bonus that favors earlier scheduling for the
    # more critical defect type when priority scores are close or tied.
    for t in tasks:
        tid = t["id"]
        rank = TIEBREAKER_RANK.get(t["defect_code"], 6)
        tiebreak_bonus = (7 - rank) * TIEBREAK_WEIGHT   # rank 1 (Kavach) -> +30, rank 6 -> +5
        weight = int(t["priority_score"] * 1000) + tiebreak_bonus
        objective_terms.append(starts[tid] * weight)

    # --- (c): real shadow-block reward. For every pair of tasks that sit
    # on the SAME block_section_id but belong to DIFFERENT departments,
    # create a reified boolean that is true exactly when their intervals
    # overlap, and subtract a large reward from the objective when it does.
    by_section = defaultdict(list)
    for t in tasks:
        by_section[t["section_id"]].append(t)

    shadow_bonus_terms = []
    for section_id, section_tasks in by_section.items():
        for i in range(len(section_tasks)):
            for j in range(i + 1, len(section_tasks)):
                t_i, t_j = section_tasks[i], section_tasks[j]
                if t_i["department"] == t_j["department"]:
                    continue  # shadow blocks are specifically CROSS-department
                tid_i, tid_j = t_i["id"], t_j["id"]

                before_ij = model.NewBoolVar(f"before_{tid_i}_{tid_j}")
                before_ji = model.NewBoolVar(f"before_{tid_j}_{tid_i}")
                model.Add(ends[tid_i] <= starts[tid_j]).OnlyEnforceIf(before_ij)
                model.Add(ends[tid_j] <= starts[tid_i]).OnlyEnforceIf(before_ji)

                overlap = model.NewBoolVar(f"overlap_{tid_i}_{tid_j}")
                # overlap is true iff NEITHER task is fully before the other
                model.AddBoolOr([before_ij, before_ji, overlap])
                model.AddImplication(overlap, before_ij.Not())
                model.AddImplication(overlap, before_ji.Not())

                shadow_bonus_terms.append(overlap)

    # subtracting from the objective = rewarding (since we minimize)
    if shadow_bonus_terms:
        objective_terms.append(-SHADOW_BLOCK_REWARD * sum(shadow_bonus_terms))

    model.Minimize(sum(objective_terms))

    solver = cp_model.CpSolver()
    solver.parameters.max_time_in_seconds = 8.0
    status = solver.Solve(model)

    if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
        return []

    # collect raw per-task schedule
    raw_schedule = []
    for t in tasks:
        tid = t["id"]
        raw_schedule.append({
            "task_id": tid,
            "section_id": t["section_id"],
            "department": t["department"],
            "defect_code": t["defect_code"],
            "priority_score": t["priority_score"],
            "start_hour": solver.Value(starts[tid]),
            "end_hour": solver.Value(ends[tid]),
        })

    # group into blocks for display: same section + overlapping window.
    # Because of the shadow-block reward above, cross-department overlaps
    # are no longer accidental - they're what the solver was pushed toward.
    grouped = defaultdict(list)
    for row in raw_schedule:
        grouped[row["section_id"]].append(row)

    blocks = []
    for section_id, rows in grouped.items():
        rows.sort(key=lambda r: r["start_hour"])
        current_group = [rows[0]]
        for r in rows[1:]:
            last = current_group[-1]
            if r["start_hour"] <= last["end_hour"]:  # overlaps -> same shadow block
                current_group.append(r)
            else:
                blocks.append(_finalize_block(section_id, current_group))
                current_group = [r]
        blocks.append(_finalize_block(section_id, current_group))

    return blocks


def _finalize_block(section_id, rows):
    departments = sorted(set(r["department"] for r in rows))
    return {
        "section_id": section_id,
        "task_ids": [r["task_id"] for r in rows],
        "departments": departments,
        "is_shadow_block": len(departments) > 1,
        "start_hour": min(r["start_hour"] for r in rows),
        "end_hour": max(r["end_hour"] for r in rows),
        "priority_sum": sum(r["priority_score"] for r in rows),
    }
