"""Load the corrected CIC-IDS2017 CSVs into one tidy, typed frame.

Label policy (docs/METHOD.md): "Attempted" flows become BENIGN; fine labels are
normalised to canonical names; each label also gets a family for the UI.
"""

from __future__ import annotations

import re
from pathlib import Path

import numpy as np
import pandas as pd

ML_ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = ML_ROOT / "data" / "raw" / "cicids2017"
INTERIM = ML_ROOT / "data" / "interim"
FLOWS_PARQUET = INTERIM / "flows.parquet"

BENIGN = "BENIGN"

# canonical fine label -> family shown in the product
FAMILY = {
    BENIGN: "Benign",
    "FTP-Patator": "Brute Force",
    "SSH-Patator": "Brute Force",
    "Web Brute Force": "Brute Force",
    "DoS Hulk": "DoS",
    "DoS GoldenEye": "DoS",
    "DoS Slowloris": "DoS",
    "DoS Slowhttptest": "DoS",
    "DDoS": "DDoS",
    "Web XSS": "Web Injection",
    "Web SQL Injection": "Web Injection",
    "Heartbleed": "Heartbleed",
    "Infiltration": "Infiltration",
    "PortScan": "PortScan",
    "Botnet": "Botnet",
}

# Identity / bookkeeping columns: dropped from features to avoid shortcut learning.
META_COLUMNS = ["id", "Flow ID", "Src IP", "Dst IP", "Src Port", "Timestamp"]
LABEL_COLUMNS = ["Label", "Attempted Category"]

_DAY_BY_DATE = {
    "2017-07-03": "Mon",
    "2017-07-04": "Tue",
    "2017-07-05": "Wed",
    "2017-07-06": "Thu",
    "2017-07-07": "Fri",
}


def canonical_label(raw: str) -> str:
    """Map a raw dataset label to a canonical fine label (Attempted -> BENIGN)."""
    s = str(raw).strip()
    if not s or "attempted" in s.lower():
        return BENIGN
    k = re.sub(r"[^a-z]", "", s.lower())
    if k == "benign":
        return BENIGN
    if "ftp" in k:
        return "FTP-Patator"
    if "ssh" in k:
        return "SSH-Patator"
    if "portscan" in k:  # includes "Infiltration - Portscan"
        return "PortScan"
    if "infiltration" in k:
        return "Infiltration"
    if "bruteforce" in k:
        return "Web Brute Force"
    if "xss" in k:
        return "Web XSS"
    if "sql" in k:
        return "Web SQL Injection"
    if "heartbleed" in k:
        return "Heartbleed"
    if "ddos" in k or "loic" in k:
        return "DDoS"
    if "hulk" in k:
        return "DoS Hulk"
    if "goldeneye" in k:
        return "DoS GoldenEye"
    if "slowloris" in k:
        return "DoS Slowloris"
    if "slowhttp" in k:
        return "DoS Slowhttptest"
    if "bot" in k:
        return "Botnet"
    raise ValueError(f"Unmapped label: {raw!r}")


def _day_from_name(path: Path) -> str:
    name = path.stem.lower()
    for day in ("monday", "tuesday", "wednesday", "thursday", "friday"):
        if day in name:
            return day[:3].capitalize()
    raise ValueError(f"Cannot infer weekday from file name {path.name}")


def load_raw(raw_dir: Path = RAW_DIR) -> pd.DataFrame:
    files = sorted(raw_dir.rglob("*.csv"))
    if not files:
        raise FileNotFoundError(f"No CSVs under {raw_dir}")
    frames = []
    for f in files:
        df = pd.read_csv(f, low_memory=False)
        df.columns = [c.strip() for c in df.columns]
        df["day"] = _day_from_name(f)
        frames.append(df)
    return pd.concat(frames, ignore_index=True)


def tidy(df: pd.DataFrame) -> pd.DataFrame:
    """Canonical labels, typed timestamps, numeric features as float32, no inf/NaN."""
    out = pd.DataFrame(index=df.index)
    out["day"] = df["day"].astype("category")
    out["ts"] = pd.to_datetime(df["Timestamp"], errors="coerce")
    for c in ("Src IP", "Dst IP"):
        out[c.lower().replace(" ", "_")] = df[c].astype(str)
    out["src_port"] = pd.to_numeric(df["Src Port"], errors="coerce").fillna(-1).astype("int32")
    out["label"] = df["Label"].map(canonical_label)
    out["family"] = out["label"].map(FAMILY)
    out["raw_label"] = df["Label"].astype(str)

    drop = set(META_COLUMNS) | set(LABEL_COLUMNS) | {"day"}
    feats = [c for c in df.columns if c not in drop]
    X = df[feats].apply(pd.to_numeric, errors="coerce").astype("float32")
    X = X.replace([np.inf, -np.inf], np.nan).fillna(-1.0)
    # constant columns carry no signal and bloat the exported model
    X = X.loc[:, X.nunique(dropna=False) > 1]
    X.columns = [f"f_{re.sub(r'[^0-9a-zA-Z]+', '_', c).strip('_').lower()}" for c in X.columns]
    return pd.concat([out, X], axis=1)


def feature_columns(df: pd.DataFrame) -> list[str]:
    return [c for c in df.columns if c.startswith("f_")]


def build(raw_dir: Path = RAW_DIR, out: Path = FLOWS_PARQUET) -> pd.DataFrame:
    df = tidy(load_raw(raw_dir))
    out.parent.mkdir(parents=True, exist_ok=True)
    df.to_parquet(out, index=False)
    return df


def load() -> pd.DataFrame:
    return pd.read_parquet(FLOWS_PARQUET)


if __name__ == "__main__":
    flows = build()
    print(flows.groupby(["day", "label"], observed=True).size().to_string())
    print(f"{len(flows):,} flows, {len(feature_columns(flows))} features")
