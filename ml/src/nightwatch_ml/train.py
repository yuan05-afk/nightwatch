"""Detector training: LightGBM multiclass with an imbalance-handling strategy."""

from __future__ import annotations

from dataclasses import dataclass

import lightgbm as lgb
import numpy as np
import pandas as pd
from imblearn.over_sampling import SMOTE
from sklearn.utils.class_weight import compute_sample_weight

from .data import BENIGN

STRATEGIES = ("none", "balanced", "smote")

LGBM_PARAMS = dict(
    objective="multiclass",
    n_estimators=150,
    learning_rate=0.1,
    num_leaves=31,
    min_child_samples=10,
    feature_fraction=0.8,
    bagging_fraction=0.8,
    bagging_freq=1,
    reg_lambda=1.0,
    n_jobs=-1,
    verbose=-1,
    random_state=7,
)


@dataclass
class Detector:
    model: lgb.LGBMClassifier
    classes: list[str]  # index 0 is always BENIGN
    features: list[str]

    def proba(self, X: pd.DataFrame | np.ndarray) -> np.ndarray:
        return self.model.predict_proba(np.asarray(X, dtype=np.float32))


def class_order(labels: pd.Series) -> list[str]:
    rest = sorted(set(labels) - {BENIGN})
    return [BENIGN, *rest]


def _damped_balanced_weights(y: np.ndarray) -> np.ndarray:
    """sklearn 'balanced' weights, square-rooted so a 10-flow class doesn't get a
    100,000x weight that makes the trees memorise it."""
    return np.sqrt(compute_sample_weight("balanced", y))


def fit(
    X: pd.DataFrame,
    y_labels: pd.Series,
    strategy: str = "balanced",
    classes: list[str] | None = None,
    smote_target: int = 5000,
    seed: int = 7,
) -> Detector:
    if strategy not in STRATEGIES:
        raise ValueError(f"strategy must be one of {STRATEGIES}")
    classes = classes or class_order(y_labels)
    index = {c: i for i, c in enumerate(classes)}
    y = y_labels.map(index).to_numpy()
    Xn = X.to_numpy(dtype=np.float32)
    weights = None

    if strategy == "balanced":
        weights = _damped_balanced_weights(y)
    elif strategy == "smote":
        counts = np.bincount(y, minlength=len(classes))
        targets = {
            k: max(int(n), smote_target)
            for k, n in enumerate(counts)
            if 0 < n < smote_target and k != 0
        }
        if targets:
            k_neighbors = max(1, min(5, int(min(counts[k] for k in targets)) - 1))
            Xn, y = SMOTE(sampling_strategy=targets, k_neighbors=k_neighbors, random_state=seed).fit_resample(Xn, y)

    model = lgb.LGBMClassifier(**LGBM_PARAMS, num_class=len(classes))
    model.fit(Xn, y, sample_weight=weights)
    return Detector(model=model, classes=classes, features=list(X.columns))
