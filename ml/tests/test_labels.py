import pytest

from nightwatch_ml.data import BENIGN, FAMILY, canonical_label


@pytest.mark.parametrize(
    "raw, expected",
    [
        ("BENIGN", BENIGN),
        ("FTP-Patator - Attempted", BENIGN),
        ("DoS Hulk - Attempted", BENIGN),
        ("FTP-Patator", "FTP-Patator"),
        ("SSH-Patator", "SSH-Patator"),
        ("DoS Hulk", "DoS Hulk"),
        ("DoS Slowhttptest", "DoS Slowhttptest"),
        ("Web Attack - Brute Force", "Web Brute Force"),
        ("Web Attack \x96 XSS", "Web XSS"),
        ("Web Attack - SQL Injection", "Web SQL Injection"),
        ("Infiltration - Portscan", "PortScan"),
        ("Portscan", "PortScan"),
        ("Infiltration", "Infiltration"),
        ("Botnet", "Botnet"),
        ("DDoS", "DDoS"),
        ("Heartbleed", "Heartbleed"),
    ],
)
def test_canonical_label(raw, expected):
    assert canonical_label(raw) == expected


def test_every_label_has_family():
    for raw in ["BENIGN", "DoS Hulk", "Botnet", "Web Attack - XSS", "Portscan"]:
        assert canonical_label(raw) in FAMILY


def test_unknown_label_raises():
    with pytest.raises(ValueError):
        canonical_label("Something New")
