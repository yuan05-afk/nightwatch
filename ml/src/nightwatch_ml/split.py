"""Train / calibration / test splits. See docs/METHOD.md for why each exists."""

from __future__ import annotations

import numpy as np
import pandas as pd

from .data import BENIGN

TRAIN, CAL, TEST = "train", "cal", "test"
FRACTIONS = (0.6, 0.2, 0.2)


def _chronological(idx_sorted: np.ndarray, out: np.ndarray) -> None:
    n = len(idx_sorted)
    a = int(round(n * FRACTIONS[0]))
    b = int(round(n * (FRACTIONS[0] + FRACTIONS[1])))
    out[idx_sorted[:a]] = TRAIN
    out[idx_sorted[a:b]] = CAL
    out[idx_sorted[b:]] = TEST


BENIGN_BLOCK_MINUTES = 15
_BLOCK_CYCLE = (TRAIN,) * 6 + (CAL,) * 2 + (TEST,) * 2


def chronological_within_campaign(df: pd.DataFrame) -> pd.Series:
    """Attacks: per class, first 60% of flows by time train, next 20% calibrate, last 20%
    test, so a campaign's later flows never teach its earlier ones.

    Benign: each day is cut into 15-minute blocks assigned train/train/.../cal/cal/test/test
    in a repeating 6:2:2 cycle. Held-out benign traffic therefore spans the whole day, so a
    replay of the test split interleaves attacks with normal traffic the way a real shift
    does (a plain last-20% benign split would put every test attack before any test benign)."""
    out = np.empty(len(df), dtype=object)
    labels = df["label"].to_numpy()
    benign = labels == BENIGN

    order = np.argsort(df["ts"].to_numpy(), kind="stable")
    attack_order = order[~benign[order]]
    attack_labels = labels[attack_order]
    for lab in pd.unique(attack_labels):
        _chronological(attack_order[attack_labels == lab], out)

    ts = df["ts"]
    day_start = ts.groupby(df["day"].astype(str)).transform("min")  # blocks start at the day's first flow
    block = ((ts - day_start).dt.total_seconds() // (BENIGN_BLOCK_MINUTES * 60)).astype("int64").to_numpy()
    cycle = np.array(_BLOCK_CYCLE, dtype=object)
    out[benign] = cycle[block[benign] % len(cycle)]
    return pd.Series(out, index=df.index, name="split")


def random_stratified(df: pd.DataFrame, seed: int = 7) -> pd.Series:
    """Shuffled stratified split. Used only to show how much it inflates results."""
    rng = np.random.default_rng(seed)
    out = np.empty(len(df), dtype=object)
    labels = df["label"].to_numpy()
    for lab in pd.unique(labels):
        idx = np.flatnonzero(labels == lab)
        rng.shuffle(idx)
        _chronological(idx, out)
    return pd.Series(out, index=df.index, name="split")


def leave_family_out(df: pd.DataFrame, family: str, base: pd.Series) -> pd.Series:
    """Remove one family from train and calibration; all its flows go to test."""
    out = base.copy()
    held = (df["family"] == family).to_numpy()
    out[held] = TEST
    return out


def cap_benign_train(df: pd.DataFrame, split: pd.Series, cap: int, seed: int = 7) -> pd.Series:
    """Downsample benign training rows (time-stratified) to keep training fast.
    Calibration and test keep every benign flow so FPR stays realistic."""
    out = split.copy()
    mask = ((split == TRAIN) & (df["label"] == BENIGN)).to_numpy()
    idx = np.flatnonzero(mask)
    if len(idx) <= cap:
        return out
    rng = np.random.default_rng(seed)
    drop = rng.choice(idx, size=len(idx) - cap, replace=False)
    out.iloc[drop] = None
    return out
