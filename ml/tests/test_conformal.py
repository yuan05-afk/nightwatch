import numpy as np

from nightwatch_ml.conformal import KNOWN, SUPPRESSED, UNKNOWN, MondrianConformal, conformal_quantile, coverage, verdicts


def _probs(n, k, true, sharp, rng):
    logits = rng.normal(0, 1, (n, k))
    logits[np.arange(n), true] += sharp
    e = np.exp(logits - logits.max(1, keepdims=True))
    return e / e.sum(1, keepdims=True)


def test_quantile_rank_rule():
    s = np.arange(1, 20, dtype=float)  # n = 19, alpha .1 -> rank ceil(20*.9)=18
    assert conformal_quantile(s, 0.1) == 18.0
    assert conformal_quantile(np.array([0.5]), 0.05) == float("inf")


def test_per_class_coverage_holds_on_exchangeable_data():
    # The guarantee is coverage >= 1 - alpha in expectation over calibration draws,
    # so average across seeds; a single draw of a 1% class swings by several points.
    k, alpha, prior = 4, 0.1, [0.85, 0.1, 0.04, 0.01]
    covs = []
    for seed in range(12):
        rng = np.random.default_rng(seed)
        y_cal, y_test = rng.choice(k, 20000, p=prior), rng.choice(k, 20000, p=prior)
        p_cal, p_test = _probs(len(y_cal), k, y_cal, 2.0, rng), _probs(len(y_test), k, y_test, 2.0, rng)
        sets = MondrianConformal.fit(p_cal, y_cal, alpha=alpha).predict_sets(p_test)
        covs.append([coverage(sets[y_test == c], y_test[y_test == c]) for c in range(k)])
    assert (np.mean(covs, axis=0) >= 1 - alpha - 0.01).all()


def test_small_class_uses_pooled_attack_threshold():
    rng = np.random.default_rng(2)
    y = np.r_[np.zeros(500, int), np.ones(500, int), np.full(5, 2)]
    p = _probs(len(y), 3, y, 3.0, rng)
    cp = MondrianConformal.fit(p, y, alpha=0.05, min_n=30)
    assert cp.fallback_used == [False, False, True]
    assert np.isfinite(cp.thresholds).all()


def test_verdict_rules():
    sets = np.array([[True, False, False], [False, True, False], [False, False, False], [True, True, False], [True, False, False]])
    proba = np.eye(3)[[0, 1, 2, 0, 0]]
    anomaly = np.array([0.1, 0.1, 0.1, 0.1, 0.9])
    v, _ = verdicts(sets, proba, anomaly, anomaly_threshold=0.5)
    assert list(v) == [SUPPRESSED, KNOWN, UNKNOWN, UNKNOWN, UNKNOWN]
