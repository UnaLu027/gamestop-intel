import uuid
from datetime import datetime
from sqlalchemy import (
    Column, String, Text, Integer, BigInteger, Float, Numeric,
    DateTime, ForeignKey, JSON, func
)
from sqlalchemy.orm import relationship
from database import Base


def uuid4():
    return str(uuid.uuid4())


class Post(Base):
    __tablename__ = "posts"

    post_id = Column(String(36), primary_key=True, default=uuid4)
    platform = Column(String(50), nullable=False)
    ticker = Column(String(20), index=True, nullable=False)
    author_id = Column(String(100))
    author_type = Column(String(50), default="retail")
    post_time = Column(DateTime, index=True, nullable=False)
    content = Column(Text, nullable=False)
    likes = Column(Integer, default=0)
    replies = Column(Integer, default=0)
    reposts = Column(Integer, default=0)
    url = Column(Text)
    language = Column(String(10), default="en")

    nlp_result = relationship("NLPResult", back_populates="post", uselist=False)
    replay_events = relationship("ReplayEvent", back_populates="related_post")


class MarketTick(Base):
    __tablename__ = "market_ticks"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(20), index=True, nullable=False)
    timestamp = Column(DateTime(timezone=True), index=True, nullable=False)
    open_price = Column(Numeric(12, 4))
    high_price = Column(Numeric(12, 4))
    low_price = Column(Numeric(12, 4))
    close_price = Column(Numeric(12, 4))
    volume = Column(BigInteger)
    volatility = Column(Float)
    short_interest = Column(Float, nullable=True)
    option_activity_score = Column(Float, nullable=True)


class NLPResult(Base):
    __tablename__ = "nlp_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    post_id = Column(String(36), ForeignKey("posts.post_id"), index=True)
    stance = Column(String(20))
    hype_score = Column(Float)
    post_type = Column(String(50))
    action_cue = Column(String(50))
    confidence = Column(Float)
    model_version = Column(String(50), default="finbert-v1")
    created_at = Column(DateTime, server_default=func.now())

    post = relationship("Post", back_populates="nlp_result")


class AggregatedSignal(Base):
    __tablename__ = "aggregated_signals"

    id = Column(Integer, primary_key=True, autoincrement=True)
    ticker = Column(String(20), index=True, nullable=False)
    window_start = Column(DateTime)
    window_end = Column(DateTime)
    post_count = Column(Integer, default=0)
    unique_authors = Column(Integer, default=0)
    bullish_ratio = Column(Float, default=0.0)
    bearish_ratio = Column(Float, default=0.0)
    avg_hype_score = Column(Float, default=0.0)
    coordination_ratio = Column(Float, default=0.0)
    influencer_post_count = Column(Integer, default=0)
    mention_growth_rate = Column(Float, default=0.0)
    price_return = Column(Float, default=0.0)
    abnormal_volume_score = Column(Float, default=0.0)
    volatility_score = Column(Float, default=0.0)
    risk_score_pre_ml = Column(Float, default=0.0)


class Alert(Base):
    __tablename__ = "alerts"

    alert_id = Column(String(36), primary_key=True, default=uuid4)
    ticker = Column(String(20), index=True, nullable=False)
    alert_time = Column(DateTime, server_default=func.now())
    risk_level = Column(String(30))
    rule_score = Column(Float)
    ml_score = Column(Float)
    final_score = Column(Float)
    trigger_summary = Column(Text)
    explanation = Column(Text)
    status = Column(String(20), default="active")


class ReplayEvent(Base):
    __tablename__ = "replay_events"

    event_id = Column(String(36), primary_key=True, default=uuid4)
    ticker = Column(String(20), index=True, nullable=False)
    event_time = Column(DateTime)
    event_type = Column(String(50))
    title = Column(String(300))
    description = Column(Text)
    source_type = Column(String(50))
    related_post_id = Column(String(36), ForeignKey("posts.post_id"), nullable=True)

    related_post = relationship("Post", back_populates="replay_events")


class ScenarioRun(Base):
    __tablename__ = "scenario_runs"

    run_id = Column(String(36), primary_key=True, default=uuid4)
    user_id = Column(String(100))
    ticker = Column(String(20))
    input_params_json = Column(JSON)
    output_score = Column(Float)
    output_label = Column(String(50))
    output_explanation = Column(Text)
    created_at = Column(DateTime, server_default=func.now())


class Watchlist(Base):
    __tablename__ = "watchlists"

    watchlist_id = Column(String(36), primary_key=True, default=uuid4)
    user_id = Column(String(100))
    ticker = Column(String(20))
    threshold_config_json = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
