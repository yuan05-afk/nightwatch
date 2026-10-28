"""Write a realistic upload sample: raw CICFlowMeter rows (labels removed) from Friday's
held-out test windows, so 'Check your network' gets exactly what a real export looks like."""

from __future__ import annotations

import numpy as np
import pandas as pd

from . import data
from .split import TEST, chronological_within_campaign

OUT = data.ML_ROOT.parent / "web" / "public" / "samples" / "nightwatch-sample-flows.csv"
CAPS = {"Botnet": 400, "PortScan": 300, "DDoS": 300}


def main() -> None:
    df = data.load()
    split = chronological_within_campaign(df)
    fri = df[(df["day"] == "Fri").to_numpy() & (split == TEST).to_numpy()]
    rng = np.random.default_rng(3)
    picks = []
    for lab, g in fri.groupby("label"):
        k = 1500 if lab == data.BENIGN else CAPS.get(lab, 200)
        picks.append(g.index.to_numpy()[np.sort(rng.choice(len(g), min(k, len(g)), replace=False))])
    idx = np.sort(np.concatenate(picks))
    # data.load_raw concatenates the sorted CSVs; friday.csv is first, so parquet row i == friday row i
    assert sorted(data.RAW_DIR.rglob("*.csv"))[0].name == "friday.csv"
    raw = pd.read_csv(data.RAW_DIR / "friday.csv", low_memory=False)
    raw.columns = [c.strip() for c in raw.columns]
    sample = raw.iloc[idx].drop(columns=["Label", "Attempted Category", "id"], errors="ignore")
    sample = sample.sort_values("Timestamp", kind="stable")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    sample.to_csv(OUT, index=False)
    print(f"{OUT.name}: {len(sample)} rows, {OUT.stat().st_size / 1e6:.2f} MB; truth mix:",
          df.loc[idx, "label"].value_counts().to_dict())


if __name__ == "__main__":
    main()
