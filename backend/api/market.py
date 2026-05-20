from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from database import crud
from database.schemas import MarketSummary, MarketTickResponse, AggregatedSignalResponse

router = APIRouter()


@router.get("/{ticker}/summary", response_model=MarketSummary)
def get_market_summary(ticker: str, db: Session = Depends(get_db)):
    ticker = ticker.upper()
    tick = crud.get_latest_market_tick(db, ticker)
    signal = crud.get_latest_signal(db, ticker)
    alert = crud.get_latest_alert(db, ticker)

    return MarketSummary(
        ticker=ticker,
        current_price=float(tick.close_price) if tick and tick.close_price else None,
        price_change_pct=float(signal.price_return) * 100 if signal else None,
        volume=tick.volume if tick else None,
        social_volume=signal.post_count if signal else 0,
        risk_score=float(signal.risk_score_pre_ml) if signal else 0.0,
        risk_level=alert.risk_level if alert else "Normal",
        bullish_ratio=float(signal.bullish_ratio) if signal else 0.0,
        bearish_ratio=float(signal.bearish_ratio) if signal else 0.0,
        avg_hype_score=float(signal.avg_hype_score) if signal else 0.0,
        mention_growth_rate=float(signal.mention_growth_rate) if signal else 0.0,
    )


@router.get("/{ticker}/timeseries")
def get_timeseries(ticker: str, days: int = 30, db: Session = Depends(get_db)):
    ticker = ticker.upper()
    ticks = crud.get_market_timeseries(db, ticker, days)
    signals = crud.get_signals_timeseries(db, ticker, days)

    signal_map = {s.window_start.date(): s for s in signals}

    result = []
    for t in ticks:
        d = t.timestamp.date()
        sig = signal_map.get(d)
        result.append({
            "date": t.timestamp.isoformat(),
            "open": float(t.open_price) if t.open_price else None,
            "high": float(t.high_price) if t.high_price else None,
            "low": float(t.low_price) if t.low_price else None,
            "close": float(t.close_price) if t.close_price else None,
            "volume": t.volume,
            "post_count": sig.post_count if sig else 0,
            "bullish_ratio": sig.bullish_ratio if sig else 0.0,
            "avg_hype_score": sig.avg_hype_score if sig else 0.0,
            "risk_score": sig.risk_score_pre_ml if sig else 0.0,
            "mention_growth_rate": sig.mention_growth_rate if sig else 0.0,
        })
    return result


@router.get("/{ticker}/drivers")
def get_drivers(ticker: str, db: Session = Depends(get_db)):
    ticker = ticker.upper()
    signal = crud.get_latest_signal(db, ticker)
    if not signal:
        return {"drivers": [], "ticker": ticker}

    drivers = []
    if signal.mention_growth_rate > 1.0:
        drivers.append({"factor": "Social mention surge", "value": f"+{signal.mention_growth_rate:.1f}x", "impact": "high"})
    if signal.avg_hype_score > 0.6:
        drivers.append({"factor": "High average hype score", "value": f"{signal.avg_hype_score:.2f}", "impact": "high"})
    if signal.bullish_ratio > 0.65:
        drivers.append({"factor": "Bullish sentiment dominant", "value": f"{signal.bullish_ratio*100:.0f}%", "impact": "medium"})
    if signal.abnormal_volume_score > 1.5:
        drivers.append({"factor": "Abnormal trading volume", "value": f"{signal.abnormal_volume_score:.1f}σ", "impact": "high"})
    if signal.volatility_score > 1.5:
        drivers.append({"factor": "High price volatility", "value": f"{signal.volatility_score:.1f}σ", "impact": "medium"})
    if signal.coordination_ratio > 0.1:
        drivers.append({"factor": "Coordinated post ratio rising", "value": f"{signal.coordination_ratio*100:.0f}%", "impact": "medium"})
    if signal.influencer_post_count > 3:
        drivers.append({"factor": "Influencer activity spike", "value": f"{signal.influencer_post_count} posts", "impact": "high"})

    return {"drivers": drivers, "ticker": ticker, "risk_score": signal.risk_score_pre_ml}


@router.get("/{ticker}/posts")
def get_recent_posts(ticker: str, limit: int = 20, db: Session = Depends(get_db)):
    ticker = ticker.upper()
    posts = crud.get_recent_posts(db, ticker, limit)
    result = []
    for p in posts:
        nlp = p.nlp_result
        result.append({
            "post_id": p.post_id,
            "platform": p.platform,
            "author_id": p.author_id,
            "author_type": p.author_type,
            "content": p.content[:300],
            "post_time": p.post_time.isoformat(),
            "likes": p.likes,
            "stance": nlp.stance if nlp else "neutral",
            "hype_score": nlp.hype_score if nlp else 0.0,
            "post_type": nlp.post_type if nlp else "opinion",
        })
    return result
