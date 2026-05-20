from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from database import crud
from database.models import ScenarioRun
from database.schemas import ScenarioRequest
from ml.risk_engine import RiskEngine

router = APIRouter()
risk_engine = RiskEngine()


@router.post("/run")
def run_scenario(body: ScenarioRequest, db: Session = Depends(get_db)):
    result = risk_engine.evaluate_scenario(
        mention_growth=body.mention_growth,
        bullish_ratio=body.bullish_ratio,
        hype_score=body.hype_score,
        short_interest=body.short_interest,
        influencer_posts=body.influencer_posts,
        trading_restricted=body.trading_restricted,
        options_activity_high=body.options_activity_high,
    )

    run = ScenarioRun(
        user_id=body.user_id,
        ticker=body.ticker.upper(),
        input_params_json=body.model_dump(),
        output_score=result["final_score"],
        output_label=result["label"],
        output_explanation=result["explanation"],
    )
    crud.save_scenario_run(db, run)

    return {
        "run_id": run.run_id,
        "ticker": body.ticker,
        "risk_score": result["final_score"],
        "label": result["label"],
        "explanation": result["explanation"],
        "drivers": result["drivers"],
        "rule_score": result["rule_score"],
    }


@router.get("/history")
def get_history(user_id: str = "anonymous", db: Session = Depends(get_db)):
    runs = crud.get_scenario_history(db, user_id)
    return [
        {
            "run_id": r.run_id,
            "ticker": r.ticker,
            "output_score": r.output_score,
            "output_label": r.output_label,
            "output_explanation": r.output_explanation,
            "created_at": r.created_at.isoformat(),
            "input_params": r.input_params_json,
        }
        for r in runs
    ]
