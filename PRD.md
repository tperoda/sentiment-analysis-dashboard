# Sentiment Analysis Dashboard — Product Requirements Document
**Project:** Real-Time Customer Feedback Sentiment Classification  
**Owner:** tperoda
**Timeline:** April 3 - April 10, 2026 (1 week)  
**Status:** PRD Locked

---

## 📋 PROJECT OVERVIEW

### What It Does
Users upload customer feedback (CSV or copy/paste text) → AI classifies sentiment (positive/negative/neutral in real-time) → Live dashboard shows trends + quarterly forecast.

### Why We're Building It
- Portfolio project: Shows full-stack NLP skills, real-time data flow, forecasting
- Zero API costs (local Hugging Face models)
- Demonstrates: data pipeline, WebSocket communication, predictive analytics
- Different from RAG project: Simpler scope, teaches same patterns, ships faster

### Success = Shipped + Live by April 10
- Deployed backend (Railway) + frontend (Vercel)
- Both input methods working (CSV + copy/paste)
- Line chart with trending + quarterly forecast
- Comprehensive README + 2-min Loom video

---

## 🎯 REQUIREMENTS SPECIFICATION

### MVP Feature Set

#### **Phase 1: Multi-Input Upload & Classify**

**Input Method A: CSV Upload**
- [ ] Users upload .csv file with feedback data
- [ ] Supported column names: `text`, `feedback`, `content`, `message` (auto-detect)
- [ ] Each row parsed and classified
- [ ] Results displayed in table with: text, sentiment (label), confidence score (0-1)
- [ ] Export results back to CSV

**Input Method B: Copy/Paste Text (Sanitized)**
- [ ] Text input box where users paste feedback
- [ ] Support: single line, multi-line, comma-separated, newline-separated
- [ ] Auto-detect format (comma-separated → split on comma; newlines → split on \n)
- [ ] Sanitization: Remove HTML tags, trim whitespace, limit to 5000 chars per chunk, max 100 items at once
- [ ] Real-time as-you-type preview of detected entries
- [ ] Classification on submit

**Output:**
- Table with columns: `text` (truncated to 100 chars), `sentiment` (POSITIVE/NEGATIVE/NEUTRAL), `score` (0.00-1.00)
- Column sort by sentiment, score, or entry order
- Export as CSV button (downloads: text, sentiment, score)

---

#### **Phase 2: Real-Time Dashboard**

**Live Stats Dashboard**
- [ ] Aggregate sentiment counts: 
  - `% Positive`, `% Negative`, `% Neutral` 
  - Total count of classifications
- [ ] Visual: Donut/pie chart showing sentiment distribution
- [ ] Auto-updates when new data is submitted via WebSocket

**Line Chart with Quarterly Forecast**
- [ ] X-axis: Time (or if batch upload, use entry order as proxy)
- [ ] Y-axis: % Positive sentiment (rolling average over 5-item windows)
- [ ] Historical data: Plot as solid line
- [ ] **Quarterly forecast:** Project next 3 months of sentiment trend
  - Use simple linear regression (scikit-learn) on historical %positive
  - Show as dashed line extending 12 weeks into future
  - Include confidence interval (shaded band)
- [ ] Interactive: Hover shows exact value, date if applicable
- [ ] Real-time updates: Chart redraws when new data arrives

**Results Table (Continuous Scroll)**
- [ ] Most recent classifications listed (newest first)
- [ ] Shows: text (100 chars max), sentiment, score, timestamp (local time)
- [ ] Pagination or infinite scroll (fetch 50 at a time)
- [ ] Optional: Filter by sentiment (show only Positive, Negative, etc.)

---

#### **Phase 3: Session Management**

**Session Storage (NOT Persisted)**
- [ ] All classified results live in browser + backend memory
- [ ] Session lasts until page refresh or 1 hour of inactivity
- [ ] No database persistence (keeps it simple)
- [ ] No user auth needed (single-user demo mode)
- [ ] When session ends: User can export current results to CSV before leaving

---

### NOT in MVP (Cut These)
- ❌ Multi-user / authentication
- ❌ Database persistence
- ❌ Custom model training / fine-tuning
- ❌ Multi-language support
- ❌ Batch scheduling
- ❌ API rate limiting (single-user)
- ❌ Email reports
- ❌ Slack integration

---

## 💻 TECHNICAL SPECIFICATIONS

### Tech Stack

