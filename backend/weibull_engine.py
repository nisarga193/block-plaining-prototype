"""
STAGE 2A / 2B - Weibull Hazard based Priority Scoring engine.

Replaces the RSF/XGBoost failure-prediction pipeline with a closed-form
reliability engineering formula that needs no training data - only
published beta/eta parameters per asset type.

Formula:
  h(t)      = (beta/eta) * (t/eta)^(beta-1)                [Weibull hazard]
  U(t)      = exp(lambda * days_overdue)                    [regulatory urgency]
  W(t)      = h(t) + U(t)                                   [combined urgency multiplier]
  P(task)   = 0.5*SafetyWeight + 0.2*RouteDensity + 0.3*W(t)   ... then * WeatherModifier

The hazard function itself is computed via scipy.stats.weibull_min, which
gives the exact analytical Weibull hazard (pdf / survival function) rather
than a hand-rolled version of the same formula - this keeps the reliability
math consistent with the standard library other infrastructure/aerospace
reliability tooling uses, and makes it trivial to later swap in scipy's
fit() method once real failure event data accumulates (see Stage 5B).
"""
import math
from scipy.stats import weibull_min

# Published-standard shape (beta) and scale (eta) parameters per asset type.
# beta > 1 means failure rate increases with age/load - the "wear-out" mode,
# which is the correct physical behavior for rail and OHE fatigue.
# These are illustrative literature-consistent values for the prototype;
# swap in Indian Railways manual values for production.
WEIBULL_PARAMS = {
    "IMR":     {"beta": 2.2, "eta": 400},   # eta in GMT (gross million tonnes) for rail
    "REM":     {"beta": 2.0, "eta": 550},
    "OBS":     {"beta": 1.6, "eta": 700},
    "KAVACH":  {"beta": 2.5, "eta": 6},     # eta in years of service for electronics
    "OHE":     {"beta": 1.8, "eta": 10},    # eta in years for OHE contact wire
    "ROUTINE": {"beta": 1.3, "eta": 12},
}

SAFETY_WEIGHTS = {
    "KAVACH": 100,
    "IMR": 100,
    "OHE": 90,
    "REM": 70,
    "OBS": 40,
    "ROUTINE": 20,
}

LAMBDA_URGENCY = 0.05  # tuning constant for the regulatory overdue term


def weibull_hazard(defect_code: str, t: float) -> float:
    """
    Computes h(t) = f(t) / S(t) using scipy.stats.weibull_min, where f is
    the probability density and S is the survival function. This is the
    exact analytical hazard rate, equivalent to the closed-form
    (beta/eta)*(t/eta)^(beta-1) formula but computed through scipy so the
    same distribution object can later be re-fit (weibull_min.fit) once
    real division-specific failure data exists (Stage 5B recalibration).
    """
    params = WEIBULL_PARAMS.get(defect_code, WEIBULL_PARAMS["ROUTINE"])
    beta, eta = params["beta"], params["eta"]
    if t <= 0:
        t = 0.01

    dist = weibull_min(c=beta, scale=eta)
    pdf = dist.pdf(t)
    survival = dist.sf(t)  # sf = 1 - cdf

    if survival <= 1e-12:
        # asset is past its characteristic life - treat as maximal hazard
        return 1e6
    return pdf / survival


def regulatory_urgency(days_overdue: int) -> float:
    return math.exp(LAMBDA_URGENCY * max(days_overdue, 0))


# Assets whose Weibull scale (eta) is measured in years of service.
# Everything else (rail defects) is measured in gross million tonnes.
YEAR_BASED_ASSETS = {"KAVACH", "OHE", "ROUTINE"}


def predicted_days_to_failure(defect_code: str, t: float, tonnage_per_day: float = 1.0) -> float:
    """ Rough inverse estimate of how many days until the asset reaches its
    characteristic life (eta). Year-based assets convert years to days;
    tonnage-based rail assets use remaining tonnage / daily tonnage. """
    params = WEIBULL_PARAMS.get(defect_code, WEIBULL_PARAMS["ROUTINE"])
    eta = params["eta"]
    remaining = max(eta - t, 0.01)

    if defect_code in YEAR_BASED_ASSETS:
        return round(remaining * 365, 1)
    return round(remaining / max(tonnage_per_day, 0.01), 1)


def route_density_score(trains_per_day: int) -> float:
    """ Normalize trains/day to a 0-100 scale. Assume 100 trains/day as the
    top-density benchmark (e.g. Delhi-Howrah trunk route). """
    return min(100.0, (trains_per_day / 100.0) * 100)


def weather_modifier(defect_code: str, rainfall_forecast_mm: float) -> float:
    """ Ballast/drainage-sensitive defect types get boosted ahead of heavy
    rainfall forecasts (Stage 1E weather integration). """
    rain_sensitive = {"OBS", "REM", "IMR"}
    if defect_code in rain_sensitive and rainfall_forecast_mm > 50:
        return 1.3
    return 1.0


def compute_priority(defect_code: str, t: float, days_overdue: int,
                      trains_per_day: int, rainfall_forecast_mm: float = 0) -> dict:
    """
    Returns the full breakdown dict - this same structure feeds directly
    into the SHAP-style explainability panel (Stage 4B) since every term
    is already interpretable and separable.
    """
    safety_weight = SAFETY_WEIGHTS.get(defect_code, 20)
    density = route_density_score(trains_per_day)
    hazard = weibull_hazard(defect_code, t)
    urgency = regulatory_urgency(days_overdue)
    combined_urgency = hazard + urgency
    weather_mult = weather_modifier(defect_code, rainfall_forecast_mm)

    raw_score = (0.5 * safety_weight) + (0.2 * density) + (0.3 * combined_urgency * 10)
    final_score = raw_score * weather_mult

    return {
        "safety_weight": safety_weight,
        "route_density_score": round(density, 2),
        "weibull_hazard": round(hazard, 4),
        "regulatory_urgency": round(urgency, 4),
        "combined_weibull_urgency": round(combined_urgency, 4),
        "weather_modifier": weather_mult,
        "priority_score": round(final_score, 2),
        "predicted_days_to_failure": predicted_days_to_failure(defect_code, t),
        "contribution_breakdown": {
            "safety_term": round(0.5 * safety_weight, 2),
            "density_term": round(0.2 * density, 2),
            "urgency_term": round(0.3 * combined_urgency * 10, 2),
            "weather_multiplier_effect": round(raw_score * (weather_mult - 1), 2),
        }
    }


# ---- hardcoded conflict tiebreaker hierarchy (Stage 2D) ----
TIEBREAKER_RANK = {
    "KAVACH": 1,
    "IMR": 2,
    "OHE": 3,
    "REM": 4,
    "OBS": 5,
    "ROUTINE": 6,
}


def tiebreak(task_a: dict, task_b: dict) -> dict:
    """ Given two tasks with equal priority_score, returns the one that
    wins under the hardcoded safety hierarchy. Cannot be overridden by
    the optimizer's objective function. """
    rank_a = TIEBREAKER_RANK.get(task_a["defect_code"], 6)
    rank_b = TIEBREAKER_RANK.get(task_b["defect_code"], 6)
    return task_a if rank_a <= rank_b else task_b
