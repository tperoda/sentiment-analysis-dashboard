import logging
from typing import List

from transformers import pipeline

from models import SentimentResult

logger = logging.getLogger(__name__)

# Loaded once at startup
_classifier = None

NEUTRAL_LOWER = 0.40
NEUTRAL_UPPER = 0.60


def load_model() -> None:
    """Load the DistilBERT SST-2 model into memory. Call once at startup."""
    global _classifier
    logger.info("Loading sentiment model...")
    _classifier = pipeline(
        "sentiment-analysis",
        model="distilbert-base-uncased-finetuned-sst-2-english",
        truncation=True,
        max_length=512,
    )
    logger.info("Sentiment model loaded.")


def _derive_label(raw_label: str, score: float) -> str:
    """
    Map SST-2 binary output to POSITIVE / NEGATIVE / NEUTRAL.

    DistilBERT SST-2 returns POSITIVE or NEGATIVE with a confidence score.
    Scores in [NEUTRAL_LOWER, NEUTRAL_UPPER] are treated as NEUTRAL regardless
    of the raw label direction.
    """
    if NEUTRAL_LOWER <= score <= NEUTRAL_UPPER:
        return "NEUTRAL"
    return raw_label  # Already "POSITIVE" or "NEGATIVE"


def classify_batch(texts: List[str]) -> List[SentimentResult]:
    """
    Classify a list of feedback strings for sentiment.

    Args:
        texts: Non-empty list of sanitized feedback strings.

    Returns:
        List of SentimentResult with label + confidence score.

    Raises:
        RuntimeError: If model has not been loaded via load_model().
        ValueError: If texts is empty.
    """
    if _classifier is None:
        raise RuntimeError("Model not loaded. Call load_model() first.")
    if not texts:
        raise ValueError("texts cannot be empty")

    results: List[SentimentResult] = []
    try:
        raw_outputs = _classifier(texts, batch_size=16)
    except Exception as e:
        logger.error(f"Batch classification failed: {e}")
        raw_outputs = [None] * len(texts)

    for text, output in zip(texts, raw_outputs):
        try:
            if output is None:
                raise ValueError("No output from model")
            label = _derive_label(output["label"], output["score"])
            results.append(SentimentResult(text=text, label=label, score=round(output["score"], 4)))
        except Exception as e:
            logger.error(f"Classification failed for '{text[:50]}': {e}")
            results.append(SentimentResult(text=text, label="NEUTRAL", score=0.0))

    logger.info(f"Classified {len(results)} items")
    return results
