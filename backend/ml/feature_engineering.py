from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func
from database.models import Post, NLPResult, MarketTick, AggregatedSignal


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def _std(values: list[float]) -> float:
    if not values:
        return 0.0
    avg = _mean(values)
    variance = sum((value - avg) ** 2 for value in values) / len(values)
    return variance ** 0.5


def _clip(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def compute_daily_signals(db: Session, ticker: str, date: datetime) -> dict:
    """Compute aggregated signals for a given ticker on a given date."""
    start = date.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)

    # Get posts for this day with NLP results
    posts = db.query(Post, NLPResult).outerjoin(
        NLPResult, NLPResult.post_id == Post.post_id
    ).filter(
        Post.ticker == ticker,
        Post.post_time >= start,
        Post.post_time < end
    ).all()

    post_count = len(posts)
    unique_authors = len(set(p.Post.author_id for p in posts if p.Post.author_id))

    if post_count == 0:
        stance_counts = {"bullish": 0, "bearish": 0, "neutral": 0}
        avg_hype = 0.0
        coordination_ratio = 0.0
        influencer_posts = 0
    else:
        nlp_results = [p.NLPResult for p in posts if p.NLPResult]
        stance_counts = {"bullish": 0, "bearish": 0, "neutral": 0}
        for nlp in nlp_results:
            key = nlp.stance if nlp.stance in stance_counts else "neutral"
            stance_counts[key] += 1

        avg_hype = _mean([n.hype_score for n in nlp_results]) if nlp_results else 0.0
        coord_posts = sum(1 for n in nlp_results if n.post_type == "coordination")
        coordination_ratio = coord_posts / max(post_count, 1)
        influencer_posts = sum(1 for p in posts if p.Post.author_type == "influencer")

    bullish_ratio = stance_counts["bullish"] / max(post_count, 1)
    bearish_ratio = stance_counts["bearish"] / max(post_count, 1)

    # Get market data for this day
    tick = db.query(MarketTick).filter(
        MarketTick.ticker == ticker,
        MarketTick.timestamp >= start,
        MarketTick.timestamp < end
    ).first()

    # Compute mention growth (vs previous day)
    prev_start = start - timedelta(days=1)
    prev_count = db.query(func.count(Post.post_id)).filter(
        Post.ticker == ticker,
        Post.post_time >= prev_start,
        Post.post_time < start
    ).scalar() or 0
    mention_growth_rate = float((post_count - prev_count) / max(prev_count, 1))

    # Price return
    prev_tick = db.query(MarketTick).filter(
        MarketTick.ticker == ticker,
        MarketTick.timestamp >= prev_start,
        MarketTick.timestamp < start
    ).first()
    if tick and tick.close_price and prev_tick and prev_tick.close_price:
        price_return = float((tick.close_price - prev_tick.close_price) / prev_tick.close_price)
    else:
        price_return = 0.0

    # Volume and volatility z-scores (compute rolling 30-day baseline)
    thirty_ago = start - timedelta(days=30)
    recent_ticks = db.query(MarketTick).filter(
        MarketTick.ticker == ticker,
        MarketTick.timestamp >= thirty_ago,
        MarketTick.timestamp < start
    ).all()
    volumes = [t.volume for t in recent_ticks if t.volume]
    vols = [t.volatility for t in recent_ticks if t.volatility]

    current_vol = tick.volume if tick else 0
    current_vola = tick.volatility if tick else 0.0

    if volumes and len(volumes) > 2:
        vol_mean = _mean(volumes)
        vol_std = _std(volumes)
        abnormal_vol = float((current_vol - vol_mean) / max(vol_std, 1))
    else:
        abnormal_vol = 0.0

    if vols and len(vols) > 2:
        vola_mean = _mean(vols)
        vola_std = _std(vols)
        vola_score = float((current_vola - vola_mean) / max(vola_std, 0.001))
    else:
        vola_score = 0.0

    return {
        "post_count": post_count,
        "unique_authors": unique_authors,
        "bullish_ratio": float(bullish_ratio),
        "bearish_ratio": float(bearish_ratio),
        "avg_hype_score": float(avg_hype),
        "coordination_ratio": float(coordination_ratio),
        "influencer_post_count": influencer_posts,
        "mention_growth_rate": float(mention_growth_rate),
        "price_return": price_return,
        "abnormal_volume_score": float(_clip(abnormal_vol, -5, 10)),
        "volatility_score": float(_clip(vola_score, -5, 10)),
    }


def upsert_aggregated_signal(db: Session, ticker: str, date: datetime, features: dict) -> AggregatedSignal:
    start = date.replace(hour=0, minute=0, second=0, microsecond=0)
    end = start + timedelta(days=1)

    existing = db.query(AggregatedSignal).filter(
        AggregatedSignal.ticker == ticker,
        AggregatedSignal.window_start == start
    ).first()

    from ml.risk_engine import RiskEngine
    engine = RiskEngine()
    risk = engine.compute_rule_score(features)

    if existing:
        for k, v in features.items():
            setattr(existing, k, v)
        existing.risk_score_pre_ml = risk["final_score"]
        db.commit()
        return existing
    else:
        sig = AggregatedSignal(
            ticker=ticker,
            window_start=start,
            window_end=end,
            risk_score_pre_ml=risk["final_score"],
            **features
        )
        db.add(sig)
        db.commit()
        db.refresh(sig)
        return sig
