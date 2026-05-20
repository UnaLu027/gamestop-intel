from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from database import crud
from database.schemas import WatchlistCreate

router = APIRouter()


@router.get("")
def get_alerts(user_id: str = "anonymous", db: Session = Depends(get_db)):
    alerts = crud.get_alerts_for_watchlist(db, user_id)
    watchlists = crud.get_watchlists(db, user_id)
    return {
        "alerts": [
            {
                "alert_id": a.alert_id,
                "ticker": a.ticker,
                "alert_time": a.alert_time.isoformat(),
                "risk_level": a.risk_level,
                "rule_score": a.rule_score,
                "ml_score": a.ml_score,
                "final_score": a.final_score,
                "trigger_summary": a.trigger_summary,
                "explanation": a.explanation,
                "status": a.status,
            }
            for a in alerts
        ],
        "watchlist": [
            {"watchlist_id": w.watchlist_id, "ticker": w.ticker, "created_at": w.created_at.isoformat()}
            for w in watchlists
        ]
    }


@router.post("/watchlist")
def add_watchlist(body: WatchlistCreate, db: Session = Depends(get_db)):
    wl = crud.create_watchlist(db, body.user_id, body.ticker, body.threshold_config)
    return {"watchlist_id": wl.watchlist_id, "ticker": wl.ticker, "message": "Added to watchlist"}


@router.delete("/watchlist/{watchlist_id}")
def remove_watchlist(watchlist_id: str, db: Session = Depends(get_db)):
    ok = crud.delete_watchlist(db, watchlist_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Watchlist item not found")
    return {"message": "Removed from watchlist"}


@router.get("/history")
def get_alert_history(ticker: str, db: Session = Depends(get_db)):
    alerts = crud.get_alert_history(db, ticker.upper())
    return [
        {
            "alert_id": a.alert_id,
            "ticker": a.ticker,
            "alert_time": a.alert_time.isoformat(),
            "risk_level": a.risk_level,
            "final_score": a.final_score,
            "explanation": a.explanation,
            "status": a.status,
        }
        for a in alerts
    ]
