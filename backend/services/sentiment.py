import logging
import os
import asyncio
from typing import List

import httpx

from models import SentimentResult

logger = logging.getLogger(__name__)

HF_API_URL = "https://api-inference.huggingface.co/models/distilbert-base-uncased-finetuned-sst-2-english"
HF_API_TOKEN = os.getenv("HF_API_TOKEN", "")

NEUTRAL_LOWER = 0.40
NEUTRAL_UPPER = 0.60

MAX_RETRIES = 3
RETRY_DELAY_S = 10  # HF cold-start wait time


def _derive_label(raw_label: str, score: float) -> str:
    """
    Map SST-2 binary output to POSITIVE / NEGATIVE / NEUTRAL.

    Scores in [NEUTRAL_LOWER, NEUTRAL_UPPER] are treated as NEUTRAL regardless
    of the raw label direction.
    """
    if NEUTRAL_LOWER <= score <= NEUTRAL_UPPER:
        return "NEUTRAL"
    return raw_label


async def classify_batch(texts: List[str]) -> List[SentimentResult]:
    """
    Classify a list of feedback strings via the HuggingFace Inference API.

    Retries up to MAX_RETRIES times if the model is loading (503 cold start).

    Args:
        texts: Non-empty list of sanitized feedback strings.

    Returns:
        List of SentimentResult with label + confidence score.

    Raises:
        ValueError: If texts is empty.
        RuntimeError: If the HF API returns an unrecoverable error.
    """
    if not texts:
        raise ValueError("texts cannot be empty")

    headers = {"Authorization": f"Bearer {HF_API_TOKEN}"}

    async with httpx.AsyncClient(timeout=60.0) as client:
        for attempt in range(MAX_RETRIES):
            response = await client.post(
                HF_API_URL,
                headers=headers,
                json={"inputs": texts},
            )

            if response.status_code == 503:
                # Model is loading on HF side — wait and retry
                estimated_wait = response.json().get("estimated_time", RETRY_DELAY_S)
                wait = min(float(estimated_wait), 20.0)
                logger.warning(f"HF model loading, retrying in {wait:.0f}s (attempt {attempt + 1}/{MAX_RETRIES})")
                await asyncio.sleep(wait)
                continue

            if response.status_code != 200:
                raise RuntimeError(f"HF API error {response.status_code}: {response.text}")

            outputs = response.json()
            break
        else:
            raise RuntimeError("HF model did not load after max retries")

    results: List[SentimentResult] = []
    for text, predictions in zip(texts, outputs):
        try:
            top = predictions[0]  # HF returns results sorted by score desc
            label = _derive_label(top["label"], top["score"])
            results.append(SentimentResult(text=text, label=label, score=round(top["score"], 4)))
        except Exception as e:
            logger.error(f"Failed to parse result for '{text[:50]}': {e}")
            results.append(SentimentResult(text=text, label="NEUTRAL", score=0.0))

    logger.info(f"Classified {len(results)} items via HF Inference API")
    return results