| Component | Technology | Why | Cost |
|-----------|-----------|-----|------|
| **LLM Model** | Hugging Face: `distilbert-base-uncased-finetuned-sst-2-english` | Fast, accurate, lightweight (250MB), runs locally | Free |
| **Text Preprocessing** | `transformers` + `nltk` | Standard NLP stack | Free |
| **Data Processing** | Pandas + NumPy | CSV parsing, aggregation | Free |
| **Forecasting** | scikit-learn (LinearRegression) | Simple trend projection | Free |
| **Backend API** | FastAPI + Python 3.10+ | Async, WebSocket support | Free |
| **WebSocket** | FastAPI WebSockets | Real-time frontend updates | Free |
| **Frontend** | React 18 + TypeScript | Component library, hooks | Free |
| **Charting** | Recharts | React charting, interactive, good UX | Free |
| **Form Upload** | React + FormData API | Native file upload | Free |
| **Styling** | Tailwind CSS | Utility-first, responsive | Free |
| **Deployment Backend** | Render.com (free tier) | Free tier, auto spin-down after 15 min inactivity | **$0** |
| **Deployment Frontend** | Vercel | Free tier | Free |

---

### API Endpoints (Backend)

**POST `/api/classify`**
- Request: `{ "text": string[] }` (array of feedback strings)
- Response: `{ "results": [{ text, label, score }] }`
- Behavior: Classify all items in parallel, return in order
- WebSocket: Emit progress updates every 10 items
- Latency target: <2sec for 50 items

**WebSocket `/ws/sentiment`**
- Client connects: `ws://localhost:8000/ws/sentiment`
- Server sends: `{ "event": "classification_complete", "data": { results, stats, forecast } }`
- Real-time stats: `{ "positive": 0.60, "negative": 0.25, "neutral": 0.15, "total": 20 }`
- Forecast data: `{ "history": [[idx, pct], ...], "forecast": [[idx, pct], ...], "confidence": [[idx, ci_lower, ci_upper], ...] }`

**POST `/api/export`**
- Request: None (use session data)
- Response: CSV file (download)
- Content: text, sentiment, score, timestamp

---

### Data Models

**Python (Backend)**
```python
from pydantic import BaseModel
from typing import List

class SentimentResult(BaseModel):
    text: str
    label: Literal["POSITIVE", "NEGATIVE", "NEUTRAL"]
    score: float  # 0.0-1.0 confidence

class ClassifyRequest(BaseModel):
    text: List[str]  # Array of feedback strings

class SessionStats(BaseModel):
    total: int
    positive: int
    negative: int
    neutral: int
    positive_pct: float
    negative_pct: float
    neutral_pct: float

class ForecastData(BaseModel):
    history: List[List[float]]  # [index, pct_positive] pairs
    forecast: List[List[float]]  # Projected 12 weeks out
    confidence_interval: List[List[float]]  # [index, ci_lower, ci_upper]
```

---

### Session Management (Frontend)

**React Context: `SentimentContext`**
```javascript
{
  results: SentimentResult[],
  stats: { total, positive, negative, neutral, positive_pct, ... },
  forecast: { history, forecast, confidence_interval },
  addResults: (newResults) => void,
  clearSession: () => void,
  exportCSV: () => void
}
```

---

## 👥 PERSONAS & USE CASES

### Persona 1: Support Manager (Primary)
**Who:** Runs 5-person support team, ~100 tickets/week  
**Goal:** Spot patterns in customer complaints fast  
**Scenario:**
- Downloads this week's support tickets as CSV
- Uploads to dashboard
- Sees "60% positive, 30% negative, 10% neutral"
- Notices negative spike Tue-Wed (infrastructure issue that day)
- Reports to leadership with screenshot + exported CSV

**Needs:**
- ✅ Fast upload + instant results
- ✅ Beautiful charts for reports
- ✅ CSV export to share

---

### Persona 2: Founder / Solo PM (Secondary)
**Who:** Manually reading customer feedback, early-stage startup  
**Goal:** Understand product-market fit signals  
**Scenario:**
- Copies raw feedback from Slack into text box
- Gets instant sentiment classification
- Dashboard shows 80% positive = signal that core product works
- Decides to invest more in onboarding (addresses 20% negative)

**Needs:**
- ✅ Zero-friction input (copy-paste, not file upload)
- ✅ Instant feedback
- ✅ Beautiful visuals to show investors

---

### Persona 3: Data Analyst (Tertiary)
**Who:** Non-technical analyst at mid-market company  
**Goal:** Export sentiment data for BI tool analysis  
**Scenario:**
- Uploads customer feedback CSV
- System classifies sentiment
- Exports results with labels
- Imports into Tableau/Power BI for trend analysis

**Needs:**
- ✅ CSV upload/download
- ✅ Clean data format (no fluff)
- ✅ Reliable classification

---

## 📊 CODING STANDARDS & STRUCTURE

