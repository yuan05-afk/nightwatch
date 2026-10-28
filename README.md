# NIGHTWATCH

**The intrusion watch that knows what it hasn't seen.**

NIGHTWATCH is a network intrusion detection and alert triage system built for DataNova 2026, track DN-CY-01 (Network Intrusion Detection with Imbalanced Threat Data).

- **Detect:** imbalance-aware multi-class detector trained on the corrected CIC-IDS2017, evaluated on later days than it was trained on.
- **Doubt:** conformal prediction sets and an anomaly layer turn "the model has never seen this" into an explicit *Unknown: investigate* verdict instead of a silent "benign".
- **Decide:** capacity-aware triage that ranks incidents for the analyst-minutes you actually have, with analyst feedback stored in Postgres.

Status: in development (build window Oct 28 - Nov 10, 2026). Plan: [`docs/PRD.md`](docs/PRD.md). Sources: [`docs/RESEARCH.md`](docs/RESEARCH.md).

## Layout

| Path | What |
| --- | --- |
| `ml/` | Python pipeline (uv): data prep, training, conformal + open-set layer, evaluation reports, model export |
| `web/` | Next.js app on Vercel with Neon Postgres and Neon Auth; scoring runs in TypeScript |
| `deck/` | Presentation source and exported PPTX |
| `docs/` | PRD, method, threat model, research log |
