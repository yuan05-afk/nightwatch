"""Benign-only Isolation Forest: the second signal for 'this looks like nothing we know'."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
from sklearn.ensemble import IsolationForest


@dataclass
class AnomalyLayer:
    forest: IsolationForest
    threshold: float  # anomaly score at the chosen benign false-alarm rate
    benign_rate: float

    def score(self, X: np.ndarray) -> np.ndarray:
        """Higher = more anomalous (negated sklearn score_samples, in (0, 1])."""
        return -self.forest.score_samples(np.asarray(X, dtype=np.float32))


def fit_anomaly(
    X_benign_train: np.ndarray,
    X_benign_cal: np.ndarray,
    benign_rate: float = 0.002,
    n_estimators: int = 100,
    max_samples: int = 256,
    fit_cap: int = 200_000,
    seed: int = 7,
) -> AnomalyLayer:
    rng = np.random.default_rng(seed)
    Xt = np.asarray(X_benign_train, dtype=np.float32)
    if len(Xt) > fit_cap:
        Xt = Xt[rng.choice(len(Xt), fit_cap, replace=False)]
    forest = IsolationForest(
        n_estimators=n_estimators, max_samples=max_samples, random_state=seed, n_jobs=-1
    ).fit(Xt)
    layer = AnomalyLayer(forest=forest, threshold=np.inf, benign_rate=benign_rate)
    cal_scores = layer.score(X_benign_cal)
    layer.threshold = float(np.quantile(cal_scores, 1 - benign_rate))
    return layer
