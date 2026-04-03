import json
import logging
from datetime import datetime, timezone

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from models import SessionStats, ForecastData
from services.forecast import forecast_sentiment, compute_rolling_positive_pct

logger = logging.getLogger(__name__)
router = APIRouter()


def _compute_stats(results: list) -> dict:
    total = len(results)
    if total == 0:
        return {"total": 0, "positive": 0, "negative": 0, "neutral": 0,
                "positive_pct": 0.0, "negative_pct": 0.0, "neutral_pct": 0.0}

    positive = sum(1 for r in results if r["label"] == "POSITIVE")
    negative = sum(1 for r in results if r["label"] == "NEGATIVE")
    neutral = sum(1 for r in results if r["label"] == "NEUTRAL")

    return {
        "total": total,
        "positive": positive,
        "negative": negative,
        "neutral": neutral,
        "positive_pct": round(positive / total * 100, 1),
        "negative_pct": round(negative / total * 100, 1),
        "neutral_pct": round(neutral / total * 100, 1),
    }


def _compute_forecast(results: list) -> dict | None:
    labels = [r["label"] for r in results]
    rolling = compute_rolling_positive_pct(labels)
    if len(rolling) < 3:
        return None
    try:
        return forecast_sentiment(rolling)
    except ValueError as e:
        logger.warning(f"Forecast skipped: {e}")
        return None


@router.websocket("/ws/sentiment")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("WebSocket client connected")

    try:
        while True:
            # Wait for a classify trigger message from the client
            raw = await websocket.receive_text()
            try:
                message = json.loads(raw)
            except json.JSONDecodeError:
                await websocket.send_json({"event": "error", "data": {"message": "Invalid JSON"}})
                continue

            event = message.get("event")

            if event == "results_update":
                # Client sends new results; server re-broadcasts stats + forecast
                new_results = message.get("data", {}).get("results", [])

                # Append to session
                session = websocket.app.state.session_results
                timestamp = datetime.now(timezone.utc).isoformat()
                for r in new_results:
                    r["timestamp"] = timestamp
                    session.append(r)

                stats = _compute_stats(session)
                forecast = _compute_forecast(session)

                await websocket.send_json({
                    "event": "classification_complete",
                    "data": {
                        "results": new_results,
                        "stats": stats,
                        "forecast": forecast,
                    },
                })

            elif event == "clear_session":
                websocket.app.state.session_results.clear()
                await websocket.send_json({"event": "session_cleared", "data": {}})

            elif event == "ping":
                await websocket.send_json({"event": "pong", "data": {}})

    except WebSocketDisconnect:
        logger.info("WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        try:
            await websocket.send_json({"event": "error", "data": {"message": str(e)}})
        except Exception:
            pass
