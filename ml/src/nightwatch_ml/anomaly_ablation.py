"""Ablation: Isolation Forest on raw vs signed-log features, at the same benign budget.

Isolation Forest draws split points uniformly between a feature's min and max. Flow
features are heavy-tailed (bytes/s spans ~9 orders of magnitude), so on raw values most
random splits land in empty space. A signed log1p transform is the standard remedy; this
script measures whether it helps, and both results are reported either way.

For each held-out family the forest is fit on benign TRAIN flows only (as in the
pipeline) and thresholded on benign CAL flows; the family's flows were never used.
"""

from __future__ import annotations

import json

import numpy as np

from . import data
from .openset import fit_anomaly
from .pipeline import ANOMALY_BENIGN_RATE, BENIGN_TRAIN_CAP, REPORTS
from .split import CAL, TEST, TRAIN, cap_benign_train, chronological_within_campaign


def signed_log(X: np.ndarray) -> np.ndarray:
    return np.sign(X) * np.log1p(np.abs(X))


def main() -> None:
    df = data.load()
    feats = data.feature_columns(df)
    split = cap_benign_train(df, chronological_within_campaign(df), BENIGN_TRAIN_CAP)
    ben = (df["label"] == data.BENIGN).to_numpy()
    Xtr = df.loc[ben & (split == TRAIN).to_numpy(), feats].to_numpy(np.float32)
    Xca = df.loc[ben & (split == CAL).to_numpy(), feats].to_numpy(np.float32)
    Xte_b = df.loc[ben & (split == TEST).to_numpy(), feats].to_numpy(np.float32)

    rows = []
    for name, f in (("raw", lambda a: a), ("signed_log", signed_log)):
        layer = fit_anomaly(f(Xtr), f(Xca), benign_rate=ANOMALY_BENIGN_RATE)
        benign_rate_test = float((layer.score(f(Xte_b)) >= layer.threshold).mean())
        per_family = {}
        for fam, g in df[~ben].groupby("family"):
            per_family[fam] = float((layer.score(f(g[feats].to_numpy(np.float32))) >= layer.threshold).mean())
        rows.append({"transform": name, "benign_flag_rate_test": benign_rate_test, "family_flag_rate": per_family})
        print(name, f"benign_test={benign_rate_test:.4f}", {k: round(v, 3) for k, v in per_family.items()})
    REPORTS.mkdir(exist_ok=True)
    (REPORTS / "anomaly_ablation.json").write_text(json.dumps({"benign_budget": ANOMALY_BENIGN_RATE, "rows": rows}, indent=2))


if __name__ == "__main__":
    main()