### Repo Structure
```
sentiment-analysis-dashboard/
├── backend/
│   ├── main.py                 # FastAPI app
│   ├── models.py               # Pydantic models
│   ├── services/
│   │   ├── sentiment.py        # Classification logic
│   │   ├── data_processor.py   # CSV/text parsing + sanitization
│   │   └── forecast.py         # Trend projection (linear regression)
│   ├── routes/
│   │   ├── classify.py         # POST /api/classify
│   │   ├── export.py           # POST /api/export
│   │   └── ws.py               # WebSocket /ws/sentiment
│   ├── requirements.txt
│   ├── .env.example
│   ├── Dockerfile
│   └── run.py                  # Entry point for Railway
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── UploadSection.jsx      # CSV + text input
│   │   │   ├── Dashboard.jsx          # Stats + charts
│   │   │   ├── SentimentChart.jsx     # Line chart with forecast
│   │   │   ├── ResultsTable.jsx       # Results list
│   │   │   └── ExportButton.jsx       # CSV download
│   │   ├── hooks/
│   │   │   ├── useWebSocket.js        # WS connection
│   │   │   └── useSentiment.js        # Context hook
│   │   ├── context/
│   │   │   └── SentimentContext.jsx   # Global state
│   │   ├── App.jsx
│   │   └── index.css                  # Tailwind
│   ├── package.json
│   └── .env.example
│
├── README.md
├── ARCHITECTURE.md
├── docker-compose.yml
└── .gitignore
```

### Python Code Standards

**Type Hints Everywhere**
```python
from typing import List, Dict, Tuple
import logging

def classify_batch(texts: List[str]) -> List[SentimentResult]:
    """
    Classify multiple texts for sentiment.
    
    Args:
        texts: List of feedback strings
        
    Returns:
        List of SentimentResult objects with label + confidence
        
    Raises:
        ValueError: If text is empty or exceeds length limit
    """
    if not texts:
        raise ValueError("texts cannot be empty")
    
    results = []
    for text in texts:
        sanitized = sanitize_text(text)
        result = classify_text(sanitized)
        results.append(result)
    
    logging.info(f"Classified {len(results)} items")
    return results
```

**Error Handling (Not Just Happy Path)**
```python
try:
    result = classify_text(text)
except Exception as e:
    logger.error(f"Classification failed for '{text[:50]}': {e}")
    return SentimentResult(text=text, label="UNKNOWN", score=0.0)
```

**Logging (Not Print)**
```python
logger.info(f"Processing {len(texts)} feedback items")
logger.warning(f"Text '{text}' exceeds max length, truncating")
logger.error(f"Model loading failed: {e}")
```

### JavaScript/React Standards

**Component Props with JSDoc**
```javascript
/**
 * Displays sentiment classification results in an interactive table
 * @param {Array} results - Array of {text, label, score}
 * @param {string} sortBy - "sentiment" | "score" | "order"
 * @param {Function} onExport - Callback to export CSV
 * @returns {JSX.Element}
 */
export function ResultsTable({ results, sortBy = "order", onExport }) {
  // Component logic
}
```

