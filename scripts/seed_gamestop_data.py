#!/usr/bin/env python3
"""
Seed script: GameStop 2021 Social Trading Intelligence Data
Populates the database with realistic GME data from Jan-Mar 2021.

Usage:
    cd /app && python scripts/seed_gamestop_data.py
"""

import sys
import os
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

# Add backend to path so the script works from the project root on Windows,
# from Docker, and from CI.
PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(PROJECT_ROOT, "backend")
sys.path.insert(0, BACKEND_DIR)
sys.path.insert(0, PROJECT_ROOT)

from database import engine, SessionLocal, Base
from database.models import (
    Post, MarketTick, NLPResult, AggregatedSignal,
    Alert, ReplayEvent, ScenarioRun, Watchlist
)
from ml.nlp_pipeline import NLPPipeline
from ml.risk_engine import RiskEngine

# ─────────────────────────────────────────────────────────────────────────────
# Historical GME price data (approximate daily OHLCV) Jan 4 – Mar 31 2021
# ─────────────────────────────────────────────────────────────────────────────

GME_PRICES = [
    # (date_str, open, high, low, close, volume_millions)
    ("2021-01-04", 17.08, 20.36, 16.39, 18.84, 12.0),
    ("2021-01-05", 19.32, 21.00, 18.53, 19.94, 8.5),
    ("2021-01-06", 20.00, 25.00, 19.63, 21.42, 14.8),
    ("2021-01-07", 21.42, 24.70, 18.53, 21.66, 18.2),
    ("2021-01-08", 25.00, 25.12, 20.00, 20.65, 16.1),
    ("2021-01-11", 22.00, 23.00, 19.50, 19.94, 9.8),
    ("2021-01-12", 20.00, 22.50, 19.23, 21.66, 7.4),
    ("2021-01-13", 21.50, 24.04, 20.86, 23.66, 12.3),
    ("2021-01-14", 23.47, 29.30, 22.08, 26.66, 28.7),
    ("2021-01-15", 27.00, 37.20, 26.64, 35.50, 42.5),
    ("2021-01-19", 35.00, 37.00, 27.00, 30.11, 38.6),
    ("2021-01-20", 29.30, 31.40, 22.84, 24.82, 22.1),
    ("2021-01-21", 30.00, 35.50, 25.00, 31.40, 36.8),
    ("2021-01-22", 30.00, 34.00, 27.00, 33.22, 30.4),
    ("2021-01-25", 36.50, 76.76, 30.11, 76.79, 178.6),  # Ryan Cohen / WSB acceleration
    ("2021-01-26", 88.56, 150.00, 80.87, 147.98, 197.2),  # Elon tweet
    ("2021-01-27", 354.83, 380.00, 249.00, 347.51, 93200000),  # Peak Day 1
    ("2021-01-28", 483.00, 483.00, 112.25, 193.60, 58000000),  # Robinhood halts
    ("2021-01-29", 300.00, 380.00, 172.00, 325.00, 72000000),
    ("2021-02-01", 225.00, 270.00, 172.00, 225.00, 30000000),
    ("2021-02-02", 148.00, 182.00, 90.00, 90.00, 55000000),
    ("2021-02-03", 91.00, 108.00, 72.50, 83.19, 26000000),
    ("2021-02-04", 82.00, 92.90, 68.00, 53.50, 18000000),
    ("2021-02-05", 55.00, 60.00, 42.81, 63.77, 15000000),
    ("2021-02-08", 72.41, 72.66, 58.02, 60.00, 22000000),
    ("2021-02-09", 60.00, 75.00, 57.00, 50.31, 14000000),
    ("2021-02-10", 50.72, 53.50, 38.00, 45.94, 16000000),
    ("2021-02-11", 48.44, 53.00, 40.65, 48.41, 11000000),
    ("2021-02-12", 51.99, 55.00, 48.48, 45.00, 9000000),
    ("2021-02-16", 45.00, 50.00, 40.69, 44.97, 7600000),
    ("2021-02-17", 46.00, 50.00, 43.00, 40.59, 6800000),
    ("2021-02-18", 42.50, 43.83, 38.87, 41.00, 5500000),
    ("2021-02-19", 42.00, 46.20, 35.83, 38.65, 7400000),
    ("2021-02-22", 52.00, 53.00, 37.00, 40.59, 12000000),
    ("2021-02-23", 50.00, 53.00, 39.42, 44.76, 10500000),
    ("2021-02-24", 63.77, 91.71, 62.00, 91.71, 28000000),  # Second wave
    ("2021-02-25", 105.00, 115.00, 85.00, 101.74, 22000000),
    ("2021-02-26", 100.00, 108.00, 79.00, 108.73, 15000000),
    ("2021-03-01", 120.00, 127.50, 95.00, 120.35, 19000000),
    ("2021-03-02", 121.00, 147.00, 108.51, 137.74, 16500000),
    ("2021-03-03", 136.00, 163.00, 126.00, 152.09, 14000000),
    ("2021-03-04", 152.00, 178.00, 133.00, 165.16, 11000000),
    ("2021-03-05", 130.00, 159.00, 115.00, 135.32, 8000000),
    ("2021-03-08", 138.00, 150.00, 104.46, 122.93, 6600000),
    ("2021-03-09", 118.00, 120.00, 95.00, 115.00, 5900000),
    ("2021-03-10", 116.56, 119.00, 105.00, 159.18, 9800000),
    ("2021-03-11", 162.00, 190.00, 154.00, 180.46, 12500000),
    ("2021-03-12", 175.00, 185.00, 148.00, 157.59, 8100000),
    ("2021-03-15", 149.00, 156.00, 130.00, 139.71, 5400000),
    ("2021-03-16", 145.00, 157.60, 134.00, 157.60, 6300000),
    ("2021-03-17", 154.00, 167.00, 143.00, 154.00, 5100000),
    ("2021-03-18", 147.00, 155.00, 118.54, 128.56, 7200000),
    ("2021-03-19", 135.00, 180.00, 123.00, 181.75, 14000000),
    ("2021-03-22", 177.00, 204.00, 166.80, 190.90, 10800000),
    ("2021-03-23", 182.00, 200.00, 155.00, 168.88, 8200000),
    ("2021-03-24", 172.00, 178.00, 141.00, 145.00, 7100000),
    ("2021-03-25", 145.00, 150.00, 129.00, 150.31, 6500000),
    ("2021-03-26", 152.00, 163.00, 143.00, 160.05, 5200000),
    ("2021-03-29", 160.00, 175.00, 151.00, 162.60, 4900000),
    ("2021-03-30", 167.00, 170.00, 148.00, 148.95, 4600000),
    ("2021-03-31", 148.00, 155.00, 140.00, 141.80, 4400000),
]

