from typing import Optional

RISK_LABELS = {
    (0, 3): "Normal",
    (3, 5): "HeatingUp",
    (5, 7): "SqueezeRisk",
    (7, 15): "ReversalRisk",
}

LABEL_COLORS = {
    "Normal": "green",
    "HeatingUp": "yellow",
    "SqueezeRisk": "orange",
    "ReversalRisk": "red",
}


class RiskEngine:
    def compute_rule_score(self, features: dict) -> dict:
        score = 0.0
        drivers = []

        mgr = features.get("mention_growth_rate", 0)
        if mgr > 3.0:
            score += 2
            drivers.append({"factor": "Social mention surge", "points": 2, "value": f"{mgr:.1f}x"})
        elif mgr > 1.5:
            score += 1
            drivers.append({"factor": "Social mentions rising", "points": 1, "value": f"{mgr:.1f}x"})

        hype = features.get("avg_hype_score", 0)
        if hype > 0.75:
            score += 2
            drivers.append({"factor": "High avg hype score", "points": 2, "value": f"{hype:.2f}"})
        elif hype > 0.5:
            score += 1
            drivers.append({"factor": "Moderate-high hype score", "points": 1, "value": f"{hype:.2f}"})

        br = features.get("bullish_ratio", 0)
        if br > 0.70:
            score += 1
            drivers.append({"factor": "Bullish sentiment dominant", "points": 1, "value": f"{br*100:.0f}%"})

        avs = features.get("abnormal_volume_score", 0)
        if avs > 2.0:
            score += 2
            drivers.append({"factor": "Abnormal trading volume", "points": 2, "value": f"{avs:.1f}σ"})
        elif avs > 1.0:
            score += 1
            drivers.append({"factor": "Above-average volume", "points": 1, "value": f"{avs:.1f}σ"})

        vs = features.get("volatility_score", 0)
        if vs > 2.0:
            score += 2
            drivers.append({"factor": "Extreme price volatility", "points": 2, "value": f"{vs:.1f}σ"})
        elif vs > 1.0:
            score += 1
            drivers.append({"factor": "Elevated volatility", "points": 1, "value": f"{vs:.1f}σ"})

        cr = features.get("coordination_ratio", 0)
        if cr > 0.15:
            score += 1
            drivers.append({"factor": "High coordination ratio", "points": 1, "value": f"{cr*100:.0f}%"})

        ipc = features.get("influencer_post_count", 0)
        if ipc > 5:
            score += 1
            drivers.append({"factor": "Heavy influencer activity", "points": 1, "value": f"{ipc} posts"})

        label = "Normal"
        for (low, high), lbl in RISK_LABELS.items():
            if low <= score < high:
                label = lbl
                break
        if score >= 7:
            label = "ReversalRisk"

        return {"rule_score": score, "final_score": score, "label": label, "drivers": drivers}

    def evaluate_scenario(
        self,
        mention_growth: float,
        bullish_ratio: float,
        hype_score: float,
        short_interest: float,
        influencer_posts: int,
        trading_restricted: bool,
        options_activity_high: bool,
    ) -> dict:
        features = {
            "mention_growth_rate": mention_growth,
            "bullish_ratio": bullish_ratio,
            "avg_hype_score": hype_score,
            "abnormal_volume_score": short_interest * 5,
            "volatility_score": mention_growth * 0.5,
            "coordination_ratio": 0.1 if mention_growth > 2 else 0.05,
            "influencer_post_count": influencer_posts,
        }

        result = self.compute_rule_score(features)

        # Bonus for special conditions
        bonus = 0
        if trading_restricted:
            bonus += 1
            result["drivers"].append({
                "factor": "Trading restrictions activated (amplifying effect)",
                "points": 1,
                "value": "Active"
            })
        if options_activity_high:
            bonus += 1
            result["drivers"].append({
                "factor": "Abnormal options activity",
                "points": 1,
                "value": "High"
            })
        if short_interest > 0.5:
            bonus += 1
            result["drivers"].append({
                "factor": "High short interest",
                "points": 1,
                "value": f"{short_interest*100:.0f}%"
            })

        final = result["rule_score"] + bonus
        result["final_score"] = final

        label = "Normal"
        for (low, high), lbl in RISK_LABELS.items():
            if low <= final < high:
                label = lbl
                break
        if final >= 7:
            label = "ReversalRisk"
        result["label"] = label

        # Build explanation
        explanations = {
            "Normal": "Current social and market signals are within normal range. No significant anomalous trading behavior detected.",
            "HeatingUp": "Social activity is starting to heat up. Mentions and bullish sentiment are rising — continued monitoring recommended.",
            "SqueezeRisk": "WARNING: Social-driven squeeze risk elevated! Social mentions surging, hype scores high, and abnormal volume detected. Extreme short-term price swings possible.",
            "ReversalRisk": "CRITICAL RISK: Multiple indicators simultaneously at historic highs, closely resembling the GameStop January 2021 event. Extreme volatility followed by high-probability price reversal.",
        }
        result["explanation"] = explanations.get(label, "")

        return result