**Naming Conventions**
- Components: `PascalCase.jsx` (e.g., `UploadSection.jsx`)
- Hooks: `camelCase.js` (e.g., `useWebSocket.js`)
- CSS classes: `kebab-case` (e.g., `.sentiment-card`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_ITEMS = 100`)

---

## 📈 FORECASTING LOGIC

### Quarterly Forecast Specification

**Input:** Historical sentiment data (list of % positive over time)  
**Output:** 12-week projection with confidence interval

**Algorithm:**
1. Calculate rolling average (window=5) of % positive sentiment
2. Fit LinearRegression model to historical data
3. Project 12 weeks forward using fitted model
4. Calculate 95% confidence interval using residual std
5. Return: history line + forecast line + confidence band

**Python Implementation:**
```python
from sklearn.linear_model import LinearRegression
import numpy as np

def forecast_sentiment(history: List[float], weeks: int = 12) -> Dict:
    """
    Forecast sentiment trend using linear regression.
    
    Args:
        history: List of % positive sentiment (0-100)
        weeks: Weeks to forecast (default 12)
        
    Returns:
        {
            "history": [[idx, pct], ...],
            "forecast": [[idx, pct], ...],
            "confidence_interval": [[idx, lower, upper], ...]
        }
    """
    # Fit model
    X = np.arange(len(history)).reshape(-1, 1)
    y = np.array(history)
    model = LinearRegression()
    model.fit(X, y)
    
    # Forecast
    future_X = np.arange(len(history), len(history) + weeks).reshape(-1, 1)
    forecast = model.predict(future_X)
    
    # Confidence interval (±1.96 * std of residuals for 95% CI)
    residuals = y - model.predict(X)
    std_residuals = np.std(residuals)
    ci = 1.96 * std_residuals
    
    return {
        "history": [[i, h] for i, h in enumerate(history)],
        "forecast": [[len(history) + i, f.item()] for i, f in enumerate(forecast)],
        "confidence_interval": [
            [len(history) + i, (f - ci).item(), (f + ci).item()]
            for i, f in enumerate(forecast)
        ]
    }
```

**Frontend Chart:** Use Recharts to plot:
- Solid line for history
- Dashed line for forecast
- Shaded band for confidence interval

---

## 🎯 SUCCESS CRITERIA

### MVP Definition of "Done"

**Code:**
- [ ] GitHub repo with clean structure
- [ ] Backend: All endpoints tested locally
- [ ] Frontend: All components rendering correctly
- [ ] Both input methods working (CSV + copy/paste)
- [ ] Sentiment classification accurate (distilbert)
- [ ] Forecast calculating correctly
- [ ] WebSocket real-time updates working

**Deployment:**
- [ ] Backend deployed on Railway, live URL works
- [ ] Frontend deployed on Vercel, live URL works
- [ ] Both services communicating end-to-end
- [ ] Can handle 100-1000 classifications per session

**Documentation:**
- [ ] README with: what it does, why, tech stack, how to run locally
- [ ] ARCHITECTURE.md with diagrams and rationale
- [ ] Code comments on complex functions
- [ ] .env.example with required vars

**Portfolio:**
- [ ] 2-min Loom video showing: upload CSV → classify → view dashboard → forecast
- [ ] Screenshot in README of dashboard (sentiment chart + forecast)
- [ ] GitHub URL in LinkedIn + resume

---

## 📚 README Outline

```markdown
# Sentiment Analysis Dashboard

## What It Does
One-sentence: Classifies customer feedback sentiment in real-time with quarterly trend forecasting.

## Why I Built It
Portfolio project showing: NLP classification, real-time data flow, forecasting, full-stack React + Python.

## Tech Stack
- Backend: Python, FastAPI, Hugging Face transformers, scikit-learn
- Frontend: React, TypeScript, Recharts, Tailwind
- Deployment: Railway (backend), Vercel (frontend)

## Features
- CSV upload or copy/paste feedback
- Real-time sentiment classification (positive/negative/neutral)
- Live dashboard with aggregate stats
- Line chart showing sentiment trends
- Quarterly forecast with confidence interval
- Export results as CSV

## Live Demo
[Vercel URL here]

## How to Run Locally
[Instructions]

## Deployment (Render + Vercel)

### Backend (Render Free Tier — $0)
1. Push code to GitHub
2. Go to Render.com, sign in with GitHub
3. Click "Create Service" → Select "Web Service"
4. Connect your GitHub repo
5. Set:
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port 8000`
   - **Environment variables:** Add `HUGGINGFACE_HUB_CACHE` (optional, for model caching)
6. Deploy. URL will be like `https://sentiment-dashboard-xxxxx.onrender.com`

**Cost:** Free tier (services spin down after 15 min idle)  
**Trade-off:** First request takes ~30s to wake up (fine for portfolio)

### Frontend (Vercel — Free)
1. Push `/frontend` to GitHub
2. Go to Vercel.com, sign in with GitHub
3. Import project, select `frontend` root directory
4. Set environment variable: `VITE_API_URL=https://sentiment-dashboard-xxxxx.onrender.com`
5. Deploy. URL will be like `https://sentiment-dashboard-frontend.vercel.app`

**Total cost:** $0

## Key Decisions
- Used distilbert (local inference) vs OpenAI API for cost-effectiveness
- Linear regression for forecasting (simple, interpretable)
- WebSocket for real-time dashboard updates
- Session-based storage (no DB) for MVP simplicity

## Future Improvements
- Database persistence
- Multi-user support with auth
- Custom model fine-tuning
- Slack integration
```

---

## 🚀 BUILD TIMELINE (Locked)

| Date | Task | Deliverable |
|------|------|-------------|
| Apr 24 (Thu) | Backend data pipeline (classify + forecast) | `sentiment.py`, `forecast.py` working locally |
| Apr 25 (Fri) | API endpoints + sanitization + WebSocket | `POST /api/classify`, `/ws/sentiment` working |
| Apr 28 (Mon) | Frontend components (upload, chart, table) | React components rendering, connected to backend |
| Apr 29 (Tue) | Polish + deploy to Railway + Vercel | Both services live, end-to-end working |
| Apr 30 (Wed) | Loom video + README + final polish | YouTube link + docs ready |

---

## ✅ APPROVAL & SIGN-OFF

**Requirements Locked:** April 2, 2026  
**Owner:** Tyler Pedora  
**Status:** Ready to Build

**Sign-off Questions:**
- [ ] Two input methods clear? (CSV + copy/paste sanitized)
- [ ] Session-based (no DB) acceptable? 
- [ ] Quarterly forecast with linear regression OK?
- [ ] All personas make sense?
- [ ] Tech stack choices solid?

**If yes to all:** Ship it. 🚀

---