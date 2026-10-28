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


def test_attacks_have_no_time_leakage_within_campaign():
    df = _toy()
    s = chronological_within_campaign(df)
    for lab in ("DoS Hulk", "Botnet"):
        m = df.label == lab
        tr, ca, te = (df.ts[m & (s == k)] for k in (TRAIN, CAL, TEST))
        assert tr.max() <= ca.min() <= ca.max() <= te.min()


def test_benign_blocks_are_whole_and_test_spans_the_day():
    df = _toy(20000)
    s = chronological_within_campaign(df)
    b = df.label == "BENIGN"
    block = (df.ts - df.ts.groupby(df.day).transform("min")).dt.total_seconds() // (15 * 60)
    # every 15-minute block of a day lands entirely in one split
    per_block = pd.DataFrame({"day": df.day[b], "block": block[b], "split": s[b]}).groupby(["day", "block"])["split"].nunique()
    assert (per_block == 1).all()
    # held-out benign covers morning and evening, not just the last fifth of the day
    hours = df.ts[b & (s == TEST)].dt.hour
    assert hours.min() < 6 and hours.max() > 18


def test_fractions_close_to_60_20_20():
    df = _toy(20000)
    # Benign is split in whole 15-minute blocks, so a day whose block count is not a
    # multiple of the 10-block cycle leaves a remainder in train: allow 3 points.
    shares = chronological_within_campaign(df).value_counts(normalize=True)
    assert abs(shares[TRAIN] - 0.6) < 0.03 and abs(shares[TEST] - 0.2) < 0.03


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
