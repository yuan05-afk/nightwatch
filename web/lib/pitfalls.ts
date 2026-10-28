// Arp et al., "Dos and Don'ts of Machine Learning in Computer Security", USENIX Security 2022.
// Status is honest: "disclosed" means we name the limit rather than claim to have fixed it.

export type Pitfall = { id: string; name: string; status: "addressed" | "disclosed"; how: string };

export const PITFALLS: Pitfall[] = [
  {
    id: "P1",
    name: "Sampling bias",
    status: "disclosed",
    how: "All traffic comes from one 2017 university testbed. We say so everywhere, and the cross-year test against CSE-CIC-IDS2018 is the next step to measure how far it travels.",
  },
  {
    id: "P2",
    name: "Label inaccuracy",
    status: "addressed",
    how: "We use the corrected CIC-IDS2017 release with its published labelling logic, and relabel 'Attempted' flows as benign exactly as its authors recommend.",
  },
  {
    id: "P3",
    name: "Data snooping",
    status: "addressed",
    how: "Attacks are split by time inside each campaign and benign traffic in whole 15-minute blocks. The imbalance strategy was picked on the calibration set, and the benign alert budget was fixed before any test result was seen.",
  },
  {
    id: "P4",
    name: "Spurious correlations",
    status: "addressed",
    how: "IP addresses, source ports, flow IDs and timestamps are removed. In this lab the attacker is almost always 172.16.0.1, so a model that sees IPs learns the lab, not the attack.",
  },
  {
    id: "P5",
    name: "Biased parameter selection",
    status: "addressed",
    how: "Model hyperparameters are fixed in code and were never tuned against the test split.",
  },
  {
    id: "P6",
    name: "Inappropriate baseline",
    status: "addressed",
    how: "Three imbalance strategies are compared, and the incident ranking is measured against arrival order and model confidence alone.",
  },
  {
    id: "P7",
    name: "Inappropriate performance measures",
    status: "addressed",
    how: "We report per-class recall, macro-F1 over attack classes and PR-AUC. Accuracy appears only to show how misleading it is.",
  },
  {
    id: "P8",
    name: "Base rate fallacy",
    status: "addressed",
    how: "Benign alert rates are converted into expected false alerts per day at 100 thousand, 1 million and 10 million flows.",
  },
  {
    id: "P9",
    name: "Lab-only evaluation",
    status: "disclosed",
    how: "Every number here comes from lab traffic. Nightwatch accepts CICFlowMeter output, so the honest next step is a pilot on a real network's flows.",
  },
  {
    id: "P10",
    name: "Inappropriate threat model",
    status: "disclosed",
    how: "An attacker who shapes traffic to look normal can slip past. Our own zero-day test shows it: unseen botnet and brute-force flows mostly passed as benign.",
  },
];
