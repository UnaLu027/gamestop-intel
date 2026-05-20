from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from typing import Optional
from datetime import datetime
from database import get_db
from database import crud

router = APIRouter()


@router.get("/{ticker}")
def get_replay_data(ticker: str, db: Session = Depends(get_db)):
    ticker = ticker.upper()
    signals = crud.get_signals_timeseries(db, ticker, days=120)
    ticks = crud.get_market_timeseries(db, ticker, days=120)
    events = crud.get_replay_events(db, ticker)

    tick_map = {t.timestamp.date(): t for t in ticks}

    timeline = []
    for s in signals:
        d = s.window_start.date()
        t = tick_map.get(d)
        timeline.append({
            "date": s.window_start.isoformat(),
            "post_count": s.post_count,
            "bullish_ratio": s.bullish_ratio,
            "avg_hype_score": s.avg_hype_score,
            "mention_growth_rate": s.mention_growth_rate,
            "risk_score": s.risk_score_pre_ml,
            "close_price": float(t.close_price) if t and t.close_price else None,
            "volume": t.volume if t else None,
            "volatility": t.volatility if t else None,
        })

    return {
        "ticker": ticker,
        "timeline": timeline,
        "events": [
            {
                "event_id": e.event_id,
                "event_time": e.event_time.isoformat(),
                "event_type": e.event_type,
                "title": e.title,
                "description": e.description,
                "source_type": e.source_type,
            }
            for e in events
        ]
    }


@router.get("/{ticker}/events")
def get_events(ticker: str, db: Session = Depends(get_db)):
    ticker = ticker.upper()
    events = crud.get_replay_events(db, ticker)
    return [
        {
            "event_id": e.event_id,
            "event_time": e.event_time.isoformat(),
            "event_type": e.event_type,
            "title": e.title,
            "description": e.description,
            "source_type": e.source_type,
        }
        for e in events
    ]


@router.get("/{ticker}/posts")
def get_posts_by_date(
    ticker: str,
    date: str = Query(..., description="Date in YYYY-MM-DD format"),
    db: Session = Depends(get_db)
):
    ticker = ticker.upper()
    dt = datetime.strptime(date, "%Y-%m-%d")
    posts = crud.get_posts_by_date(db, ticker, dt)
    result = []
    for p in posts:
        nlp = p.nlp_result
        result.append({
            "post_id": p.post_id,
            "platform": p.platform,
            "author_id": p.author_id,
            "content": p.content[:400],
            "post_time": p.post_time.isoformat(),
            "likes": p.likes,
            "stance": nlp.stance if nlp else "neutral",
            "hype_score": nlp.hype_score if nlp else 0.0,
        })
    return result
