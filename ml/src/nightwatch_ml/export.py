"""Export the trained layers to compact JSON for the TypeScript scorer, plus a parity
sample of real test flows with Python's exact outputs (probabilities, anomaly scores,
and LightGBM's own TreeSHAP contributions) so the TS port can be checked to 1e-6."""

from __future__ import annotations

import json
from pathlib import Path

import joblib
import numpy as np

from . import data
from .split import TEST, cap_benign_train, chronological_within_campaign

OUT = data.ML_ROOT / "data" / "out"
WEB_MODEL = data.ML_ROOT.parent / "web" / "lib" / "scoring" / "model"


def _flatten_lgbm_tree(root: dict) -> dict:
    """Breadth-first flatten. Leaves have feature -1. Cover = training data count."""
    feature, threshold, left, right, value, cover = [], [], [], [], [], []
    queue = [root]
    nodes = []
    while queue:
        node = queue.pop(0)
        nodes.append(node)
        if "split_index" in node:
            queue.extend([node["left_child"], node["right_child"]])
    index = {id(n): i for i, n in enumerate(nodes)}
    for n in nodes:
        if "split_index" in n:
            if n.get("decision_type", "<=") != "<=":
                raise ValueError("only numerical <= splits are supported")
            if n.get("missing_type", "None") not in ("None",):
                raise ValueError(f"unexpected missing_type {n.get('missing_type')}; inputs must be NaN-free")
            feature.append(n["split_feature"])
            threshold.append(n["threshold"])
            left.append(index[id(n["left_child"])])
            right.append(index[id(n["right_child"])])
            value.append(n["internal_value"])
            cover.append(n["internal_count"])
        else:
            feature.append(-1)
            threshold.append(0.0)
            left.append(-1)
            right.append(-1)
            value.append(n["leaf_value"])
            cover.append(n["leaf_count"])
    return {"f": feature, "t": threshold, "l": left, "r": right, "v": value, "c": cover}


def _avg_path_length(n: np.ndarray) -> np.ndarray:
    """sklearn's c(n): expected path length of an unsuccessful BST search."""
    n = np.asarray(n, dtype=np.float64)
    out = np.zeros_like(n)
    out[n == 2] = 1.0
    big = n > 2
    out[big] = 2.0 * (np.log(n[big] - 1.0) + np.euler_gamma) - 2.0 * (n[big] - 1.0) / n[big]
    return out


def _flatten_iforest_tree(est) -> dict:
    t = est.tree_
    left, right = t.children_left, t.children_right
    depth = np.zeros(t.node_count)
    stack = [0]
    while stack:
        i = stack.pop()
        if left[i] != -1:
            depth[left[i]] = depth[right[i]] = depth[i] + 1
            stack.extend([left[i], right[i]])
    leaf = left == -1
    # value at a leaf = depth + c(samples at leaf), exactly what sklearn averages
    leaf_value = np.where(leaf, depth + _avg_path_length(t.n_node_samples), 0.0)
    return {
        "f": [int(x) if not lf else -1 for x, lf in zip(t.feature, leaf)],
        "t": [float(x) for x in t.threshold],
        "l": [int(x) for x in left],
        "r": [int(x) for x in right],
        "v": [float(x) for x in leaf_value],
    }


def export() -> None:
    bundle = joblib.load(OUT / "final.joblib")
    det, cp, an = bundle["det"], bundle["cp"], bundle["an"]
    booster = det.model.booster_
    dump = booster.dump_model()
    n_class = dump["num_class"]
    trees = [_flatten_lgbm_tree(t["tree_structure"]) for t in dump["tree_info"]]

    forest = an.forest
    iforest = {
        "trees": [_flatten_iforest_tree(e) for e in forest.estimators_],
        "features": [list(map(int, f)) for f in forest.estimators_features_],
        "max_samples": int(forest.max_samples_),
        "c_max_samples": float(_avg_path_length(np.array([forest.max_samples_]))[0]),
        "offset": float(forest.offset_),
        "threshold": float(an.threshold),
    }

    model = {
        "version": "nightwatch-1",
        "strategy": bundle["strategy"],
        "classes": det.classes,
        "features": det.features,
        "num_class": n_class,
        "lgbm": {"trees": trees},
        "conformal": {"alpha": cp.alpha, "thresholds": [float(x) for x in cp.thresholds]},
        "iforest": iforest,
    }
    WEB_MODEL.mkdir(parents=True, exist_ok=True)
    (WEB_MODEL / "model.json").write_text(json.dumps(model, separators=(",", ":")), encoding="utf-8")
    print(f"model.json: {len(trees)} trees, {(WEB_MODEL / 'model.json').stat().st_size / 1e6:.1f} MB")

    # parity sample: real held-out flows, stratified so rare classes appear
    df = data.load()
    split = cap_benign_train(df, chronological_within_campaign(df), 300_000)
    te = df[(split == TEST).to_numpy()]
    rng = np.random.default_rng(11)
    picks = []
    for lab, g in te.groupby("label"):
        k = 600 if lab == data.BENIGN else 30
        picks.append(g.iloc[rng.choice(len(g), min(k, len(g)), replace=False)])
    sample = __import__("pandas").concat(picks).iloc[:1000]
    X = sample[det.features].to_numpy(dtype=np.float32)
    proba = det.model.predict_proba(X)
    raw = booster.predict(X, raw_score=True)
    contrib = booster.predict(X, pred_contrib=True).reshape(len(X), n_class, len(det.features) + 1)
    top = proba.argmax(axis=1)  # the app explains the predicted class only
    anomaly = an.score(X)
    parity = {
        "X": X.tolist(),
        "raw": raw.tolist(),
        "proba": proba.tolist(),
        "top": top.tolist(),
        "contrib_top": contrib[np.arange(len(X)), top].tolist(),  # last entry = expected value
        "anomaly": anomaly.tolist(),
    }
    (WEB_MODEL / "parity.json").write_text(json.dumps(parity, separators=(",", ":")), encoding="utf-8")
    print(f"parity.json: {len(X)} flows")


if __name__ == "__main__":
    export()
