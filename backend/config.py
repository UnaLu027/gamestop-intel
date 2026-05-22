from pydantic_settings import BaseSettings
from typing import Optional
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DEFAULT_SQLITE_URL = f"sqlite:///{(PROJECT_ROOT / 'gamestop.db').as_posix()}"


class Settings(BaseSettings):
    DATABASE_URL: str = DEFAULT_SQLITE_URL
    REDDIT_CLIENT_ID: Optional[str] = None
    REDDIT_CLIENT_SECRET: Optional[str] = None
    REDDIT_USER_AGENT: str = "GameStopAnalyzer/1.0"
    NEWS_API_KEY: Optional[str] = None
    SECRET_KEY: str = "supersecretkey123"
    CORS_ORIGINS: str = "http://localhost:3000"
    AUTO_SEED_DEMO_DATA: bool = True

    class Config:
        env_file = str(PROJECT_ROOT / ".env")
        extra = "allow"


settings = Settings()
