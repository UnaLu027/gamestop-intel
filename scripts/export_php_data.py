#!/usr/bin/env python3
"""Export the seeded SQLite demo database into JSON for the Apache/PHP build."""

import json
import sqlite3
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parent.parent
DB_PATH = PROJECT_ROOT / "gamestop.db"
OUTPUT_DIR = PROJECT_ROOT / "apache-php" / "api" / "data"
OUTPUT_FILE = OUTPUT_DIR / "app-data.json"


def rows(conn: sqlite3.Connection, query: str, params: tuple = ()) -> list[dict]:
    conn.row_factory = sqlite3.Row
    return [dict(row) for row in conn.execute(query, params).fetchall()]


def main() -> None:
    if not DB_PATH.exists():
        raise SystemExit(f"Database not found: {DB_PATH}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(DB_PATH) as conn:
        data = {
            "market_ticks": rows(conn, "SELECT * FROM market_ticks ORDER BY timestamp"),
            "aggregated_signals": rows(conn, "SELECT * FROM aggregated_signals ORDER BY window_start"),
            "posts": rows(
                conn,
                """
                SELECT
                    p.*,
                    n.stance,
                    n.hype_score,
                    n.post_type,
                    n.action_cue,
                    n.confidence,
                    n.model_version
                FROM posts p
                LEFT JOIN nlp_results n ON n.post_id = p.post_id
                ORDER BY p.post_time DESC
                """,
            ),
            "replay_events": rows(conn, "SELECT * FROM replay_events ORDER BY event_time"),
            "alerts": rows(conn, "SELECT * FROM alerts ORDER BY alert_time DESC"),
            "watchlists": rows(conn, "SELECT * FROM watchlists ORDER BY created_at DESC"),
        }

    OUTPUT_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Exported Apache/PHP data to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
