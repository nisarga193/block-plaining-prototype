"""
STAGE 3F - Auto-firing pre-emptive emergency trigger.
The frontend polls GET /alerts/live; the backend decides which tasks
qualify, runs the MILP solver once per task, and returns the history.
A lock prevents two simultaneous polls from firing the same task twice.
"""
import threading
from datetime import datetime

from fastapi import APIRouter
from routes.tasks import get_scored_tasks
from milp_emergency import run_emergency_solver, should_trigger_emergency
from synthetic_data import generate_train_timetable_blocks, generate_goods_train_probability

router = APIRouter()

_lock = threading.Lock()
_already_fired = set()   # task ids that have already auto-triggered
_fired_log = []          # newest first


@router.get("/alerts/live")
def live_alerts():
    tasks = get_scored_tasks()

    with _lock:
        for t in tasks:
            if t["id"] in _already_fired:
                continue
            if not should_trigger_emergency(t, t["defect_code"]):
                continue

            occupied = generate_train_timetable_blocks(t["section_id"])
            goods_prob = generate_goods_train_probability(t["section_id"])
            result = run_emergency_solver(
                t["id"], t["section_id"], occupied, goods_prob,
                trains_per_day=t["trains_per_day"],
            )

            _already_fired.add(t["id"])
            _fired_log.insert(0, {
                "task_id": t["id"],
                "section_id": t["section_id"],
                "defect_code": t["defect_code"],
                "priority_score": t["priority_score"],
                "fired_at": datetime.utcnow().isoformat(),
                "solved": result is not None,
                "block": result,
                "message": None if result else "No feasible window in next 48h - escalated to DRM",
            })

        return {"alerts": list(_fired_log), "total_fired": len(_fired_log)}


@router.post("/alerts/reset")
def reset_alerts():
    """ Demo helper: clears fired state so the auto-trigger can be re-demoed. """
    with _lock:
        _already_fired.clear()
        _fired_log.clear()
    return {"status": "cleared"}