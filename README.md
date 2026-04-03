# Sentiment Analysis Dashboard

Real-time customer feedback sentiment classification with quarterly trend forecasting. Upload a CSV or paste raw text — the dashboard classifies each item as Positive, Negative, or Neutral and projects the sentiment trend 12 weeks forward.

**Live Demo:** https://sentiment-analysis-dashboard-dyr0.onrender.com  
**Loom Walkthrough:** [Coming soon]

---

## Features

- **CSV upload** — drop in any CSV with a `text`, `feedback`, `content`, or `message` column
- **Copy/paste input** — newline-separated, comma-separated, or single entries; auto-detected
- **Real-time classification** — DistilBERT via HuggingFace Inference API
- **Live dashboard** — donut chart + stat cards update via WebSocket on every submission
- **Trend chart** — rolling % positive sentiment plotted as a line chart
- **Quarterly forecast** — 12-week linear regression projection with 95% confidence interval
- **Export** — download all results as CSV with text, sentiment, confidence score, and timestamp

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| ML Model | `distilbert-base-uncased-finetuned-sst-2-english` (HuggingFace Inference API) |
| Backend | Python 3.11, FastAPI, WebSockets, httpx |
| Forecasting | scikit-learn LinearRegression, NumPy |
| Data Processing | Pandas |
| Frontend | React 18, TypeScript, Vite |
| Charts | Recharts |
| Styling | Tailwind CSS |
| Backend Deployment | Render.com (free tier) |
| Frontend Deployment | Vercel (free tier) |

---

## Running Locally

### Prerequisites

