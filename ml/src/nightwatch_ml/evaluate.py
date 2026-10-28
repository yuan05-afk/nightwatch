"""Metrics. Accuracy is computed only so the Accuracy Illusion panel can show it."""

from __future__ import annotations

import numpy as np
from sklearn.metrics import average_precision_score, f1_score, precision_recall_fscore_support

from .conformal import KNOWN, SUPPRESSED, UNKNOWN


def per_class(y: np.ndarray, pred: np.ndarray, classes: list[str]) -> list[dict]:
    labels = np.arange(len(classes))
    p, r, f, n = precision_recall_fscore_support(y, pred, labels=labels, zero_division=0)
    return [
        {"class": c, "precision": float(p[i]), "recall": float(r[i]), "f1": float(f[i]), "support": int(n[i])}
        for i, c in enumerate(classes)
        if n[i] > 0
    ]


def summary(y: np.ndarray, proba: np.ndarray, classes: list[str]) -> dict:
    pred = proba.argmax(axis=1)
    present = np.unique(y)
    attack = present[present != 0]
    pr_auc = [
        float(average_precision_score((y == k).astype(int), proba[:, k])) for k in attack
    ]
    benign = y == 0
    return {
        "accuracy": float((pred == y).mean()),
        "macro_f1": float(f1_score(y, pred, labels=present, average="macro", zero_division=0)),
        "macro_f1_attacks": float(f1_score(y, pred, labels=attack, average="macro", zero_division=0)),
        "mean_pr_auc_attacks": float(np.mean(pr_auc)) if pr_auc else None,
        "benign_fpr": float((pred[benign] != 0).mean()) if benign.any() else None,
        "attack_recall_any": float((pred[~benign] != 0).mean()) if (~benign).any() else None,
        "n": int(len(y)),
        "per_class": per_class(y, pred, classes),
    }


def verdict_summary(y: np.ndarray, verdict: np.ndarray, pred: np.ndarray, classes: list[str]) -> dict:
    benign = y == 0
    attack = ~benign
    out = {
        "benign_alert_rate": float((verdict[benign] != SUPPRESSED).mean()) if benign.any() else None,
        "benign_unknown_rate": float((verdict[benign] == UNKNOWN).mean()) if benign.any() else None,
        "attack_flagged": float((verdict[attack] != SUPPRESSED).mean()) if attack.any() else None,
        "attack_known_correct": float(((verdict == KNOWN) & (pred == y))[attack].mean()) if attack.any() else None,
        "attack_unknown": float((verdict[attack] == UNKNOWN).mean()) if attack.any() else None,
        "attack_missed": float((verdict[attack] == SUPPRESSED).mean()) if attack.any() else None,
        "per_class": [],
    }
    for k, c in enumerate(classes):
        m = y == k
        if not m.any():
            continue
        out["per_class"].append({
            "class": c,
            "n": int(m.sum()),
            "known": float((verdict[m] == KNOWN).mean()),
            "unknown": float((verdict[m] == UNKNOWN).mean()),
            "suppressed": float((verdict[m] == SUPPRESSED).mean()),
        })
    return out


def base_rate_table(benign_alert_rate: float, volumes=(100_000, 1_000_000, 10_000_000)) -> list[dict]:
    """Expected false alerts per day from benign traffic alone (Axelsson's base-rate point)."""
    return [{"flows_per_day": v, "false_alerts_per_day": round(v * benign_alert_rate)} for v in volumes]
