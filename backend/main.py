from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import json
import sys
from pathlib import Path

from config import settings
from database import engine, Base, SessionLocal
from database.models import (
    Post, MarketTick, NLPResult, AggregatedSignal,
    Alert, ReplayEvent, ScenarioRun, Watchlist
)

from api import market, replay, alerts, scenario


def _allowed_origins() -> list[str]:
    return [origin.strip() for origin in settings.CORS_ORIGINS.split(",") if origin.strip()]


def seed_demo_data_if_empty():
    if not settings.AUTO_SEED_DEMO_DATA:
        return

    db = SessionLocal()
    try:
        has_data = db.query(MarketTick).filter(MarketTick.ticker == "GME").first() is not None
    finally:
        db.close()

    if has_data:
        return

    project_root = Path(__file__).resolve().parent.parent
    if str(project_root) not in sys.path:
        sys.path.insert(0, str(project_root))

    from scripts.seed_gamestop_data import main as seed_main

    print("No demo data found. Seeding GameStop dataset...")
    seed_main()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    Base.metadata.create_all(bind=engine)
    print("Database tables created")
    seed_demo_data_if_empty()
    yield
    print("Shutting down...")


app = FastAPI(
    title="GameStop Social Trading Intelligence API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins() or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(market.router, prefix="/api/market", tags=["market"])
app.include_router(replay.router, prefix="/api/replay", tags=["replay"])
app.include_router(alerts.router, prefix="/api/alerts", tags=["alerts"])
app.include_router(scenario.router, prefix="/api/scenario", tags=["scenario"])


@app.get("/health")
async def health():
    return {"status": "ok", "service": "GameStop Intel API"}


# WebSocket for real-time ticker updates
class ConnectionManager:
    def __init__(self):
        self.active: dict[str, list[WebSocket]] = {}

    async def connect(self, ticker: str, ws: WebSocket):
        await ws.accept()
        self.active.setdefault(ticker, []).append(ws)

    def disconnect(self, ticker: str, ws: WebSocket):
        if ticker in self.active:
            self.active[ticker].remove(ws)

    async def broadcast(self, ticker: str, data: dict):
        for ws in self.active.get(ticker, []):
            try:
                await ws.send_json(data)
            except Exception:
                pass


manager = ConnectionManager()


@app.websocket("/ws/{ticker}")
async def websocket_endpoint(ws: WebSocket, ticker: str):
    await manager.connect(ticker.upper(), ws)
    try:
        while True:
            await asyncio.sleep(30)
            await ws.send_json({"type": "ping", "ticker": ticker.upper()})
    except WebSocketDisconnect:
        manager.disconnect(ticker.upper(), ws)
