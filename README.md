# NIGHTWATCH

**Your night-shift security analyst.**

NIGHTWATCH watches network traffic, explains attacks in plain language, ranks what to fix first, and drafts the breach report the Philippine Data Privacy Act requires within 72 hours. It is built for hospitals, schools, local governments and small businesses that have no security team. Entry for DataNova 2026, track DN-CY-01 (Network Intrusion Detection with Imbalanced Threat Data).

## The workflow

1. **Monitor:** replay a held-out day of real traffic, or upload a CICFlowMeter CSV on *Check your network* (scored in memory, never stored).
2. **Detect:** a LightGBM model trained on the corrected CIC-IDS2017 names the attack. Conformal prediction sends anything it cannot name with 95% confidence to *Needs review* instead of calling it normal.
3. **Prioritize:** alerts are grouped into incidents and ranked Critical, High, Medium or Low, with the MITRE ATT&CK technique.
4. **Investigate:** plain-language explanation, the model's evidence with an innocent explanation beside each signal, and the first response steps.
5. **Report:** confirmed incidents become a draft incident report with the NPC's four notification fields and the 72-hour deadline.

## Results (held-out test split, `ml/reports/`)

| Measure | Value |
| --- | --- |
| Attack flows that raised an alert | 99.96% |
| Normal flows that raised a false alert | 0.42% |
| Macro-F1 over attack classes | 0.865 (0.868 without port and protocol) |
| Alerts grouped into incidents, five replayed days | 102,268 into 471 |
| Real attack incidents reached at 10 reviews a day | 19 of 22 (oldest-first: 16) |

Limits we disclose: when a whole attack family is withheld from training, DDoS and Heartbleed are still flagged 100% of the time, but botnet, brute-force and port-scan traffic mostly passes as normal. Details on the site's Method page and in [`docs/METHOD.md`](docs/METHOD.md).

## Layout

| Path | What |
| --- | --- |
| `ml/` | Python pipeline (uv): data prep, training, conformal and anomaly layers, evaluation reports, model export. `uv run pytest` |
| `web/` | Next.js 16 app with Neon Postgres and Neon Auth; the model runs in TypeScript, checked against Python by a parity test. `npm test` |
| `deck/` | Presentation generator; every model number is read from `ml/reports/`. `bash deck/build.sh` |
| `docs/` | PRD, method, research log with every source |

## Run locally

```bash
cd ml && uv sync && uv run python -m nightwatch_ml.pipeline   # needs the corrected CIC-IDS2017 CSVs in ml/data/raw
cd web && cp .env.example .env.local && npm install && npm run dev
```

Data: corrected CIC-IDS2017 (Liu et al., IEEE CNS 2022; Sharafaldin et al., 2018). Sources for every claim: [`docs/RESEARCH.md`](docs/RESEARCH.md).
