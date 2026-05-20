from celery import Celery
from config import settings

celery_app = Celery(
    "gamestop_worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)

# Alias for celery CLI discovery
worker = celery_app


@celery_app.task(name="ingest_reddit_posts")
def ingest_reddit_posts(ticker: str = "GME"):
    from database import SessionLocal
    from ingestion.reddit_ingester import RedditIngester
    db = SessionLocal()
    try:
        ingester = RedditIngester()
        count = ingester.fetch_posts(ticker, db=db)
        return f"Imported {count} Reddit posts for {ticker}"
    finally:
        db.close()


@celery_app.task(name="ingest_market_data")
def ingest_market_data(ticker: str = "GME"):
    from database import SessionLocal
    from ingestion.market_ingester import MarketIngester
    db = SessionLocal()
    try:
        ingester = MarketIngester()
        count = ingester.fetch_realtime(ticker, db=db)
        return f"Imported {count} market ticks for {ticker}"
    finally:
        db.close()


@celery_app.task(name="run_nlp_pipeline")
def run_nlp_pipeline_task():
    from database import SessionLocal
    from ml.nlp_pipeline import get_nlp_pipeline
    db = SessionLocal()
    try:
        pipeline = get_nlp_pipeline()
        count = pipeline.process_pending_posts(db)
        return f"Processed {count} posts"
    finally:
        db.close()


@celery_app.task(name="compute_signals")
def compute_signals_task(ticker: str = "GME"):
    from database import SessionLocal
    from ml.feature_engineering import compute_daily_signals, upsert_aggregated_signal
    from datetime import datetime, timedelta
    db = SessionLocal()
    try:
        today = datetime.utcnow()
        for i in range(7):
            date = today - timedelta(days=i)
            features = compute_daily_signals(db, ticker, date)
            upsert_aggregated_signal(db, ticker, date, features)
        return f"Computed signals for {ticker}"
    finally:
        db.close()
