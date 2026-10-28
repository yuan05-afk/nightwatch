"""End-to-end experiments. `uv run python -m nightwatch_ml.pipeline [stage ...]`

Every number on the site and in the deck comes from reports/*.json written here.
"""

from __future__ import annotations

import json
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd

from . import data
from .conformal import MondrianConformal, coverage, verdicts
from .evaluate import base_rate_table, summary, verdict_summary
from .openset import fit_anomaly
from .split import CAL, TEST, TRAIN, cap_benign_train, chronological_within_campaign, leave_family_out, random_stratified
from .train import STRATEGIES, class_order, fit

REPORTS = data.ML_ROOT / "reports"
BENIGN_TRAIN_CAP = 300_000
ALPHA = 0.05
# Policy, fixed before looking at test: benign flows may become Unknown at most ~0.2% of the time.
ALPHA_BENIGN = 0.002
ALPHA_BENIGN_SWEEP = (0.05, 0.02, 0.01, 0.005, 0.002, 0.001, 0.0005)
ANOMALY_BENIGN_RATE = 0.002


def _write(name: str, obj: dict) -> None:
    REPORTS.mkdir(parents=True, exist_ok=True)
    (REPORTS / f"{name}.json").write_text(json.dumps(obj, indent=2, default=float), encoding="utf-8")
    print(f"  wrote reports/{name}.json")


def _encode(labels: pd.Series, classes: list[str]) -> np.ndarray:
    index = {c: i for i, c in enumerate(classes)}
    return labels.map(index).to_numpy()


class Ctx:
    def __init__(self) -> None:
        t = time.time()
        self.df = data.load()
        self.feats = data.feature_columns(self.df)
        self.classes = class_order(self.df["label"])
        self.chrono = cap_benign_train(self.df, chronological_within_campaign(self.df), BENIGN_TRAIN_CAP)
        print(f"loaded {len(self.df):,} flows, {len(self.feats)} features, {len(self.classes)} classes in {time.time() - t:.0f}s")

    def part(self, split: pd.Series, name: str) -> pd.DataFrame:
        return self.df[(split == name).to_numpy()]


def stage_ablation(ctx: Ctx) -> str:
    """Pick the imbalance strategy on CALIBRATION macro-F1 (never on test: Arp P3)."""
    tr, ca = ctx.part(ctx.chrono, TRAIN), ctx.part(ctx.chrono, CAL)
    te = ctx.part(ctx.chrono, TEST)
    y_ca, y_te = _encode(ca["label"], ctx.classes), _encode(te["label"], ctx.classes)
    rows = []
    for s in STRATEGIES:
        t = time.time()
        det = fit(tr[ctx.feats], tr["label"], strategy=s, classes=ctx.classes)
        cal_m = summary(y_ca, det.proba(ca[ctx.feats]), ctx.classes)
        test_m = summary(y_te, det.proba(te[ctx.feats]), ctx.classes)
        rows.append({"strategy": s, "fit_seconds": round(time.time() - t, 1), "calibration": cal_m, "test": test_m})
        print(f"  {s:9s} cal macroF1(attacks)={cal_m['macro_f1_attacks']:.4f} test={test_m['macro_f1_attacks']:.4f}")
    chosen = max(rows, key=lambda r: r["calibration"]["macro_f1_attacks"])["strategy"]
    _write("ablation", {"selection_rule": "max calibration macro-F1 over attack classes", "chosen": chosen, "rows": rows})
    return chosen


def _doubt_pipeline(ctx: Ctx, split: pd.Series, strategy: str, classes: list[str]):
    tr, ca, te = (ctx.part(split, k) for k in (TRAIN, CAL, TEST))
    det = fit(tr[ctx.feats], tr["label"], strategy=strategy, classes=classes)
    y_ca = _encode(ca["label"], classes)
    p_ca = det.proba(ca[ctx.feats])
    cp = MondrianConformal.fit(p_ca, y_ca, alpha=ALPHA, alpha_benign=ALPHA_BENIGN)
    an = fit_anomaly(
        tr.loc[tr["label"] == data.BENIGN, ctx.feats].to_numpy(),
        ca.loc[ca["label"] == data.BENIGN, ctx.feats].to_numpy(),
        benign_rate=ANOMALY_BENIGN_RATE,
    )
    return det, cp, an, te, (p_ca, y_ca)


