from sqlalchemy.orm import Session
from sqlalchemy import desc, func
from datetime import datetime, timedelta
from typing import Optional, List
from database.models import (
    Post, MarketTick, NLPResult, AggregatedSignal,
    Alert, ReplayEvent, ScenarioRun, Watchlist
)


def get_latest_market_tick(db: Session, ticker: str) -> Optional[MarketTick]:
    return db.query(MarketTick).filter(
        MarketTick.ticker == ticker
    ).order_by(desc(MarketTick.timestamp)).first()


def get_market_timeseries(db: Session, ticker: str, days: int = 30) -> List[MarketTick]:
    since = datetime.utcnow() - timedelta(days=days)
    return db.query(MarketTick).filter(
        MarketTick.ticker == ticker,
        MarketTick.timestamp >= since
    ).order_by(MarketTick.timestamp).all()


def get_latest_signal(db: Session, ticker: str) -> Optional[AggregatedSignal]:
    return db.query(AggregatedSignal).filter(
        AggregatedSignal.ticker == ticker
    ).order_by(desc(AggregatedSignal.window_end)).first()


def get_signals_timeseries(db: Session, ticker: str, days: int = 30) -> List[AggregatedSignal]:
    since = datetime.utcnow() - timedelta(days=days)
    return db.query(AggregatedSignal).filter(
        AggregatedSignal.ticker == ticker,
        AggregatedSignal.window_start >= since
    ).order_by(AggregatedSignal.window_start).all()


def get_recent_posts(db: Session, ticker: str, limit: int = 20) -> List[Post]:
    return db.query(Post).filter(
        Post.ticker == ticker
    ).order_by(desc(Post.post_time)).limit(limit).all()


def get_posts_by_date(db: Session, ticker: str, date: datetime) -> List[Post]:
    start = date.replace(hour=0, minute=0, second=0)
    end = start + timedelta(days=1)
    return db.query(Post).filter(
        Post.ticker == ticker,
        Post.post_time >= start,
        Post.post_time < end
    ).order_by(Post.post_time).all()


def get_replay_events(db: Session, ticker: str) -> List[ReplayEvent]:
    return db.query(ReplayEvent).filter(
        ReplayEvent.ticker == ticker
    ).order_by(ReplayEvent.event_time).all()


def get_latest_alert(db: Session, ticker: str) -> Optional[Alert]:
    return db.query(Alert).filter(
        Alert.ticker == ticker,
        Alert.status == "active"
    ).order_by(desc(Alert.alert_time)).first()


def get_alerts_for_watchlist(db: Session, user_id: str) -> List[Alert]:
    watchlists = db.query(Watchlist).filter(Watchlist.user_id == user_id).all()
    tickers = [w.ticker for w in watchlists]
    if not tickers:
        return []
    return db.query(Alert).filter(
        Alert.ticker.in_(tickers)
    ).order_by(desc(Alert.alert_time)).limit(50).all()


def get_alert_history(db: Session, ticker: str) -> List[Alert]:
    return db.query(Alert).filter(
        Alert.ticker == ticker
    ).order_by(desc(Alert.alert_time)).limit(100).all()


def create_watchlist(db: Session, user_id: str, ticker: str, threshold_config: dict) -> Watchlist:
    wl = Watchlist(user_id=user_id, ticker=ticker.upper(), threshold_config_json=threshold_config)
    db.add(wl)
    db.commit()
    db.refresh(wl)
    return wl


def delete_watchlist(db: Session, watchlist_id: str) -> bool:
    wl = db.query(Watchlist).filter(Watchlist.watchlist_id == watchlist_id).first()
    if wl:
        db.delete(wl)
        db.commit()
        return True
    return False


def get_watchlists(db: Session, user_id: str) -> List[Watchlist]:
    return db.query(Watchlist).filter(Watchlist.user_id == user_id).all()


def save_scenario_run(db: Session, run: ScenarioRun) -> ScenarioRun:
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


def get_scenario_history(db: Session, user_id: str) -> List[ScenarioRun]:
    return db.query(ScenarioRun).filter(
        ScenarioRun.user_id == user_id
    ).order_by(desc(ScenarioRun.created_at)).limit(20).all()
