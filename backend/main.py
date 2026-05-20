from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncio
import json

from config import settings
from database import engine, Base
from database.models import (
    Post, MarketTick, NLPResult, AggregatedSignal,
    Alert, ReplayEvent, ScenarioRun, Watchlist
)

from api import market, replay, alerts, scenario


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create all tables on startup
    Base.metadata.create_all(bind=engine)
    print("Database tables created")
    yield
    print("Shutting down...")


app = FastAPI(
    title="GameStop Social Trading Intelligence API",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