- Python 3.11
- Node.js 18+
- A free [HuggingFace API token](https://huggingface.co/settings/tokens)

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Add your HF_API_TOKEN to .env
python run.py
```

The API will be available at `http://localhost:8000`.

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev
```

Open `http://localhost:5173`.

### With Docker Compose

```bash
docker-compose up --build
```

Both services start together. Frontend at `http://localhost:5173`, backend at `http://localhost:8000`.

---

## API Reference

### `POST /api/classify`
Classify an array of feedback strings.

```json
// Request
{ "text": ["Great product!", "Terrible experience.", "It was okay."] }

// Response
{
  "results": [
    { "text": "Great product!", "label": "POSITIVE", "score": 0.9998 },
    { "text": "Terrible experience.", "label": "NEGATIVE", "score": 0.9985 },
    { "text": "It was okay.", "label": "NEUTRAL", "score": 0.5412 }
  ]
}
```

### `POST /api/classify/csv`
Upload a `.csv` file (multipart form). Auto-detects column name from: `text`, `feedback`, `content`, `message`.

### `POST /api/classify/paste`
Parse and classify pasted text. Supports newline-separated, comma-separated, or single-item input.

### `POST /api/export`
Download current session results as a CSV file.

### `WebSocket /ws/sentiment`
Persistent connection. Client sends results after classification; server responds with updated stats and forecast.

```json
// Client → Server
{ "event": "results_update", "data": { "results": [...] } }

// Server → Client
{
  "event": "classification_complete",
  "data": {
    "results": [...],
    "stats": { "total": 42, "positive_pct": 61.9, "negative_pct": 23.8, "neutral_pct": 14.3, ... },
    "forecast": { "history": [...], "forecast": [...], "confidence_interval": [...] }
  }
}
```

### `GET /health`
Returns `{ "status": "ok" }`. Used by Render for health checks.

---

## Sentiment Classification Logic

The model (`distilbert-base-uncased-finetuned-sst-2-english`) is a binary SST-2 classifier that outputs POSITIVE or NEGATIVE with a confidence score, hosted via the HuggingFace Inference API. NEUTRAL is derived from the score:

| Score Range | Label |
|-------------|-------|
| > 0.60 | POSITIVE or NEGATIVE (whichever the model chose) |
| 0.40 – 0.60 | NEUTRAL |
| < 0.40 | POSITIVE or NEGATIVE (whichever the model chose) |

---

## Forecasting

1. Compute a rolling 5-item window of % positive sentiment over all classified results
2. Fit a `LinearRegression` model (scikit-learn) to the rolling average
3. Project 12 weeks forward
4. Calculate 95% confidence interval from the standard deviation of residuals (±1.96σ)
5. Return history, forecast, and CI band to the frontend for Recharts rendering

Requires a minimum of 3 data points. Returns `null` if insufficient data.

---

## Deployment

### Backend — Render.com (Free Tier)

1. Push to GitHub
2. Go to [Render.com](https://render.com) → New → Web Service → connect your repo
3. Configure:
   - **Root Directory:** `backend`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 8000`
4. Add environment variables:
   - `PYTHON_VERSION` = `3.11.9`
   - `HF_API_TOKEN` = your HuggingFace API token
   - `FRONTEND_ORIGIN` = your Vercel URL (add after frontend is deployed)
5. Deploy

> **Note:** Free tier spins down after 15 minutes of inactivity. First request after idle takes ~30 seconds to wake up.

### Frontend — Vercel (Free Tier)

1. Push to GitHub
2. Go to [Vercel.com](https://vercel.com) → Import → select your repo
3. Set **Root Directory** to `frontend`
4. Add environment variables:
   - `VITE_API_URL` = `https://your-render-service.onrender.com`
   - `VITE_WS_URL` = `wss://your-render-service.onrender.com`
5. Deploy

**Total cost: $0**

---

## Project Structure

```
sentiment-analysis-dashboard/
├── backend/
│   ├── main.py                  # FastAPI app, CORS, lifespan
│   ├── models.py                # Pydantic data models
│   ├── run.py                   # Uvicorn entry point
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── runtime.txt              # Pins Python to 3.11.9 for Render
│   ├── services/
│   │   ├── sentiment.py         # HF Inference API classification + NEUTRAL threshold
│   │   ├── data_processor.py    # CSV + paste parsing, sanitization
│   │   └── forecast.py          # Linear regression forecasting
│   └── routes/
│       ├── classify.py          # POST /api/classify (text, CSV, paste)
│       ├── export.py            # POST /api/export
│       └── ws.py                # WebSocket /ws/sentiment
│
├── frontend/
│   └── src/
│       ├── types.ts             # Shared TypeScript types
│       ├── vite-env.d.ts        # Vite client type declarations
│       ├── App.tsx              # Root layout + WebSocket wiring
│       ├── context/
│       │   └── SentimentContext.tsx  # Global state (results, stats, forecast)
│       ├── hooks/
│       │   └── useWebSocket.ts       # Persistent WS + exponential backoff reconnect
│       └── components/
│           ├── UploadSection.tsx     # CSV upload + paste input
│           ├── Dashboard.tsx         # Stat cards + donut chart
│           ├── SentimentChart.tsx    # Trend line + forecast + CI band
│           └── ResultsTable.tsx      # Sort, filter, paginate, export
│
├── docker-compose.yml
└── .gitignore
```

---

## Key Design Decisions

- **HuggingFace Inference API over local inference** — DistilBERT running locally via PyTorch exceeded Render's free tier 512MB RAM limit; the HF Inference API provides the same model with zero memory overhead at no cost
- **NEUTRAL via threshold** — SST-2 is binary; scores in [0.40, 0.60] are treated as neutral rather than switching to a heavier 3-class model
- **Persistent WebSocket** — connection opens on page load and auto-reconnects with exponential backoff; enables real-time progress updates mid-classification and handles Render's 15-minute idle spin-down
- **Session-only storage** — no database; all state lives in backend memory + React context; session clears on refresh or 1 hour of inactivity
- **Linear regression forecast** — simple, interpretable, and sufficient for trend projection on small datasets typical of a session
- **Python 3.11 pinned** — Render defaults to Python 3.14 which lacks pre-built wheels for pydantic-core; pinned via `PYTHON_VERSION=3.11.9` env variable

---

## Future Improvements

- Database persistence (PostgreSQL) for cross-session history
- Multi-user support with authentication
- 3-class sentiment model for more accurate neutral detection
- Slack / webhook integration for automated feedback ingestion
- Custom model fine-tuning on domain-specific data
