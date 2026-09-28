"""
GET /kpis - computes the four Stage 4E KPIs from the current synthetic
task set and strategic schedule: BGR, IMU, machine utilization, backlog delta.
"""
from fastapi import APIRouter
from routes.tasks import get_scored_tasks
from routes.blocks import strategic_schedule

router = APIRouter()


@router.get("/kpis")
def get_kpis():
    tasks = get_scored_tasks()
    schedule_response = strategic_schedule(horizon="strategic")
    blocks = schedule_response["blocks"]

    total_tasks = len(tasks)
    scheduled_task_ids = set()
    for b in blocks:
        scheduled_task_ids.update(b["task_ids"])

    # Block Grant Ratio: % of demanded tasks that got a scheduled block
    bgr = round((len(scheduled_task_ids) / total_tasks) * 100, 1) if total_tasks else 0

    # Integrated Multi-department Utilization: % of block *time* that is shadow (multi-dept)
    total_hours = sum(b["end_hour"] - b["start_hour"] for b in blocks) or 1
    shadow_hours = sum(b["end_hour"] - b["start_hour"] for b in blocks if b["is_shadow_block"])
    imu = round((shadow_hours / total_hours) * 100, 1)

    # Machine Utilization Rate: proxy = scheduled block hours / total available crew-hours
    max_crew_hours = 3 * 168  # 3 crews * 168 hours in the planning window
    eta_machine = round((total_hours / max_crew_hours) * 100, 1)

    # Maintenance Backlog Reduction: proxy = priority-weighted % of backlog cleared
    total_priority = sum(t["priority_score"] for t in tasks) or 1
    cleared_priority = sum(t["priority_score"] for t in tasks if t["id"] in scheduled_task_ids)
    delta_pi = round((cleared_priority / total_priority) * 100, 1)

    return {
        "block_grant_ratio": bgr,
        "integrated_multi_department_utilization": imu,
        "machine_utilization_rate": eta_machine,
        "maintenance_backlog_reduction": delta_pi,
        "baseline_bgr_note": "CAG-cited current baseline: 60-70%",
        "target_bgr_note": "System target: >90%",
    }
