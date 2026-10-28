"""Offline triage simulation on the held-out test split, one shift per day.

Alerts (known/unknown verdicts) are grouped into incidents with the same key and rank
formula as web/lib/triage.ts. For a review budget of N incidents we count how many
incidents containing real attack traffic each ordering reaches: Nightwatch rank,
arrival order (FIFO) and classifier confidence alone.
"""

from __future__ import annotations

import json
import math

import joblib
import numpy as np
import pandas as pd

from . import data
from .conformal import verdicts
from .pipeline import REPORTS
from .split import TEST, chronological_within_campaign

FAMILY = data.FAMILY
SEVERITY = {
    "Infiltration": 1.0, "Heartbleed": 1.0, "Botnet": 0.95, "Web Injection": 0.9, "Unknown": 0.85,
    "Brute Force": 0.8, "DDoS": 0.75, "DoS": 0.7, "PortScan": 0.5, "Benign": 0.3,
}
BUDGETS = (5, 10, 20, 40)


def rank_score(verdict: str, predicted: str, max_p: float, max_a: float, n: int) -> float:
    fam = "Unknown" if verdict == "unknown" else FAMILY.get(predicted, "Unknown")
    conf = 0.55 + 0.45 * min(1.0, max_a) if verdict == "unknown" else max_p
    return SEVERITY.get(fam, 0.6) * conf * (1 + math.log10(max(1, n)))


def main() -> None:
    bundle = joblib.load(data.ML_ROOT / "data" / "out" / "final.joblib")
    det, cp, an = bundle["det"], bundle["cp"], bundle["an"]
    df = data.load()
    te = df[(chronological_within_campaign(df) == TEST).to_numpy()].copy()
    X = te[det.features].to_numpy(np.float32)
    p = det.proba(X)
    v, pred = verdicts(cp.predict_sets(p), p, an.score(X), an.threshold)
    te["verdict"], te["predicted"] = v, np.array(det.classes)[pred]
    te["p"], te["a"] = p.max(axis=1), an.score(X)
    alerts = te[te["verdict"] != "suppressed"].copy()
    alerts["fam"] = np.where(alerts["verdict"] == "unknown", "Unknown", alerts["predicted"].map(FAMILY))
    alerts["key"] = alerts["fam"] + "|" + alerts["src_ip"] + ">" + alerts["dst_ip"]

    out = []
    for day, g in alerts.groupby("day", observed=True):
        inc = g.groupby("key").agg(
            verdict=("verdict", "first"), predicted=("predicted", "first"), first_seen=("ts", "min"),
            n=("ts", "size"), max_p=("p", "max"), max_a=("a", "max"),
            attack=("label", lambda s: bool((s != data.BENIGN).any())),
        ).reset_index()
        if inc.empty:
            continue
        inc["rank"] = [rank_score(r.verdict, r.predicted, r.max_p, r.max_a, r.n) for r in inc.itertuples()]
        orders = {
            "nightwatch": inc.sort_values("rank", ascending=False),
            "fifo": inc.sort_values("first_seen"),
            "confidence": inc.sort_values("max_p", ascending=False),
        }
        row = {"day": str(day), "incidents": int(len(inc)), "attack_incidents": int(inc["attack"].sum()),
               "alerts": int(len(g)), "reached": {}}
        for b in BUDGETS:
            row["reached"][str(b)] = {k: int(o.head(b)["attack"].sum()) for k, o in orders.items()}
        out.append(row)
        print(day, row["alerts"], "alerts ->", row["incidents"], "incidents,", row["attack_incidents"], "with attacks;", row["reached"]["10"])
    (REPORTS / "triage.json").write_text(json.dumps({"budgets": BUDGETS, "days": out}, indent=2), encoding="utf-8")


if __name__ == "__main__":
    main()