def stage_final(ctx: Ctx, strategy: str) -> None:
    det, cp, an, te, (p_ca, y_ca) = _doubt_pipeline(ctx, ctx.chrono, strategy, ctx.classes)
    y = _encode(te["label"], ctx.classes)
    t = time.perf_counter()
    p = det.proba(te[ctx.feats])
    a = an.score(te[ctx.feats].to_numpy())
    sets = cp.predict_sets(p)
    v, pred = verdicts(sets, p, a, an.threshold)
    us_per_flow = (time.perf_counter() - t) / len(te) * 1e6
    vs = verdict_summary(y, v, pred, ctx.classes)
    cov = {c: coverage(sets[y == k], y[y == k]) for k, c in enumerate(ctx.classes) if (y == k).any()}
    _write("final", {
        "strategy": strategy,
        "alpha": ALPHA,
        "alpha_benign": ALPHA_BENIGN,
        "anomaly_benign_rate": ANOMALY_BENIGN_RATE,
        "classifier": summary(y, p, ctx.classes),
        "verdicts": vs,
        "conformal_coverage": cov,
        "conformal_thresholds": dict(zip(ctx.classes, map(float, cp.thresholds))),
        "conformal_fallback": dict(zip(ctx.classes, cp.fallback_used)),
        "mean_set_size": float(sets.sum(1).mean()),
        "python_batch_latency_us_per_flow": us_per_flow,
        "base_rate": base_rate_table(vs["benign_alert_rate"]),
    })
    # Sensitivity of the benign false-alert budget (evaluation only; ALPHA_BENIGN is fixed above).
    curve = []
    for ab in ALPHA_BENIGN_SWEEP:
        cp_s = MondrianConformal.fit(p_ca, y_ca, alpha=ALPHA, alpha_benign=ab)
        v_s, pred_s = verdicts(cp_s.predict_sets(p), p, a, an.threshold)
        m = verdict_summary(y, v_s, pred_s, ctx.classes)
        curve.append({"alpha_benign": ab, **{k: m[k] for k in ("benign_alert_rate", "attack_flagged", "attack_known_correct", "attack_unknown", "attack_missed")}})
        print(f"  alpha_benign={ab:<7} benign_alert={m['benign_alert_rate']:.4f} attack_missed={m['attack_missed']:.5f} known_correct={m['attack_known_correct']:.4f}")
    _write("operating_curve", {"chosen_alpha_benign": ALPHA_BENIGN, "alpha_attacks": ALPHA, "rows": curve})

    import joblib  # local: only needed when persisting

    out = data.ML_ROOT / "data" / "out"
    out.mkdir(parents=True, exist_ok=True)
    joblib.dump({"det": det, "cp": cp, "an": an, "strategy": strategy}, out / "final.joblib")


def stage_illusion(ctx: Ctx, strategy: str) -> None:
    rows = []
    for name, split in (("random", random_stratified(ctx.df)), ("chronological", ctx.chrono)):
        split = cap_benign_train(ctx.df, split, BENIGN_TRAIN_CAP)
        tr, te = ctx.part(split, TRAIN), ctx.part(split, TEST)
        det = fit(tr[ctx.feats], tr["label"], strategy=strategy, classes=ctx.classes)
        m = summary(_encode(te["label"], ctx.classes), det.proba(te[ctx.feats]), ctx.classes)
        rows.append({"split": name, **{k: m[k] for k in ("accuracy", "macro_f1", "macro_f1_attacks", "benign_fpr", "attack_recall_any")}})
        print(f"  {name:13s} acc={m['accuracy']:.4f} macroF1(attacks)={m['macro_f1_attacks']:.4f}")
    _write("illusion", {"strategy": strategy, "rows": rows})


def stage_zero_day(ctx: Ctx, strategy: str) -> None:
    families = [f for f in ctx.df["family"].unique() if f != "Benign"]
    rows = []
    for fam in sorted(families):
        t = time.time()
        split = leave_family_out(ctx.df, fam, ctx.chrono)
        held = ctx.df["family"] == fam
        classes = class_order(ctx.df.loc[~held, "label"])
        det, cp, an, te, _ = _doubt_pipeline(ctx, split, strategy, classes)
        te_fam = te[te["family"] == fam]
        te_ben = te[te["label"] == data.BENIGN]
        def run(frame):
            p = det.proba(frame[ctx.feats])
            v, _ = verdicts(cp.predict_sets(p), p, an.score(frame[ctx.feats].to_numpy()), an.threshold)
            return v
        v_fam, v_ben = run(te_fam), run(te_ben)
        row = {
            "held_out_family": fam,
            "n": int(len(te_fam)),
            "flagged_known_other": float((v_fam == "known").mean()),
            "flagged_unknown": float((v_fam == "unknown").mean()),
            "missed_as_benign": float((v_fam == "suppressed").mean()),
            "benign_alert_rate": float((v_ben != "suppressed").mean()),
            "seconds": round(time.time() - t, 1),
        }
        rows.append(row)
        print(f"  {fam:14s} n={row['n']:>7,} unknown={row['flagged_unknown']:.3f} known-other={row['flagged_known_other']:.3f} missed={row['missed_as_benign']:.3f}")
    _write("zero_day", {"strategy": strategy, "alpha": ALPHA, "rows": rows})


def main(stages: list[str]) -> None:
    ctx = Ctx()
    strategy = None
    if "ablation" in stages or not (REPORTS / "ablation.json").exists():
        strategy = stage_ablation(ctx)
    strategy = strategy or json.loads((REPORTS / "ablation.json").read_text())["chosen"]
    print(f"strategy: {strategy}")
    if "final" in stages:
        stage_final(ctx, strategy)
    if "illusion" in stages:
        stage_illusion(ctx, strategy)
    if "zero_day" in stages:
        stage_zero_day(ctx, strategy)


if __name__ == "__main__":
    main(sys.argv[1:] or ["ablation", "final", "illusion", "zero_day"])
