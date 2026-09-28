"""
STAGE 1 - Synthetic data generator.
Stands in for live TMS / SMMS / TDMS / COA / Weather API for the prototype.
Produces realistic-looking maintenance tasks pre-mapped to block_section_ids
via the Spatial Harmonization Layer.
"""
import random
import json
import time
import urllib.request
from spatial_harmony import SAMPLE_SECTIONS

DEPARTMENTS = ["Civil", "TRD", "S&T"]
DEFECT_BY_DEPARTMENT = {
    "Civil": ["IMR", "REM", "OBS", "ROUTINE"],
    "TRD": ["OHE", "ROUTINE"],
    "S&T": ["KAVACH", "ROUTINE"],
}


def generate_synthetic_tasks(n_per_section: int = 4, seed: int = 42):
    random.seed(seed)
    tasks = []
    for sec in SAMPLE_SECTIONS:
        for _ in range(n_per_section):
            dept = random.choice(DEPARTMENTS)
            defect = random.choice(DEFECT_BY_DEPARTMENT[dept])

            if dept == "Civil":
                raw_id = f"km {round(random.uniform(sec['km_start'], sec['km_end']), 1)}"
                age_or_tonnage = round(random.uniform(50, 650), 1)   # GMT
            elif dept == "TRD":
                raw_id = sec["trd_mast_range"].split(" to ")[0]
                age_or_tonnage = round(random.uniform(1, 12), 1)     # years
            else:
                raw_id = sec["st_point_ids"].split(",")[0].strip()
                age_or_tonnage = round(random.uniform(0.5, 8), 1)    # years

            tasks.append({
                "section_id": sec["id"],
                "department": dept,
                "defect_code": defect,
                "raw_asset_id": raw_id,
                "age_or_tonnage": age_or_tonnage,
                "days_overdue": random.randint(0, 45),
                "trains_per_day": sec["trains_per_day"],
            })
    return tasks


# ---- Weather (Stage 1E) -------------------------------------------------
# Live 7-day rainfall forecast from Open-Meteo (free, no API key).
# Falls back to a synthetic value if the API is unreachable, so the demo
# never breaks when the internet is down.
DIVISION_COORDS = {"Nagpur": (21.1458, 79.0882)}
WEATHER_TTL_SECONDS = 30 * 60   # cache for 30 min so polling doesn't spam the API
FORCE_RAINFALL_MM = 80        # demo override: set e.g. 80 to force the monsoon boost

_weather_cache = {"data": None, "fetched_at": 0.0}


def generate_weather_forecast(division: str = "Nagpur"):
    now = time.time()
    cached = _weather_cache["data"]
    if cached and (now - _weather_cache["fetched_at"] < WEATHER_TTL_SECONDS):
        return cached

    lat, lon = DIVISION_COORDS.get(division, DIVISION_COORDS["Nagpur"])
    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={lat}&longitude={lon}"
        "&daily=precipitation_sum&forecast_days=7&timezone=auto"
    )

    try:
        with urllib.request.urlopen(url, timeout=5) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        daily = [v or 0 for v in payload["daily"]["precipitation_sum"]]
        result = {
            "division": division,
            "rainfall_forecast_mm_7day": round(sum(daily), 1),
            "daily_mm": daily,
            "source": "Open-Meteo (live)",
        }
    except Exception:
        result = {
            "division": division,
            "rainfall_forecast_mm_7day": round(random.uniform(0, 120), 1),
            "daily_mm": [],
            "source": "synthetic fallback (Open-Meteo unreachable)",
        }

    if FORCE_RAINFALL_MM is not None:
        result["rainfall_forecast_mm_7day"] = FORCE_RAINFALL_MM
        result["source"] += " + DEMO OVERRIDE"

    _weather_cache["data"] = result
    _weather_cache["fetched_at"] = now
    return result


def generate_train_timetable_blocks(section_id: str, hours: int = 168):
    """ Synthetic already-occupied hour ranges for scheduled PASSENGER
    trains - these are fixed timetable slots from COA and are treated as
    a HARD constraint (a block can never overlap them). """
    random.seed(hash(section_id) % 1000)
    occupied = []
    h = 0
    while h < hours:
        if random.random() < 0.35:
            duration = random.randint(1, 3)
            occupied.append((h, min(h + duration, hours)))
            h += duration
        h += random.randint(1, 4)
    return occupied


def generate_goods_train_probability(section_id: str, hours: int = 48):
    """
    STAGE 3E - Goods trains do not run on fixed timetables, so COA only
    provides a probability of corridor occupation per hour rather than an
    exact window. Returns {hour: probability_0_to_1}. Higher probability
    hours (e.g. known freight corridor peak windows) should be avoided by
    the solver when a clear alternative exists; low-probability hours can
    still be used but should be flagged with a caution indicator.
    """
    random.seed((hash(section_id) * 7) % 1000)
    probs = {}
    for h in range(hours):
        # simulate a couple of "freight peak" windows with elevated probability
        base = random.uniform(0.02, 0.15)
        if 1 <= (h % 24) <= 4 or 22 <= (h % 24) <= 23:
            base += random.uniform(0.25, 0.45)  # overnight freight peak
        probs[h] = round(min(base, 0.95), 3)
    return probs
