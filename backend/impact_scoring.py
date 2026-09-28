"""
STAGE 2C - Operational Impact Scoring.

Uses XGBoost trained on synthetic COA-style features to estimate how
disruptive a block on a given corridor/time window would be. Falls back
to a transparent heuristic if xgboost isn't installed yet, so the rest
of the backend still runs while you're setting up your environment.
"""
import random

try:
    import xgboost as xgb
    import numpy as np
    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

_model = None


def _make_synthetic_training_data(n=500):
    """ Generates synthetic (features, disruption_label) pairs to train on.
    Features: trains_per_day, hour_of_day, is_weekend, has_alternate_route,
    junction_complexity (0-1). Label: disruption score 0-100. """
    X, y = [], []
    for _ in range(n):
        trains_per_day = random.randint(5, 100)
        hour = random.randint(0, 23)
        is_weekend = random.choice([0, 1])
        has_alt_route = random.choice([0, 1])
        junction_complexity = round(random.uniform(0, 1), 2)

        # synthetic ground truth logic: busier corridors + peak hours +
        # no alternate route + complex junctions = higher disruption
        peak_penalty = 20 if hour in (7, 8, 9, 17, 18, 19) else 0
        base = (trains_per_day * 0.6) + peak_penalty - (is_weekend * 10) \
               - (has_alt_route * 15) + (junction_complexity * 20)
        label = max(0, min(100, base + random.uniform(-5, 5)))

        X.append([trains_per_day, hour, is_weekend, has_alt_route, junction_complexity])
        y.append(label)
    return X, y


def train_model():
    global _model
    if not XGBOOST_AVAILABLE:
        return None
    X, y = _make_synthetic_training_data()
    _model = xgb.XGBRegressor(n_estimators=50, max_depth=4, learning_rate=0.1)
    _model.fit(np.array(X), np.array(y))
    return _model


def predict_disruption(trains_per_day: int, hour: int, is_weekend: bool,
                        has_alt_route: bool, junction_complexity: float = 0.5) -> float:
    global _model
    if XGBOOST_AVAILABLE:
        if _model is None:
            train_model()
        features = [[trains_per_day, hour, int(is_weekend), int(has_alt_route), junction_complexity]]
        return round(float(_model.predict(np.array(features))[0]), 2)
    else:
        # transparent fallback heuristic - same logic as the synthetic label
        peak_penalty = 20 if hour in (7, 8, 9, 17, 18, 19) else 0
        base = (trains_per_day * 0.6) + peak_penalty - (int(is_weekend) * 10) \
               - (int(has_alt_route) * 15) + (junction_complexity * 20)
        return round(max(0, min(100, base)), 2)
