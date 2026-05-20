import praw
import uuid
from datetime import datetime, timezone
from typing import Optional
from config import settings


class RedditIngester:
    def __init__(self):
        self.reddit = None
        if settings.REDDIT_CLIENT_ID and settings.REDDIT_CLIENT_SECRET:
            try:
                self.reddit = praw.Reddit(
                    client_id=settings.REDDIT_CLIENT_ID,
                    client_secret=settings.REDDIT_CLIENT_SECRET,
                    user_agent=settings.REDDIT_USER_AGENT,
                )
                print("Reddit API connected")
            except Exception as e:
                print(f"Reddit API unavailable: {e}")

    def fetch_posts(self, ticker: str, subreddits: list = None, limit: int = 100, db=None):
        if not self.reddit:
            print("Reddit API not configured. Skipping ingestion.")
            return 0

        if subreddits is None:
            subreddits = ["wallstreetbets", "stocks", "investing", "GME"]

        from database.models import Post
        imported = 0
        for sub_name in subreddits:
            try:
                sub = self.reddit.subreddit(sub_name)
                for post in sub.search(ticker, limit=limit, sort="new"):
                    if not post.selftext and not post.title:
                        continue
                    content = f"{post.title}\n{post.selftext}".strip()[:2000]
                    post_time = datetime.fromtimestamp(post.created_utc, tz=timezone.utc)
                    existing = db.query(Post).filter(Post.url == post.url).first() if db else None
                    if existing:
                        continue
                    p = Post(
                        platform="reddit",
                        ticker=ticker.upper(),
                        author_id=str(post.author) if post.author else "deleted",
                        author_type="influencer" if post.score > 5000 else "retail",
                        post_time=post_time,
                        content=content,
                        likes=post.score,
                        replies=post.num_comments,
                        reposts=0,
                        url=post.url,
                    )
                    if db:
                        db.add(p)
                    imported += 1
            except Exception as e:
                print(f"Error fetching from r/{sub_name}: {e}")

        if db:
            db.commit()
        return imported
