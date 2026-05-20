import yfinance as yf
import pandas as pd
import numpy as np
from datetime import datetime, timezone


class MarketIngester:
    def fetch_historical(self, ticker: str, start: str, end: str, db=None):
        from database.models import MarketTick
        try:
            data = yf.download(ticker, start=start, end=end, auto_adjust=True, progress=False)
            if data.empty:
                print(f"No data found for {ticker}")
                return 0

            # Compute volatility (rolling 5-day std of returns)
            data["Return"] = data["Close"].pct_change()
            data["Volatility"] = data["Return"].rolling(5).std()

            imported = 0
            for idx, row in data.iterrows():
                ts = pd.Timestamp(idx).to_pydatetime()
                if ts.tzinfo is None:
                    ts = ts.replace(tzinfo=timezone.utc)

                if db:
                    existing = db.query(MarketTick).filter(
                        MarketTick.ticker == ticker.upper(),
                        MarketTick.timestamp == ts
                    ).first()
                    if existing:
                        continue

                def safe_float(val):
                    try:
                        f = float(val)
                        return None if (f != f) else f  # NaN check
                    except Exception:
                        return None

                tick = MarketTick(
                    ticker=ticker.upper(),
                    timestamp=ts,
                    open_price=safe_float(row["Open"]),
                    high_price=safe_float(row["High"]),
                    low_price=safe_float(row["Low"]),
                    close_price=safe_float(row["Close"]),
                    volume=int(row["Volume"]) if not pd.isna(row["Volume"]) else None,
                    volatility=safe_float(row["Volatility"]),
                    short_interest=None,
                    option_activity_score=None,
                )
                if db:
                    db.add(tick)
                imported += 1

            if db:
                db.commit()
            print(f"Imported {imported} market ticks for {ticker}")
            return imported
        except Exception as e:
            print(f"Error fetching market data for {ticker}: {e}")
            return 0

    def fetch_realtime(self, ticker: str, db=None):
        return self.fetch_historical(
            ticker,
            start="2024-01-01",
            end=datetime.utcnow().strftime("%Y-%m-%d"),
            db=db
        )
