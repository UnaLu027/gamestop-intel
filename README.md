# GameStop Social Trading Intelligence Platform

A full-stack platform that monitors social media signals, detects squeeze/reversal risk, and replays the GameStop January 2021 event. Built as an educational case study in social-driven market microstructure.

## Architecture

```
gamestop-platform/
├── docker-compose.yml          # Orchestrates all services
├── .env.example                # Copy to .env and fill in API keys
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── config.py               # Pydantic settings
│   ├── main.py                 # FastAPI app + WebSocket
│   ├── worker.py               # Celery task queue
│   ├── database/
│   │   ├── __init__.py         # SQLAlchemy engine + session
│   │   ├── models.py           # ORM models
│   │   ├── schemas.py          # Pydantic response schemas
│   │   └── crud.py             # DB query helpers
│   ├── api/
│   │   ├── market.py           # Market summary, timeseries, posts
│   │   ├── replay.py           # Historical replay data
│   │   ├── alerts.py           # Alert feed + watchlist
│   │   └── scenario.py         # Scenario simulation
│   ├── ml/
│   │   ├── nlp_pipeline.py     # FinBERT + keyword heuristics
│   │   ├── feature_engineering.py  # Daily signal aggregation
│   │   └── risk_engine.py      # Rule-based risk scoring
│   └── ingestion/
│       ├── reddit_ingester.py  # PRAW Reddit data
│       ├── market_ingester.py  # yfinance price data
│       └── news_ingester.py    # NewsAPI articles
├── frontend/
│   ├── Dockerfile
│   ├── src/
│   │   ├── App.tsx             # Sidebar layout + routing
│   │   ├── api/client.ts       # Typed API client (Axios)
│   │   ├── pages/
│   │   │   ├── MarketPulse.tsx     # Dashboard with charts
│   │   │   ├── EventReplay.tsx     # Animated timeline replay
│   │   │   ├── AlertCenter.tsx     # Alert management
│   │   │   └── ScenarioLab.tsx     # Scenario simulation
│   │   └── components/
│   │       ├── RiskMeter.tsx       # ECharts gauge
│   │       ├── PostCard.tsx        # Social post display
│   │       └── TimelineChart.tsx   # Dual-axis chart
└── scripts/
    └── seed_gamestop_data.py   # Seed realistic GME 2021 data
```

## Quick Start

### 1. Prerequisites

- Docker + Docker Compose
- (Optional) Reddit API credentials for live ingestion
- (Optional) NewsAPI key

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your API keys (optional — seed data works without them)
```

### 3. Start all services

```bash
docker-compose up --build
```

This starts:
- **PostgreSQL** on port 5432
- **Redis** on port 6379
- **Backend API** on port 8000 (FastAPI)
- **Celery Worker** (background tasks)
- **Frontend** on port 3000 (React + Vite)

### 4. Seed the GameStop 2021 data

```bash
docker-compose exec backend python scripts/seed_gamestop_data.py
```

This populates:
- 60+ days of GME price data (Jan–Mar 2021)
- 20+ curated WSB-style posts from key dates
- 15 key replay events (Ryan Cohen board, Elon tweet, Robinhood halt, etc.)
- Aggregated social signals for each trading day
- 6 pre-generated alerts for peak risk dates
- A demo watchlist for user `demo_user`

### 5. Open the frontend

Navigate to **http://localhost:3000**

## Pages

### Market Pulse
- Ticker search (default: GME)
- Price, social volume, bullish ratio, hype score cards
- Dual-axis chart: price + social posts overlay
- Risk gauge (ECharts gauge chart)
- Risk driver breakdown
- Recent social posts feed

### Event Replay
- Full Jan–Mar 2021 timeline with playback controls
- Play/pause/step animation
- Event log reveals as you advance the date
- Posts shown per selected day
- Price + social + risk triple-series chart with event mark lines

### Alert Center
- Watchlist management (add/remove tickers)
- Alert feed with risk level badges
- Filter by risk level
- Expandable alert explanations
- Summary count cards

### Scenario Lab
- 7 adjustable parameters (mention growth, bullish ratio, hype score, short interest, influencer posts, trading restrictions, options activity)
- Presets: Baseline and GME Jan 27 2021 peak
- Risk score output with gauge
- Risk driver breakdown
- Radar chart showing risk profile
- Scenario history with expandable params

## API Endpoints

```
GET  /health
GET  /api/market/{ticker}/summary
GET  /api/market/{ticker}/timeseries?days=30
GET  /api/market/{ticker}/drivers
GET  /api/market/{ticker}/posts?limit=20
GET  /api/replay/{ticker}
GET  /api/replay/{ticker}/events
GET  /api/replay/{ticker}/posts?date=2021-01-27
GET  /api/alerts?user_id=demo_user
POST /api/alerts/watchlist
DEL  /api/alerts/watchlist/{id}
GET  /api/alerts/history?ticker=GME
POST /api/scenario/run
GET  /api/scenario/history?user_id=demo_user
WS   /ws/{ticker}
```

Full Swagger docs at **http://localhost:8000/docs**

## ML Pipeline

### NLP (FinBERT + Keywords)
- Attempts to load `ProsusAI/finbert` from HuggingFace
- Falls back to keyword heuristics if model unavailable
- Outputs: `stance` (bullish/bearish/neutral), `hype_score`, `post_type`, `action_cue`

### Risk Engine (Rule-Based)
Scoring rules (0–10 scale):
- Social mentions > 3x baseline: +2 pts
- Hype score > 0.75: +2 pts
- Bullish ratio > 70%: +1 pt
- Volume anomaly > 2σ: +2 pts
- Volatility > 2σ: +2 pts
- Coordination ratio > 15%: +1 pt
- Influencer posts > 5: +1 pt
- Trading restrictions: +1 pt (bonus)
- High options activity: +1 pt (bonus)
- Short interest > 50%: +1 pt (bonus)

Risk labels: Normal (0-3) | HeatingUp (3-5) | SqueezeRisk (5-7) | ReversalRisk (7+)

## Live Data Ingestion (Optional)

To enable live Reddit/news ingestion, add API keys to `.env` and trigger Celery tasks:

```bash
# Manually trigger tasks
docker-compose exec worker celery -A worker call ingest_reddit_posts --args='["GME"]'
docker-compose exec worker celery -A worker call compute_signals --args='["GME"]'
```

Or set up scheduled tasks with APScheduler in the backend.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend API | FastAPI + SQLAlchemy + Alembic |
| Database | PostgreSQL 15 |
| Cache/Queue | Redis 7 + Celery |
| NLP | HuggingFace Transformers (FinBERT) |
| Risk ML | Rule-based engine (XGBoost-ready) |
| Data Sources | PRAW (Reddit), yfinance, NewsAPI |
| Frontend | React 18 + TypeScript + Vite |
| Charts | ECharts 5 + echarts-for-react |
| Styling | Tailwind CSS 3 |
| State | TanStack Query + Zustand |
| Deploy | Docker Compose |

## Educational Note

This platform is built for educational purposes based on the public GameStop short squeeze case study. The data and analysis are reconstructed from public sources for demonstration. This is not financial advice.
