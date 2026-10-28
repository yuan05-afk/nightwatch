"""Class-conditional (Mondrian) split conformal prediction and the verdict rule.

Score for class k on a flow: s_k = 1 - p_k. On calibration flows whose true class
is k, q_k is the ceil((n_k + 1)(1 - alpha)) / n_k empirical quantile of s_true.
The prediction set is {k : 1 - p_k <= q_k}. Per-class thresholds give each class
its own coverage guarantee, so rare attack classes are not drowned out by benign.
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import numpy as np

KNOWN, UNKNOWN, SUPPRESSED = "known", "unknown", "suppressed"


def conformal_quantile(scores: np.ndarray, alpha: float) -> float:
    n = len(scores)
    if n == 0:
        return math.inf
    rank = math.ceil((n + 1) * (1 - alpha))
    if rank > n:
        return math.inf
    return float(np.sort(scores)[rank - 1])


@dataclass
class MondrianConformal:
    alpha: float
    thresholds: np.ndarray  # q_k per class
    fallback_used: list[bool]

    @classmethod
    def fit(
        cls,
        proba_cal: np.ndarray,
        y_cal: np.ndarray,
        alpha: float = 0.05,
        benign_index: int = 0,
        min_n: int = 30,
        alpha_benign: float | None = None,
    ) -> "MondrianConformal":
        """alpha_benign: a stricter miscoverage for the benign class. Each benign flow left
        out of its own set becomes an Unknown alert, so this sets the false-alert budget."""
        n_classes = proba_cal.shape[1]
        true_scores = 1.0 - proba_cal[np.arange(len(y_cal)), y_cal]
        attack = y_cal != benign_index
        pooled_attack_q = conformal_quantile(true_scores[attack], alpha)
        q = np.empty(n_classes)
        fallback = []
        for k in range(n_classes):
            s = true_scores[y_cal == k]
            a = alpha_benign if (k == benign_index and alpha_benign is not None) else alpha
            if len(s) >= min_n:
                q[k] = conformal_quantile(s, a)
                fallback.append(False)
            else:
                q[k] = pooled_attack_q if k != benign_index else conformal_quantile(s, a)
                fallback.append(True)
        q = np.minimum(q, 1.0)  # a threshold of 1 already admits every class
        return cls(alpha=alpha, thresholds=q, fallback_used=fallback)

    def predict_sets(self, proba: np.ndarray) -> np.ndarray:
        """Boolean matrix [n, n_classes]: True where the class is in the set."""
        return (1.0 - proba) <= self.thresholds[None, :]


def verdicts(
    sets: np.ndarray,
    proba: np.ndarray,
    anomaly: np.ndarray,
    anomaly_threshold: float,
    benign_index: int = 0,
) -> tuple[np.ndarray, np.ndarray]:
    """Return (verdict, predicted_class) per flow.

    known      exactly one class in the set and it is an attack
    suppressed set is exactly {benign} and the flow is not anomalous
    unknown    everything else: empty set, ambiguous set, or benign-looking but anomalous
    predicted_class is the arg-max class, reported for context on every verdict.
    """
    size = sets.sum(axis=1)
    only_benign = (size == 1) & sets[:, benign_index]
    single_attack = (size == 1) & ~sets[:, benign_index]
    anomalous = anomaly >= anomaly_threshold

    out = np.full(len(sets), UNKNOWN, dtype=object)
    out[single_attack] = KNOWN
    out[only_benign & ~anomalous] = SUPPRESSED
    return out, proba.argmax(axis=1)


def coverage(sets: np.ndarray, y: np.ndarray) -> float:
    return float(sets[np.arange(len(y)), y].mean())