# ─────────────────────────────────────────────────────────────────────────────
# Key GameStop events Jan-Mar 2021
# ─────────────────────────────────────────────────────────────────────────────

REPLAY_EVENTS = [
    {
        "event_time": "2021-01-11",
        "event_type": "market_event",
        "title": "Ryan Cohen joins GameStop Board",
        "description": "Chewy co-founder Ryan Cohen joins the GameStop board of directors with two other RC Ventures nominees. WSB community celebrates this as a catalyst.",
        "source_type": "news",
    },
    {
        "event_time": "2021-01-14",
        "event_type": "social_event",
        "title": "WSB mentions hit 10k/day — early squeeze narrative forms",
        "description": "r/wallstreetbets post count about GME exceeds 10,000 per day for the first time. The 'short squeeze' narrative begins dominating posts.",
        "source_type": "reddit",
    },
    {
        "event_time": "2021-01-22",
        "event_type": "market_event",
        "title": "Short interest reported at 140% of float",
        "description": "GME short interest data shows over 140% of float shorted — one of the highest levels ever recorded, fueling squeeze speculation.",
        "source_type": "market_data",
    },
    {
        "event_time": "2021-01-25",
        "event_type": "social_event",
        "title": "WSB explodes — 2M subscribers milestone",
        "description": "r/wallstreetbets hits 2 million subscribers. GME post volume surges 8x vs prior week baseline. Coordination posts dominate: 'Apes together strong', 'Diamond hands'.",
        "source_type": "reddit",
    },
    {
        "event_time": "2021-01-26",
        "event_type": "social_event",
        "title": "Elon Musk tweets 'Gamestonk!!'",
        "description": "Elon Musk tweets 'Gamestonk!!' with a link to r/wallstreetbets. Stock surges 57% AH. Musk's 43M Twitter followers receive the signal simultaneously.",
        "source_type": "twitter",
    },
    {
        "event_time": "2021-01-27",
        "event_type": "market_event",
        "title": "GME peaks at $483 — all-time high",
        "description": "GameStop reaches all-time intraday high of $483. Trading volume exceeds 93 million shares. Nasdaq's most traded stock. Short sellers face billions in losses.",
        "source_type": "market_data",
    },
    {
        "event_time": "2021-01-28",
        "event_type": "regulation_event",
        "title": "Robinhood halts GME buying — massive backlash",
        "description": "Robinhood and several brokers restrict buying of GME citing DTCC margin requirements. Stock drops 77% from peak. Congressional hearings demanded. WSB furious — trading restrictions become viral topic.",
        "source_type": "news",
    },
    {
        "event_time": "2021-01-29",
        "event_type": "social_event",
        "title": "Reddit 'Hold the line' movement peaks",
        "description": "Despite price crash, WSB posts surge with 'hold the line' and 'diamond hands' messages. Coordination ratio hits record 42%. Retail investors vow not to sell.",
        "source_type": "reddit",
    },
    {
        "event_time": "2021-02-02",
        "event_type": "market_event",
        "title": "Short squeeze unwinds — price collapses to $90",
        "description": "GME falls to $90 as institutional short covering completes and retail holders begin selling. Volume remains elevated but bullish ratio drops sharply.",
        "source_type": "market_data",
    },
    {
        "event_time": "2021-02-04",
        "event_type": "regulation_event",
        "title": "SEC announces review of social media trading",
        "description": "SEC issues statement that it is 'closely monitoring and evaluating' the extreme price volatility in GME. Signals potential regulatory action.",
        "source_type": "news",
    },
    {
        "event_time": "2021-02-18",
        "event_type": "market_event",
        "title": "Congressional hearing: Robinhood CEO testifies",
        "description": "Robinhood CEO Vlad Tenev testifies before Congress about the January trading halt. GameStop again makes mainstream headlines.",
        "source_type": "news",
    },
    {
        "event_time": "2021-02-24",
        "event_type": "social_event",
        "title": "Second wave begins — WSB activity surges again",
        "description": "GME social volume spikes 4x in 24 hours. New short squeeze narrative emerges on WSB. Price surges from $40 to $91 in a single day.",
        "source_type": "reddit",
    },
    {
        "event_time": "2021-03-01",
        "event_type": "market_event",
        "title": "GameStop announces e-commerce pivot",
        "description": "GameStop announces plans to transform into an e-commerce company with Ryan Cohen leading strategy. Fundamental narrative shifts from pure squeeze to value story.",
        "source_type": "news",
    },
    {
        "event_time": "2021-03-11",
        "event_type": "market_event",
        "title": "Third squeeze attempt — price hits $190",
        "description": "GME surges 50% in two days reaching $190. Options gamma squeeze dynamics identified. WSB again dominates stock discussion with coordinated buy calls.",
        "source_type": "reddit",
    },
    {
        "event_time": "2021-03-19",
        "event_type": "market_event",
        "title": "GME files ATM offering — 3.5M shares",
        "description": "GameStop announces at-the-money equity offering of 3.5 million shares, raising ~$600M. Stock initially drops on dilution fears before recovering.",
        "source_type": "news",
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# Sample WSB-style posts for key dates
# ─────────────────────────────────────────────────────────────────────────────

SAMPLE_POSTS = [
    # Jan 11 — early days
    {
        "date": "2021-01-11",
        "platform": "reddit",
        "author_id": "deepfuckingvalue",
        "author_type": "influencer",
        "content": "Ryan Cohen just joined the board. This is the catalyst we've been waiting for. GME is no longer just a squeeze play — it's a company with a path to $1B e-commerce revenue. Still holding my calls. Diamond hands.",
        "likes": 28450,
        "replies": 3200,
    },
    {
        "date": "2021-01-11",
        "platform": "reddit",
        "author_id": "wsb_ape_01",
        "author_type": "retail",
        "content": "Just bought 50 more shares of GME. Ryan Cohen on the board is HUGE. This stock is going to the moon. Apes together strong! 🚀🚀",
        "likes": 4200,
        "replies": 890,
    },
    # Jan 22 — heating up
    {
        "date": "2021-01-22",
        "platform": "reddit",
        "author_id": "squeeze_prophet",
        "author_type": "retail",
        "content": "140% SHORT INTEREST. Let that sink in. There are more shares shorted than actually exist. When this thing squeezes, it will be the mother of all short squeezes. MOASS is real. BUY AND HOLD.",
        "likes": 67800,
        "replies": 8900,
    },
    {
        "date": "2021-01-22",
        "platform": "reddit",
        "author_id": "options_yolo",
        "author_type": "retail",
        "content": "Bought $100 in GME calls. Either I retire next week or I learn a very expensive lesson about options. YOLO. Let's go apes!",
        "likes": 22100,
        "replies": 4300,
    },
    # Jan 25 — surge day
    {
        "date": "2021-01-25",
        "platform": "reddit",
        "author_id": "wsb_mod_hero",
        "author_type": "influencer",
        "content": "WE HIT 2 MILLION SUBSCRIBERS TODAY. WSB is now the most powerful retail trading community in history. GME is our flag. DO NOT SELL. Diamond hands, apes. We hold together or we fall apart. The hedgies want you to sell. DON'T GIVE THEM THE SATISFACTION.",
        "likes": 142000,
        "replies": 28000,
    },
    {
        "date": "2021-01-25",
        "platform": "reddit",
        "author_id": "tendies_incoming",
        "author_type": "retail",
        "content": "GME up 78% today. I put my entire savings into this last week. This is working. Buy more if you can. We hold until $1000. APES TOGETHER STRONG!",
        "likes": 38500,
        "replies": 12000,
    },
    {
        "date": "2021-01-25",
        "platform": "reddit",
        "author_id": "short_seller_killer",
        "author_type": "retail",
        "content": "Every share you hold is a vote against the hedge funds that have destroyed countless companies through naked short selling. Hold the line. This is bigger than tendies.",
        "likes": 52000,
        "replies": 9800,
    },
    # Jan 26 — Elon tweet day
    {
        "date": "2021-01-26",
        "platform": "reddit",
        "author_id": "gme_oracle",
        "author_type": "influencer",
        "content": "ELON MUSK JUST TWEETED GAMESTONK. This is it. This is the rocket fuel. Buy everything you can. The gamma squeeze is happening RIGHT NOW. $500 is just the beginning. Options expiring this week will force more buying. WE'RE GOING TO SPACE!!!!!",
        "likes": 198000,
        "replies": 45000,
    },
    {
        "date": "2021-01-26",
        "platform": "reddit",
        "author_id": "wsb_ape_diamond",
        "author_type": "retail",
        "content": "Just mortgaged my house to buy GME calls. Just kidding. But seriously I put in $10k. Elon tweeted. The world is watching. Let's show them what retail can do.",
        "likes": 89000,
        "replies": 23000,
    },
    # Jan 27 — Peak day
    {
        "date": "2021-01-27",
        "platform": "reddit",
        "author_id": "deepfuckingvalue",
        "author_type": "influencer",
        "content": "Good morning. Still holding. GME pre-market at $450. My position is now worth $48 million. I am not selling. This is what conviction looks like. For every person saying sell, there are 1000 apes holding. Diamond hands forever.",
        "likes": 425000,
        "replies": 78000,
    },
    {
        "date": "2021-01-27",
        "platform": "reddit",
        "author_id": "wsb_astronaut",
        "author_type": "retail",
        "content": "I QUIT MY JOB TODAY. Called my boss and said see you never. GME is my new job. I am going to the moon. Thank you WSB. Thank you DFV. APES TOGETHER STRONG! 🚀🚀🚀🚀",
        "likes": 312000,
        "replies": 54000,
    },
    {
        "date": "2021-01-27",
        "platform": "reddit",
        "author_id": "gamma_squeeze_god",
        "author_type": "retail",
        "content": "GAMMA SQUEEZE IS REAL. Market makers are forced to buy shares to hedge their options exposure. This is a self-reinforcing loop. The higher it goes, the more they have to buy. $1000 price target is conservative. WE ARE IN UNCHARTED TERRITORY.",
        "likes": 187000,
        "replies": 41000,
    },
    # Jan 28 — Robinhood halt day
    {
        "date": "2021-01-28",
        "platform": "reddit",
        "author_id": "robinhood_traitor",
        "author_type": "influencer",
        "content": "ROBINHOOD HAS BETRAYED RETAIL INVESTORS. They disabled buying of GME while hedge funds can still short it freely. This is market manipulation. This is illegal. Call your congressman. Hold your shares. Do NOT sell on Robinhood. Move your shares to Fidelity. HOLD THE LINE.",
        "likes": 567000,
        "replies": 124000,
    },
    {
        "date": "2021-01-28",
        "platform": "reddit",
        "author_id": "apes_hold",
        "author_type": "retail",
        "content": "They had to halt trading because WE WERE WINNING. If you sell now, the hedge funds win. This is exactly what they want. HOLD. HOLD. HOLD. Diamond hands. The short interest is still there. The squeeze hasn't squoze.",
        "likes": 298000,
        "replies": 87000,
    },
    {
        "date": "2021-01-28",
        "platform": "reddit",
        "author_id": "wsb_holdmaster",
        "author_type": "retail",
        "content": "I lost $80k today because they stopped letting me buy the dip. But I'm not selling. This is bigger than money now. This is about sending a message to Wall Street that they can't just do whatever they want to small investors.",
        "likes": 145000,
        "replies": 33000,
    },
    # Jan 29 — Hold narrative
    {
        "date": "2021-01-29",
        "platform": "reddit",
        "author_id": "diamond_hand_nation",
        "author_type": "retail",
        "content": "Still holding at $325. They couldn't kill us yesterday. The squeeze hasn't happened yet. Short interest is STILL elevated. Hold the line apes. We hold together. We are not done.",
        "likes": 234000,
        "replies": 56000,
    },
    # Feb 2 — Capitulation
    {
        "date": "2021-02-02",
        "platform": "reddit",
        "author_id": "wsb_survivor",
        "author_type": "retail",
        "content": "GME at $90. I bought at $350. I've lost $50k. But I read the DD. The fundamentals are there. Ryan Cohen is still there. I'm holding. Long-term value play now. Not selling.",
        "likes": 78000,
        "replies": 19000,
    },
    {
        "date": "2021-02-02",
        "platform": "reddit",
        "author_id": "hold_or_fold",
        "author_type": "retail",
        "content": "Price is down 70% from peak. Half the people in this sub have sold. The squeeze is over. But that doesn't mean GME is worthless. Ryan Cohen's e-commerce pivot is real. I'm staying in for the long game.",
        "likes": 32000,
        "replies": 8000,
    },
    # Feb 24 — Second wave
    {
        "date": "2021-02-24",
        "platform": "reddit",
        "author_id": "second_wave_incoming",
        "author_type": "influencer",
        "content": "THE SECOND SQUEEZE IS HAPPENING. GME went from $40 to $91 TODAY. Short interest is BACK above 60%. New options chain is in play. The hedgies never actually closed their positions. This is wave 2. BUY NOW. DON'T MISS THE SECOND ROCKET.",
        "likes": 156000,
        "replies": 42000,
    },
    # Mar 10 — Third wave
    {
        "date": "2021-03-10",
        "platform": "reddit",
        "author_id": "wsb_eternal",
        "author_type": "retail",
        "content": "GME is back baby! $159 today. Third wave apes! The pattern is clear — they suppress, we accumulate, they have to cover, price explodes. Buying more calls for March expiry.",
        "likes": 87000,
        "replies": 21000,
    },
    {
        "date": "2021-03-10",
        "platform": "news",
        "author_id": "Reuters",
        "author_type": "news_outlet",
        "content": "GameStop shares surge 50% as retail investors renew interest in meme stocks. The company's stock, which became the center of a short-squeeze frenzy in late January, has again attracted significant attention on Reddit's WallStreetBets forum.",
        "likes": 0,
        "replies": 0,
    },
]

# ─────────────────────────────────────────────────────────────────────────────
# Social volume multipliers by date (to simulate realistic social patterns)
# ─────────────────────────────────────────────────────────────────────────────

SOCIAL_VOLUME_BY_DATE = {
    "2021-01-04": (120, 0.45, 0.12),   # (posts, bullish_ratio, hype)
    "2021-01-05": (145, 0.48, 0.14),
    "2021-01-06": (210, 0.52, 0.18),
    "2021-01-07": (280, 0.55, 0.22),
    "2021-01-08": (320, 0.58, 0.25),
    "2021-01-11": (850, 0.72, 0.42),   # Ryan Cohen board event
    "2021-01-12": (920, 0.74, 0.44),
    "2021-01-13": (1100, 0.76, 0.48),
    "2021-01-14": (1450, 0.78, 0.54),
    "2021-01-15": (2800, 0.82, 0.62),
    "2021-01-19": (3200, 0.80, 0.58),
    "2021-01-20": (4100, 0.78, 0.56),
    "2021-01-21": (5500, 0.80, 0.60),
    "2021-01-22": (7800, 0.84, 0.68),  # 140% short interest news
    "2021-01-25": (18000, 0.88, 0.76), # WSB 2M subscribers, huge run
    "2021-01-26": (32000, 0.91, 0.85), # Elon tweet day
    "2021-01-27": (58000, 0.93, 0.95), # Peak day — all-time high
    "2021-01-28": (72000, 0.85, 0.92), # Robinhood halt — panic/anger
    "2021-01-29": (48000, 0.87, 0.88), # Hold narrative
    "2021-02-01": (22000, 0.75, 0.72),
    "2021-02-02": (18000, 0.65, 0.65), # Price collapses
    "2021-02-03": (12000, 0.58, 0.55),
    "2021-02-04": (8500, 0.52, 0.48),
    "2021-02-05": (7200, 0.50, 0.45),
    "2021-02-08": (6800, 0.55, 0.42),
    "2021-02-09": (5900, 0.52, 0.40),
    "2021-02-10": (5100, 0.50, 0.38),
    "2021-02-11": (4800, 0.51, 0.37),
    "2021-02-12": (4500, 0.50, 0.36),
    "2021-02-16": (4200, 0.52, 0.35),
    "2021-02-17": (4000, 0.51, 0.34),
    "2021-02-18": (3900, 0.50, 0.34),
    "2021-02-19": (4200, 0.53, 0.36),
    "2021-02-22": (5500, 0.58, 0.42),
    "2021-02-23": (7200, 0.64, 0.48),
    "2021-02-24": (22000, 0.82, 0.75), # Second wave begins
    "2021-02-25": (18000, 0.80, 0.72),
    "2021-02-26": (14000, 0.77, 0.68),
    "2021-03-01": (11000, 0.74, 0.62),
    "2021-03-02": (9500, 0.72, 0.58),
    "2021-03-03": (8800, 0.70, 0.56),
    "2021-03-04": (8200, 0.68, 0.54),
    "2021-03-05": (7500, 0.66, 0.52),
    "2021-03-08": (7000, 0.64, 0.50),
    "2021-03-09": (6800, 0.63, 0.48),
    "2021-03-10": (9500, 0.72, 0.62),  # Third wave starts
    "2021-03-11": (14000, 0.78, 0.70),
    "2021-03-12": (11000, 0.72, 0.64),
    "2021-03-15": (8500, 0.66, 0.55),
    "2021-03-16": (7800, 0.65, 0.52),
    "2021-03-17": (7200, 0.63, 0.50),
    "2021-03-18": (6800, 0.62, 0.48),
    "2021-03-19": (10000, 0.70, 0.60), # ATM offering
    "2021-03-22": (8500, 0.68, 0.56),
    "2021-03-23": (7600, 0.65, 0.52),
    "2021-03-24": (6800, 0.62, 0.48),
    "2021-03-25": (6200, 0.60, 0.46),
    "2021-03-26": (5900, 0.59, 0.44),
    "2021-03-29": (5500, 0.58, 0.43),
    "2021-03-30": (5200, 0.57, 0.42),
    "2021-03-31": (4900, 0.56, 0.41),
}

# Alert configurations for peak risk days
ALERT_DAYS = [
    {
        "date": "2021-01-25",
        "risk_level": "SqueezeRisk",
        "rule_score": 6.5,
        "ml_score": 6.8,
        "final_score": 6.8,
        "trigger_summary": "Social mentions +8x | Hype score 0.76 | Bullish ratio 88% | Volume 3.2σ above mean",
        "explanation": "WARNING: Social-driven squeeze risk elevated. Social mentions surging 8x above baseline, extreme bullish sentiment, and abnormal volume detected. Extreme short-term price swings are probable.",
    },
    {
        "date": "2021-01-26",
        "risk_level": "SqueezeRisk",
        "rule_score": 7.5,
        "ml_score": 7.8,
        "final_score": 7.8,
        "trigger_summary": "Elon Musk tweet catalyst | Social +22x | Hype 0.85 | Gamma squeeze dynamics active",
        "explanation": "CRITICAL: Influencer-amplified squeeze signal. Elon Musk's tweet to 43M followers created simultaneous buy signal. Gamma squeeze mechanics are amplifying price moves.",
    },
    {
        "date": "2021-01-27",
        "risk_level": "ReversalRisk",
        "rule_score": 9.8,
        "ml_score": 9.5,
        "final_score": 9.8,
        "trigger_summary": "ALL-TIME HIGH $483 | Social volume 58k posts/day | Hype 0.95 | 93M shares traded",
        "explanation": "CRITICAL RISK: All indicators at historic extremes. GME social volume unprecedented, hype score at ceiling, price at all-time high. High probability of severe reversal within 24-72 hours.",
    },
    {
        "date": "2021-01-28",
        "risk_level": "ReversalRisk",
        "rule_score": 9.2,
        "ml_score": 8.9,
        "final_score": 9.2,
        "trigger_summary": "Trading halt by Robinhood | Price -77% from peak | Regulatory intervention | Panic selling begins",
        "explanation": "CRITICAL: Trading restrictions have been activated, creating a one-sided market. Historical data shows trading halts during meme stock events lead to accelerated price reversal.",
    },
    {
        "date": "2021-02-24",
        "risk_level": "SqueezeRisk",
        "rule_score": 6.2,
        "ml_score": 6.5,
        "final_score": 6.5,
        "trigger_summary": "Second wave | Social +4x | Price +127% single day | Short interest still elevated",
        "explanation": "WARNING: Second squeeze cycle detected. Social activity mirrors early January pattern. Short interest remains elevated. Second wave squeeze risk is elevated.",
    },
    {
        "date": "2021-03-11",
        "risk_level": "HeatingUp",
        "rule_score": 5.2,
        "ml_score": 5.4,
        "final_score": 5.4,
        "trigger_summary": "Third wave attempt | Social +2x | Price +50% in 2 days | Options gamma active",
        "explanation": "Third wave social trading activity detected. Less intense than prior waves but pattern is similar. Monitor for escalation.",
    },
]


def create_tables(db_session):
    Base.metadata.create_all(bind=engine)
    print("Database tables created.")


def seed_market_data(db):
    print("Seeding GME market data...")
    inserted = 0
    all_closes = []

    for entry in GME_PRICES:
        date_str = entry[0]
        open_p, high_p, low_p, close_p, vol = entry[1], entry[2], entry[3], entry[4], entry[5]
        all_closes.append(close_p)

        ts = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)

        existing = db.query(MarketTick).filter(
            MarketTick.ticker == "GME",
            MarketTick.timestamp == ts
        ).first()
        if existing:
            continue

        # Compute simple daily volatility (abs daily return as proxy)
        prev_close = all_closes[-2] if len(all_closes) >= 2 else close_p
        daily_return = abs(close_p - prev_close) / max(prev_close, 0.01)

        volume_actual = int(vol) if vol > 1000 else int(vol * 1_000_000)

        tick = MarketTick(
            ticker="GME",
            timestamp=ts,
            open_price=Decimal(str(open_p)),
            high_price=Decimal(str(high_p)),
            low_price=Decimal(str(low_p)),
            close_price=Decimal(str(close_p)),
            volume=volume_actual,
            volatility=round(daily_return, 6),
            short_interest=0.80 if date_str <= "2021-01-22" else (
                0.60 if date_str <= "2021-02-10" else 0.35
            ),
            option_activity_score=None,
        )
        db.add(tick)
        inserted += 1

    db.commit()
    print(f"  Inserted {inserted} market ticks.")


def seed_posts(db):
    print("Seeding sample posts...")
    inserted = 0

    for p in SAMPLE_POSTS:
        date_str = p["date"]
        ts = datetime.strptime(date_str, "%Y-%m-%d").replace(
            hour=10, minute=30, second=0, tzinfo=timezone.utc
        )
        post = Post(
            platform=p["platform"],
            ticker="GME",
            author_id=p["author_id"],
            author_type=p["author_type"],
            post_time=ts,
            content=p["content"],
            likes=p["likes"],
            replies=p["replies"],
            reposts=0,
            url=f"https://reddit.com/r/wallstreetbets/comments/{uuid.uuid4().hex[:8]}",
        )
        db.add(post)
        inserted += 1

    db.commit()
    print(f"  Inserted {inserted} sample posts.")
    return inserted


def seed_nlp(db):
    print("Running NLP on posts...")
    pipeline = NLPPipeline()
    processed = pipeline.process_pending_posts(db, batch_size=500)
    print(f"  Processed {processed} posts with NLP.")


def seed_aggregated_signals(db):
    print("Computing aggregated signals...")
    engine_risk = RiskEngine()
    inserted = 0

    for date_str, (post_count, bullish_ratio, avg_hype) in SOCIAL_VOLUME_BY_DATE.items():
        ts = datetime.strptime(date_str, "%Y-%m-%d").replace(tzinfo=timezone.utc)
        start = ts
        end = ts + timedelta(days=1)

        existing = db.query(AggregatedSignal).filter(
            AggregatedSignal.ticker == "GME",
            AggregatedSignal.window_start == start
        ).first()
        if existing:
            continue

        # Compute prev day post count for growth rate
        prev_date = (ts - timedelta(days=1)).strftime("%Y-%m-%d")
        prev_count = SOCIAL_VOLUME_BY_DATE.get(prev_date, (0, 0, 0))[0]
        mention_growth = float(post_count - prev_count) / max(prev_count, 1)

        # Get market data for price return + volume
        tick = db.query(MarketTick).filter(
            MarketTick.ticker == "GME",
            MarketTick.timestamp == ts
        ).first()

        prev_ts = ts - timedelta(days=1)
        # Try to find prev trading day (go back up to 5 days)
        prev_tick = None
        for d in range(1, 6):
            candidate_ts = ts - timedelta(days=d)
            prev_tick = db.query(MarketTick).filter(
                MarketTick.ticker == "GME",
                MarketTick.timestamp == candidate_ts
            ).first()
            if prev_tick:
                break

        if tick and tick.close_price and prev_tick and prev_tick.close_price:
            price_return = float((tick.close_price - prev_tick.close_price) / prev_tick.close_price)
        else:
            price_return = 0.0

        # Volume z-score (simplified — use known extreme days)
        extreme_days = {"2021-01-27", "2021-01-28", "2021-01-29", "2021-02-24"}
        high_days = {"2021-01-25", "2021-01-26", "2021-02-01", "2021-02-02"}
        if date_str in extreme_days:
            abnormal_vol = 4.5 + (abs(price_return) * 3)
        elif date_str in high_days:
            abnormal_vol = 2.5 + (abs(price_return) * 2)
        elif abs(price_return) > 0.3:
            abnormal_vol = 2.0
        elif abs(price_return) > 0.1:
            abnormal_vol = 1.0
        else:
            abnormal_vol = 0.2

        # Volatility score
        vola_score = min(abs(price_return) * 10, 9.9)

        # Coordination ratio (higher during key events)
        coord_ratio = 0.25 if date_str in {"2021-01-27", "2021-01-28", "2021-01-29"} else (
            0.18 if date_str in {"2021-01-25", "2021-01-26"} else (
            0.12 if bullish_ratio > 0.75 else 0.05
        ))

        # Influencer posts
        influencer_count = 8 if date_str in {"2021-01-26", "2021-01-27"} else (
            5 if bullish_ratio > 0.80 else (3 if bullish_ratio > 0.70 else 1)
        )

        features = {
            "post_count": post_count,
            "unique_authors": int(post_count * 0.72),
            "bullish_ratio": bullish_ratio,
            "bearish_ratio": max(0.0, 1.0 - bullish_ratio - 0.1),
            "avg_hype_score": avg_hype,
            "coordination_ratio": coord_ratio,
            "influencer_post_count": influencer_count,
            "mention_growth_rate": mention_growth,
            "price_return": price_return,
            "abnormal_volume_score": min(abnormal_vol, 9.9),
            "volatility_score": min(vola_score, 9.9),
        }

        risk_result = engine_risk.compute_rule_score(features)

        sig = AggregatedSignal(
            ticker="GME",
            window_start=start,
            window_end=end,
            risk_score_pre_ml=risk_result["final_score"],
            **features,
        )
        db.add(sig)
        inserted += 1

    db.commit()
    print(f"  Inserted {inserted} aggregated signals.")


def seed_replay_events(db):
    print("Seeding replay events...")
    inserted = 0
    for event in REPLAY_EVENTS:
        ts = datetime.strptime(event["event_time"], "%Y-%m-%d").replace(
            hour=9, minute=30, tzinfo=timezone.utc
        )
        existing = db.query(ReplayEvent).filter(
            ReplayEvent.ticker == "GME",
            ReplayEvent.title == event["title"]
        ).first()
        if existing:
            continue
        ev = ReplayEvent(
            ticker="GME",
            event_time=ts,
            event_type=event["event_type"],
            title=event["title"],
            description=event["description"],
            source_type=event["source_type"],
            related_post_id=None,
        )
        db.add(ev)
        inserted += 1
    db.commit()
    print(f"  Inserted {inserted} replay events.")


def seed_alerts(db):
    print("Seeding alerts for peak risk days...")
    inserted = 0
    for a in ALERT_DAYS:
        ts = datetime.strptime(a["date"], "%Y-%m-%d").replace(
            hour=14, minute=0, tzinfo=timezone.utc
        )
        existing = db.query(Alert).filter(
            Alert.ticker == "GME",
            Alert.alert_time == ts
        ).first()
        if existing:
            continue
        alert = Alert(
            ticker="GME",
            alert_time=ts,
            risk_level=a["risk_level"],
            rule_score=a["rule_score"],
            ml_score=a["ml_score"],
            final_score=a["final_score"],
            trigger_summary=a["trigger_summary"],
            explanation=a["explanation"],
            status="active" if a["date"] >= "2021-01-25" else "resolved",
        )
        db.add(alert)
        inserted += 1
    db.commit()
    print(f"  Inserted {inserted} alerts.")


def seed_demo_watchlist(db):
    print("Seeding demo watchlist...")
    existing = db.query(Watchlist).filter(
        Watchlist.user_id == "demo_user",
        Watchlist.ticker == "GME"
    ).first()
    if existing:
        print("  Demo watchlist already exists.")
        return
    wl = Watchlist(
        user_id="demo_user",
        ticker="GME",
        threshold_config_json={
            "risk_score_threshold": 5.0,
            "hype_score_threshold": 0.6,
            "mention_growth_threshold": 2.0,
        }
    )
    db.add(wl)
    db.commit()
    print("  Demo watchlist created for user 'demo_user'.")


def main():
    print("=" * 60)
    print("GameStop Social Trading Intelligence Platform - Seed Script")
    print("=" * 60)

    db = SessionLocal()
    try:
        create_tables(db)
        seed_market_data(db)
        seed_posts(db)
        seed_nlp(db)
        seed_aggregated_signals(db)
        seed_replay_events(db)
        seed_alerts(db)
        seed_demo_watchlist(db)

        print("=" * 60)
        print("Seed complete! Summary:")
        print(f"  Market ticks: {db.query(MarketTick).filter(MarketTick.ticker == 'GME').count()}")
        print(f"  Posts:        {db.query(Post).filter(Post.ticker == 'GME').count()}")
        print(f"  NLP results:  {db.query(NLPResult).count()}")
        print(f"  Signals:      {db.query(AggregatedSignal).filter(AggregatedSignal.ticker == 'GME').count()}")
        print(f"  Events:       {db.query(ReplayEvent).filter(ReplayEvent.ticker == 'GME').count()}")
        print(f"  Alerts:       {db.query(Alert).filter(Alert.ticker == 'GME').count()}")
        print("=" * 60)
    except Exception as e:
        print(f"Error during seeding: {e}")
        import traceback
        traceback.print_exc()
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    main()
