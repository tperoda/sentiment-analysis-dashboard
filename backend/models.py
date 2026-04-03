from pydantic import BaseModel
from typing import List, Literal


class SentimentResult(BaseModel):
    text: str
    label: Literal["POSITIVE", "NEGATIVE", "NEUTRAL"]
    score: float  # 0.0–1.0 confidence


class ClassifyRequest(BaseModel):
    text: List[str]


class SessionStats(BaseModel):
    total: int
    positive: int
    negative: int
    neutral: int
    positive_pct: float
    negative_pct: float
    neutral_pct: float


class ForecastData(BaseModel):
    history: List[List[float]]           # [[idx, pct_positive], ...]
    forecast: List[List[float]]          # [[idx, pct_positive], ...]
    confidence_interval: List[List[float]]  # [[idx, ci_lower, ci_upper], ...]
