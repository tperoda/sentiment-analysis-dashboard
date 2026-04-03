import logging
import re
from typing import List

import pandas as pd

logger = logging.getLogger(__name__)

MAX_CHARS_PER_ITEM = 5000
MAX_ITEMS = 100
SUPPORTED_COLUMNS = ["text", "feedback", "content", "message"]


def sanitize_text(text: str) -> str:
    """Remove HTML tags, strip whitespace, truncate to MAX_CHARS_PER_ITEM."""
    text = re.sub(r"<[^>]+>", "", text)   # strip HTML tags
    text = text.strip()
    if len(text) > MAX_CHARS_PER_ITEM:
        logger.warning(f"Text exceeds {MAX_CHARS_PER_ITEM} chars, truncating")
        text = text[:MAX_CHARS_PER_ITEM]
    return text


def parse_csv(file_bytes: bytes) -> List[str]:
    """
    Parse a CSV file and extract the feedback column.

    Looks for columns named: text, feedback, content, message (case-insensitive).

    Args:
        file_bytes: Raw bytes of the uploaded CSV file.

    Returns:
        List of sanitized feedback strings (up to MAX_ITEMS).

    Raises:
        ValueError: If no supported column is found.
    """
    import io
    df = pd.read_csv(io.BytesIO(file_bytes))
    df.columns = [c.lower().strip() for c in df.columns]

    col = next((c for c in SUPPORTED_COLUMNS if c in df.columns), None)
    if col is None:
        raise ValueError(
            f"No supported column found. Expected one of: {SUPPORTED_COLUMNS}. "
            f"Got: {list(df.columns)}"
        )

    texts = df[col].dropna().astype(str).tolist()
    texts = [sanitize_text(t) for t in texts if t.strip()]
    texts = [t for t in texts if t]  # drop empty after sanitization

    if len(texts) > MAX_ITEMS:
        logger.warning(f"CSV has {len(texts)} items, truncating to {MAX_ITEMS}")
        texts = texts[:MAX_ITEMS]

    logger.info(f"Parsed {len(texts)} items from CSV")
    return texts


def parse_paste(raw: str) -> List[str]:
    """
    Parse copy/pasted text into individual feedback items.

    Auto-detects format:
    - Newline-separated → split on \\n
    - Comma-separated (single line) → split on comma
    - Single item → return as list of one

    Args:
        raw: Raw pasted text from the user.

    Returns:
        List of sanitized feedback strings (up to MAX_ITEMS).
    """
    raw = raw.strip()
    if not raw:
        return []

    lines = [l.strip() for l in raw.splitlines() if l.strip()]

    if len(lines) > 1:
        items = lines
    elif "," in raw:
        items = [p.strip() for p in raw.split(",") if p.strip()]
    else:
        items = [raw]

    items = [sanitize_text(i) for i in items]
    items = [i for i in items if i]

    if len(items) > MAX_ITEMS:
        logger.warning(f"Paste has {len(items)} items, truncating to {MAX_ITEMS}")
        items = items[:MAX_ITEMS]

    logger.info(f"Parsed {len(items)} items from paste")
    return items
