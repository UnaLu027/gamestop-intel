from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    DATABASE_URL: str = "postgresql://admin:password@postgres:5432/gamestop_db"
    REDIS_URL: str = "redis://redis:6379"
    REDDIT_CLIENT_ID: Optional[str] = None
    REDDIT_CLIENT_SECRET: Optional[str] = None
    REDDIT_USER_AGENT: str = "GameStopAnalyzer/1.0"
    NEWS_API_KEY: Optional[str] = None
    SECRET_KEY: str = "supersecretkey123"
    CORS_ORIGINS: str = "http://localhost:3000"

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()
