import numpy as np
import pandas as pd

from nightwatch_ml.split import CAL, TEST, TRAIN, chronological_within_campaign, leave_family_out, random_stratified


def _toy(n=2000, seed=0):
    rng = np.random.default_rng(seed)
    ts = pd.Timestamp("2017-07-03") + pd.to_timedelta(rng.integers(0, 5 * 86400, n), unit="s")
    labels = rng.choice(["BENIGN", "DoS Hulk", "Botnet"], size=n, p=[0.8, 0.15, 0.05])
    fam = pd.Series(labels).map({"BENIGN": "Benign", "DoS Hulk": "DoS", "Botnet": "Botnet"})
    day = pd.Series(ts).dt.day_name().str[:3]
    return pd.DataFrame({"ts": ts, "label": labels, "family": fam, "day": day})


def test_chronological_has_no_time_leakage_per_group():
    df = _toy()
    s = chronological_within_campaign(df)
    groups = np.where(df.label == "BENIGN", "B|" + df.day, df.label)
    for g in pd.unique(groups):
        m = groups == g
        tr, ca, te = (df.ts[m & (s == k)] for k in (TRAIN, CAL, TEST))
        assert tr.max() <= ca.min() <= ca.max() <= te.min()


def test_fractions_close_to_60_20_20():
    df = _toy()
    shares = chronological_within_campaign(df).value_counts(normalize=True)
    assert abs(shares[TRAIN] - 0.6) < 0.02 and abs(shares[TEST] - 0.2) < 0.02


def test_random_split_mixes_time():
    df = _toy()
    s = random_stratified(df)
    m = df.label == "DoS Hulk"
    assert df.ts[m & (s == TRAIN)].max() > df.ts[m & (s == TEST)].min()


def test_leave_family_out_removes_family_from_train_and_cal():
    df = _toy()
    s = leave_family_out(df, "Botnet", chronological_within_campaign(df))
    assert not ((df.family == "Botnet") & s.isin([TRAIN, CAL])).any()
    assert (s[df.family == "Botnet"] == TEST).all()
