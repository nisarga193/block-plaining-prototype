"""
GET /tasks - returns all synthetic tasks fully scored with Priority Score
and explainability breakdown. This is the main data the dashboard's task
list and SHAP panel are built from.
"""
from fastapi import APIRouter
from synthetic_data import generate_synthetic_tasks, generate_weather_forecast
from weibull_engine import compute_priority

router = APIRouter()

_cached_tasks = None


def get_scored_tasks(force_refresh: bool = False):
    global _cached_tasks
    if _cached_tasks is not None and not force_refresh:
        return _cached_tasks

    raw_tasks = generate_synthetic_tasks()
    weather = generate_weather_forecast()
    rainfall = weather["rainfall_forecast_mm_7day"]

    scored = []
    for i, t in enumerate(raw_tasks):
        scoring = compute_priority(
            defect_code=t["defect_code"],
            t=t["age_or_tonnage"],
            days_overdue=t["days_overdue"],
            trains_per_day=t["trains_per_day"],
            rainfall_forecast_mm=rainfall,
        )
        scored.append({
            "id": i + 1,
            **t,
            **scoring,
        })

    scored.sort(key=lambda x: x["priority_score"], reverse=True)
    _cached_tasks = scored
    return scored


@router.get("/tasks")
def list_tasks():
    return {"tasks": get_scored_tasks(), "weather": generate_weather_forecast()}


@router.get("/tasks/{task_id}")
def get_task(task_id: int):
    tasks = get_scored_tasks()
    match = next((t for t in tasks if t["id"] == task_id), None)
    return match or {"error": "task not found"}

@router.get("/weather")
def weather():
    return generate_weather_forecast()
