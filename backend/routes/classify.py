import logging

from fastapi import APIRouter, HTTPException, UploadFile, File

from models import ClassifyRequest
from services.data_processor import parse_csv, parse_paste
from services.sentiment import classify_batch

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/classify", response_model=dict)
async def classify(request: ClassifyRequest):
    """
    Classify an array of feedback strings.

    Request: { "text": ["feedback1", "feedback2", ...] }
    Response: { "results": [{ text, label, score }, ...] }
    """
    if not request.text:
        raise HTTPException(status_code=422, detail="text array cannot be empty")

    try:
        results = await classify_batch(request.text)
    except Exception as e:
        logger.error(f"Classification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {"results": [r.model_dump() for r in results]}


@router.post("/api/classify/csv", response_model=dict)
async def classify_csv(file: UploadFile = File(...)):
    """
    Accept a CSV upload, parse it, and classify each row.

    Response: { "results": [{ text, label, score }, ...] }
    """
    if not file.filename or not file.filename.endswith(".csv"):
        raise HTTPException(status_code=422, detail="File must be a .csv")

    try:
        contents = await file.read()
        texts = parse_csv(contents)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        logger.error(f"CSV parse error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse CSV")

    if not texts:
        raise HTTPException(status_code=422, detail="CSV contained no valid feedback rows")

    try:
        results = await classify_batch(texts)
    except Exception as e:
        logger.error(f"Classification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {"results": [r.model_dump() for r in results]}


@router.post("/api/classify/paste", response_model=dict)
async def classify_paste(request: ClassifyRequest):
    """
    Accept pasted text, parse it into items, and classify.

    Request: { "text": ["<raw pasted text>"] }  (single-element array)
    Response: { "results": [{ text, label, score }, ...] }
    """
    if not request.text:
        raise HTTPException(status_code=422, detail="text cannot be empty")

    raw = request.text[0]
    try:
        texts = parse_paste(raw)
    except Exception as e:
        logger.error(f"Paste parse error: {e}")
        raise HTTPException(status_code=500, detail="Failed to parse pasted text")

    if not texts:
        raise HTTPException(status_code=422, detail="No valid feedback items detected")

    try:
        results = await classify_batch(texts)
    except Exception as e:
        logger.error(f"Classification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

    return {"results": [r.model_dump() for r in results]}
