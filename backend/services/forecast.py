import logging
from typing import Dict, List

import numpy as np
from sklearn.linear_model import LinearRegression

logger = logging.getLogger(__name__)

MIN_HISTORY_POINTS = 3  # Need at least this many points to fit a meaningful line


def forecast_sentiment(history: List[float], weeks: int = 12) -> Dict:
    """
    Forecast sentiment trend using linear regression.

    Args:
        history: List of % positive sentiment values (0–100), ordered chronologically.
        weeks: Number of weeks to project forward (default 12).

    Returns:
        {
            "history": [[idx, pct], ...],
            "forecast": [[idx, pct], ...],
            "confidence_interval": [[idx, ci_lower, ci_upper], ...]
        }

    Raises:
        ValueError: If history has fewer than MIN_HISTORY_POINTS points.
    """
    if len(history) < MIN_HISTORY_POINTS:
        raise ValueError(
            f"Need at least {MIN_HISTORY_POINTS} data points to forecast. "
            f"Got {len(history)}."
        )

    X = np.arange(len(history)).reshape(-1, 1)
    y = np.array(history)

    model = LinearRegression()
    model.fit(X, y)

    future_X = np.arange(len(history), len(history) + weeks).reshape(-1, 1)
    forecast_vals = model.predict(future_X)

    # 95% confidence interval using residual standard deviation
    residuals = y - model.predict(X)
    std_residuals = np.std(residuals)
    ci = 1.96 * std_residuals

    # Clamp forecast to [0, 100]
    forecast_vals = np.clip(forecast_vals, 0, 100)

    logger.info(f"Forecast generated: {weeks} weeks, slope={model.coef_[0]:.3f}, CI=±{ci:.2f}")

    return {
        "history": [[i, float(h)] for i, h in enumerate(history)],
        "forecast": [
            [len(history) + i, float(np.clip(f, 0, 100))]
            for i, f in enumerate(forecast_vals)
        ],
        "confidence_interval": [
            [
                len(history) + i,
                float(np.clip(f - ci, 0, 100)),
                float(np.clip(f + ci, 0, 100)),
            ]
            for i, f in enumerate(forecast_vals)
        ],
    }


def compute_rolling_positive_pct(labels: List[str], window: int = 5) -> List[float]:
    """
    Compute rolling average of % positive sentiment over a sliding window.

    Args:
        labels: List of sentiment labels ("POSITIVE", "NEGATIVE", "NEUTRAL").
        window: Rolling window size (default 5).

    Returns:
        List of % positive values (0–100), one per window position.
    """
    if not labels:
        return []

    pct_positive = []
    for i in range(len(labels)):
        start = max(0, i - window + 1)
        window_labels = labels[start : i + 1]
        pct = (window_labels.count("POSITIVE") / len(window_labels)) * 100
        pct_positive.append(round(pct, 2))

    return pct_positive
