# NIGHTWATCH research log

Every claim used on the site, in the deck, or on Devpost must trace to a row here. Snapshot date: 2026-10-28.

## Competition facts

| Fact | Source |
| --- | --- |
| Round 1 deadline Nov 10, 2026 5:00pm EST (Nov 11 06:00 PHT). Deliverables: PPT public link, working demo link, optional video. Round 2 live presentations by Nov 25. | https://datanova-2026-global-data-thon.devpost.com/ and /rules |
| Judging: Innovation 20%, Technical Implementation 25%, Problem Relevance 15%, Data & Analytical Rigor 15%, Impact & Feasibility 15%, Presentation & Documentation 10%. | Devpost overview page |
| Rules forbid "fabricated results, or misleading claims about functionality or performance"; third-party data and libraries must be acknowledged. | Devpost rules, Submission Guidelines 3-4 |
| Track problem DN-CY-01: "Develop a network intrusion detection model that handles highly imbalanced threat data and adapts to evolving attack patterns." Expected outcome: "A detection model with robust performance on minority classes and an alert triage interface." Submit code, documentation, an evaluation and a presentation. | https://datanovathon.com/#problems (DN-CY-01 modal) |
| No dataset files are linked from the problem pages; teams source public data. | https://datanovathon.com/problems/* (checked 2026-10-28) |

## The real-world problem

| Claim (as we will phrase it) | Source |
| --- | --- |
| 46% of SOC alerts turn out to be false positives. | Microsoft / Omdia, State of the SOC 2026, cited at https://www.microsoft.com/en-us/security/blog/2026/02/17/unify-now-or-pay-later-new-research-exposes-the-operational-cost-of-a-fragmented-soc/ |
| 73% of security teams name false positives as their top detection challenge. | SANS 2025 Detection & Response Survey, summarized at https://www.stamus-networks.com/blog/what-the-2025-sans-detection-response-survey-reveals-false-positives-alert-fatigue-are-worsening |
| SOCs handle thousands of alerts per day (estimates range ~3,000 to 4,400) and many are never investigated. | https://www.secure.com/blog/soc/soc-alerts ; Vectra State of Threat Detection (via https://www.vectra.ai/topics/alert-fatigue). Use as "thousands", cite range. |
| Ransomware groups (Medusa, Qilin) have disrupted Philippine healthcare; PH ransomware increasingly targets operational infrastructure. | https://www.cyfirma.com/research/philippines-evolving-cyber-threat-landscape-2025-2026/ |

## Why ML intrusion detection over-promises

| Claim | Source |
| --- | --- |
| CIC-IDS2017 contains serious errors in traffic generation, flow construction, feature extraction and labelling; the authors regenerated and relabelled it. More than 25% of flows were affected. | Engelen, Rimmer, Joosen. "Troubleshooting an Intrusion Detection Dataset: the CICIDS2017 Case Study." IEEE SPW 2021. https://intrusion-detection.distrinet-research.be/WTMC2021/ |
| Further undocumented errors in CIC-IDS2017 and CSE-CIC-IDS2018 across attack orchestration, features, documentation and labelling; corrected datasets and labelling logic released. | Liu, Engelen, Lynar, Essam, Joosen. "Error Prevalence in NIDS datasets." IEEE CNS 2022. https://intrusion-detection.distrinet-research.be/CNS2022/ |
| Dataset authors: relabel "Attempted" flows as Benign when in doubt; never treat "Attempted" as its own class. | https://intrusion-detection.distrinet-research.be/CNS2022/Dataset_Download.html |
| Ten pitfalls of ML in security; every one of 30 top-tier papers had at least 3; sampling bias at least partly present in 90%, data snooping in 73%. | Arp et al. "Dos and Don'ts of Machine Learning in Computer Security." USENIX Security 2022. https://www.usenix.org/system/files/sec22summer_arp.pdf , https://dodo-mlsec.org/ |
| Base-rate fallacy makes intrusion detection hard: tiny false-positive rates still flood analysts. | Axelsson, "The base-rate fallacy and the difficulty of intrusion detection." ACM TISSEC 2000. |

## Data used

| Dataset | Size | Licence / terms | Use |
| --- | --- | --- | --- |
| CICIDS2017 improved (DistriNet, CNS 2022) | 328 MB zip | Academic dataset; cite Liu et al. 2022 and Sharafaldin et al. 2018 (original CIC-IDS2017, UNB CIC). | Train / calibrate / test (day-based split), replay stream |
| CSE-CIC-IDS2018 improved (DistriNet, CNS 2022) | 9.7 GB zip | Same | Stretch: cross-year drift test |

Download index: https://intrusion-detection.distrinet-research.be/CNS2022/Datasets/

## Methods referenced

- Split conformal prediction for classification (Vovk et al.; Angelopoulos & Bates, "A Gentle Introduction to Conformal Prediction", 2021).
- Isolation Forest (Liu, Ting, Zhou, ICDM 2008).
- TreeSHAP (Lundberg et al., "From local explanations to global understanding with explainable AI for trees", Nature MI 2020).
- LightGBM (Ke et al., NeurIPS 2017).

## Positioning: organizations without a security team (added 2026-10-28)

| Claim | Source |
| --- | --- |
| PH Data Privacy Act breach rule: notify the National Privacy Commission within 72 hours of knowledge (or reasonable belief) of a personal data breach; full report within 5 days. Notification covers the nature of the breach, personal data possibly involved, measures taken, and a contact person. | NPC Circular 16-03, https://privacy.gov.ph/wp-content/uploads/2022/01/sgd-npc-circular-16-03-personal-data-breach-management.pdf ; procedure clarified by NPC Advisory 2026-02 (https://www.bakermckenzie.com/en/insight/publications/2026/06/philippines-data-breach-notification-procedure-further-clarified) |
| PhilHealth hit by Medusa ransomware on 22 Sept 2023; about 72 workstations affected; $300,000 ransom demanded; data leaked when unpaid; reported data of about 13 million members compromised. | PhilHealth public notice https://www.philhealth.gov.ph/ofclstmnts/2023/UN2023-10-03.pdf ; ACM case study https://dl.acm.org/doi/10.1145/3700706.3700711 (citing GMA News) |
| PhilHealth's antivirus licence had expired on 15 Apr 2023, blamed on procurement processes. | HIPAA Journal, Oct 2023, https://www.hipaajournal.com/lack-of-antivirus-software-behind-philhealth-ransomware-attack/ |
| GDPR Art. 33 likewise sets a 72-hour notification window to the supervisory authority. | Regulation (EU) 2016/679, Art. 33 |
| MITRE ATT&CK technique IDs used on alerts (T1071, T1105, T1190, T1110, T1498, T1499, T1046). | https://attack.mitre.org/ |
