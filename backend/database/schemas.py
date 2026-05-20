from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime


class PostResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    post_id: str
    platform: str
    ticker: str
    author_id: Optional[str]
    author_type: Optional[str]
    post_time: datetime
    content: str
    likes: int
    replies: int
    reposts: int
    url: Optional[str]


class MarketTickResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    ticker: str
    timestamp: datetime
    open_price: Optional[float]
    high_price: Optional[float]
    low_price: Optional[float]
    close_price: Optional[float]
    volume: Optional[int]
    volatility: Optional[float]
    short_interest: Optional[float]


class NLPResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    post_id: str
    stance: Optional[str]
    hype_score: Optional[float]
    post_type: Optional[str]
    action_cue: Optional[str]
    confidence: Optional[float]


class AggregatedSignalResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    ticker: str
    window_start: datetime
    window_end: datetime
    post_count: int
    bullish_ratio: float
    bearish_ratio: float
    avg_hype_score: float
    mention_growth_rate: float
    price_return: float
    abnormal_volume_score: float
    volatility_score: float
    risk_score_pre_ml: float


class AlertResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    alert_id: str
    ticker: str
    alert_time: datetime
    risk_level: str
    rule_score: float
    ml_score: float
    final_score: float
    trigger_summary: Optional[str]
    explanation: Optional[str]
    status: str


class ReplayEventResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    event_id: str
    ticker: str
    event_time: datetime
    event_type: str
    title: str
    description: Optional[str]
    source_type: Optional[str]


class ScenarioRunResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    run_id: str
    ticker: str
    input_params_json: Any
    output_score: float
    output_label: str
    output_explanation: Optional[str]
    created_at: datetime


class WatchlistResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    watchlist_id: str
    user_id: str
    ticker: str
    threshold_config_json: Any
    created_at: datetime


class MarketSummary(BaseModel):
    ticker: str
    current_price: Optional[float]
    price_change_pct: Optional[float]
    volume: Optional[int]
    social_volume: int
    risk_score: float
    risk_level: str
    bullish_ratio: float
    bearish_ratio: float
    avg_hype_score: float
    mention_growth_rate: float


class ScenarioRequest(BaseModel):
    ticker: str = "GME"
    user_id: str = "anonymous"
    mention_growth: float = 1.0
    bullish_ratio: float = 0.5
    hype_score: float = 0.3
    short_interest: float = 0.1
    influencer_posts: int = 0
    trading_restricted: bool = False
    options_activity_high: bool = False


class WatchlistCreate(BaseModel):
    user_id: str
    ticker: str
    threshold_config: dict = {}
