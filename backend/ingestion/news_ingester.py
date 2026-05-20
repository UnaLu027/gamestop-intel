from config import settings
from datetime import datetime, timezone


class NewsIngester:
    def __init__(self):
        self.client = None
        if settings.NEWS_API_KEY:
            try:
                from newsapi import NewsApiClient
                self.client = NewsApiClient(api_key=settings.NEWS_API_KEY)
                print("NewsAPI connected")
            except Exception as e:
                print(f"NewsAPI unavailable: {e}")

    def fetch_articles(self, ticker: str, query: str = None, db=None):
        if not self.client:
            print("NewsAPI not configured.")
            return 0
        from database.models import Post
        q = query or f"{ticker} stock"
        try:
            articles = self.client.get_everything(
                q=q,
                language="en",
                page_size=50,
                sort_by="publishedAt"
            )
            imported = 0
            for article in articles.get("articles", []):
                content = f"{article.get('title', '')}\n{article.get('description', '')}".strip()
                if not content:
                    continue
                pub_at = article.get("publishedAt")
                if pub_at:
                    post_time = datetime.strptime(pub_at, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
                else:
                    post_time = datetime.utcnow().replace(tzinfo=timezone.utc)
                url = article.get("url", "")
                if db:
                    existing = db.query(Post).filter(Post.url == url).first()
                    if existing:
                        continue
                p = Post(
                    platform="news",
                    ticker=ticker.upper(),
                    author_id=article.get("source", {}).get("name", "unknown"),
                    author_type="news_outlet",
                    post_time=post_time,
                    content=content[:2000],
                    likes=0,
                    replies=0,
                    reposts=0,
                    url=url,
                )
                if db:
                    db.add(p)
                imported += 1
            if db:
                db.commit()
            return imported
        except Exception as e:
            print(f"Error fetching news: {e}")
            return 0
