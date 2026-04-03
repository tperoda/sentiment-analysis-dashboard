import csv
import io
import logging
from datetime import datetime

from fastapi import APIRouter, Request
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/api/export")
async def export_csv(request: Request):
    """
    Export current session results as a CSV download.

    Reads session results from app state (set by WebSocket / classify routes).
    Response: CSV file with columns: text, sentiment, score, timestamp
    """
    session_results = request.app.state.session_results

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["text", "sentiment", "confidence_score", "timestamp"])

    for item in session_results:
        writer.writerow([
            item.get("text", ""),
            item.get("label", ""),
            item.get("score", ""),
            item.get("timestamp", ""),
        ])

    output.seek(0)
    filename = f"sentiment_results_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
