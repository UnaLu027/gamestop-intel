import re
from typing import Optional

# Hype keywords for scoring
HYPE_KEYWORDS = {
    "high": ["moon", "squeeze", "yolo", "tendies", "apes", "diamond hands", "wsb", "short squeeze", "gamma squeeze"],
    "medium": ["buy", "hold", "bullish", "calls", "options", "going up", "to the moon"],
    "bearish": ["sell", "dump", "crash", "short", "puts", "bearish", "going down", "overvalued"],
}

COORDINATION_KEYWORDS = [
    "together", "we hold", "don't sell", "hold the line", "apes together",
    "buy more", "keep buying", "hold strong", "we are all"
]
MEME_KEYWORDS = ["stonks", "tendies", "yolo", "hodl", "gme go brrr", "apes"]


class NLPPipeline:
    def __init__(self):
        self.model = None
        self.model_version = "keyword-heuristic-v1"
        self._try_load_finbert()

    def _try_load_finbert(self):
        try:
            from transformers import pipeline
            self.model = pipeline(
                "text-classification",
                model="ProsusAI/finbert",
                return_all_scores=True,
                device=-1
            )
            self.model_version = "finbert-v1"
            print("FinBERT loaded successfully")
        except Exception as e:
            print(f"FinBERT not available, using keyword heuristics: {e}")
            self.model = None

    def _keyword_stance(self, text: str) -> tuple:
        text_lower = text.lower()
        bullish_count = sum(1 for kw in HYPE_KEYWORDS["medium"] if kw in text_lower)
        bearish_count = sum(1 for kw in HYPE_KEYWORDS["bearish"] if kw in text_lower)
        if bullish_count > bearish_count:
            conf = min(0.5 + bullish_count * 0.1, 0.95)
            return "bullish", conf
        elif bearish_count > bullish_count:
            conf = min(0.5 + bearish_count * 0.1, 0.95)
            return "bearish", conf
        return "neutral", 0.6

    def _compute_hype_score(self, text: str) -> float:
        text_lower = text.lower()
        score = 0.0
        for kw in HYPE_KEYWORDS["high"]:
            if kw in text_lower:
                score += 0.2
        for kw in HYPE_KEYWORDS["medium"]:
            if kw in text_lower:
                score += 0.05
        caps_ratio = sum(1 for c in text if c.isupper()) / max(len(text), 1)
        exclamation_count = text.count("!")
        score += caps_ratio * 0.3
        score += min(exclamation_count * 0.05, 0.2)
        return min(score, 1.0)

    def _detect_post_type(self, text: str) -> str:
        text_lower = text.lower()
        if any(kw in text_lower for kw in COORDINATION_KEYWORDS):
            return "coordination"
        if any(kw in text_lower for kw in MEME_KEYWORDS):
            return "meme"
        if any(kw in text_lower for kw in [
            "reported", "according to", "news", "announced", "sec", "filing", "press release"
        ]):
            return "news"
        return "opinion"

    def _detect_action_cue(self, text: str) -> str:
        text_lower = text.lower()
        if any(kw in text_lower for kw in ["buy", "buying", "load up", "get in", "purchase"]):
            return "buy"
        if any(kw in text_lower for kw in ["hold", "holding", "diamond hands", "don't sell", "hodl"]):
            return "hold"
        if any(kw in text_lower for kw in ["squeeze", "short squeeze", "gamma squeeze"]):
            return "squeeze-call"
        if any(kw in text_lower for kw in ["sell", "exit", "take profit", "dump", "bail"]):
            return "exit"
        return "none"

    def analyze_post(self, text: str) -> dict:
        if len(text) > 512:
            text = text[:512]

        hype_score = self._compute_hype_score(text)
        post_type = self._detect_post_type(text)
        action_cue = self._detect_action_cue(text)

        if self.model:
            try:
                results = self.model(text)[0]
                scores = {r["label"].lower(): r["score"] for r in results}
                if scores.get("positive", 0) > scores.get("negative", 0):
                    stance = "bullish"
                    confidence = scores["positive"]
                elif scores.get("negative", 0) > scores.get("positive", 0):
                    stance = "bearish"
                    confidence = scores["negative"]
                else:
                    stance = "neutral"
                    confidence = scores.get("neutral", 0.6)
                hype_score = min(hype_score + (1 - confidence) * 0.2, 1.0)
            except Exception:
                stance, confidence = self._keyword_stance(text)
        else:
            stance, confidence = self._keyword_stance(text)

        return {
            "stance": stance,
            "hype_score": round(hype_score, 4),
            "post_type": post_type,
            "action_cue": action_cue,
            "confidence": round(confidence, 4),
            "model_version": self.model_version,
        }

    def process_pending_posts(self, db_session, batch_size: int = 100):
        from database.models import Post, NLPResult
        from sqlalchemy import not_, exists

        pending = db_session.query(Post).filter(
            ~exists().where(NLPResult.post_id == Post.post_id)
        ).limit(batch_size).all()

        processed = 0
        for post in pending:
            try:
                result = self.analyze_post(post.content)
                nlp = NLPResult(
                    post_id=post.post_id,
                    **result
                )
                db_session.add(nlp)
                processed += 1
            except Exception as e:
                print(f"Error processing post {post.post_id}: {e}")

        db_session.commit()
        return processed


# Singleton
_pipeline = None


def get_nlp_pipeline() -> NLPPipeline:
    global _pipeline
    if _pipeline is None:
        _pipeline = NLPPipeline()
    return _pipeline
