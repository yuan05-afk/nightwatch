# NIGHTWATCH: DataNova 2026 winning plan (Cybersecurity & Fraud Detection track)

> **NIGHTWATCH** (English for *tanod*, the barangay night watchman) — *the intrusion watch that knows what it hasn't seen.*
> Folder: `C:\Users\Yuan\documents\ymir\nightwatch\` (sits beside `groundtruth/`, which won LovHack S3 1st place with the same "honest triage" DNA).

## Context

DataNova 2026 (Devpost): **Round 1 deadline Nov 10, 2026 5:00pm EST = Nov 11 06:00 PHT** (13 days). Deliverables on the form: **PPT public link (required)**, working demo link, optional video. Round 2 (Nov 25): shortlisted teams present live.

Judging (Devpost weights): Technical Implementation 25% · Innovation 20% · Problem Relevance 15% · Data & Analytical Rigor 15% · Impact & Feasibility 15% · Presentation 10%. The rules explicitly penalize **fabricated results and misleading performance claims**.

Track problem we answer: **DN-CY-01 "Network Intrusion Detection with Imbalanced Threat Data"**. Expected outcome: *a detection model with robust minority-class performance that adapts to evolving attacks, plus an alert triage interface.* No dataset is actually published on datanovathon.com, so we use public data.

### The real-world problem (researched, citable)
- SOCs drown in noise: **46% of alerts are false positives** (Microsoft/Omdia State of the SOC 2026); **73% of teams name false positives their #1 detection challenge** (SANS 2025 Detection & Response Survey); ~3,000–4,400 alerts/day, many never investigated.
- ML intrusion detectors look perfect on paper and fail in the field: **>25% of CIC-IDS2017 flows were mislabeled or broken** (Engelen, Rimmer, Joosen, IEEE SPW 2021; Liu et al., IEEE CNS 2022). **Every one of 30 top-tier ML-security papers had ≥3 evaluation pitfalls**; sampling bias in 90%, data snooping in 73% (Arp et al., USENIX Security 2022).
- Models trained on known attacks silently label new attacks as "benign". Analysts get no signal that the model is out of its depth.
- PH context: ransomware (Medusa, Qilin) has hit Philippine hospitals and public services (CYFIRMA PH threat landscape 2025–26). Small orgs, LGUs, and hospitals have no 24/7 SOC: one analyst, one night shift.

### The winning idea: Detect · Doubt · Decide
Most entries will train XGBoost on CIC-IDS2017, show "99.9% accuracy", and stop. NIGHTWATCH is built around three things they won't have:

1. **Detect (imbalance done right).** A LightGBM multi-class detector on the **corrected** CIC-IDS2017, using a **day-based temporal split** (train on earlier days, test on later ones) rather than a random split. An ablation compares no reweighting, class-balanced weights, SMOTE, and focal loss. We report per-class recall, macro-F1, and PR-AUC; accuracy is never the headline.
2. **Doubt (evolving attacks).** An open-set layer: **split-conformal prediction sets** (calibrated coverage, e.g. 95%) plus an Isolation Forest trained on benign traffic.
   - A {Benign} set means suppress. A single attack class means a known attack. An ambiguous set, or an anomalous flow, becomes **"Unknown: investigate"** and is never silently passed.
   - Proven with a **leave-one-attack-family-out "zero-day" test**: what share of an unseen family is flagged Unknown rather than missed?
   - Stretch: a **2017 → 2018 cross-year drift test** on the corrected CSE-CIC-IDS2018.
3. **Decide (capacity-aware triage).** Alerts are grouped into incidents and ranked by severity × confidence × uncertainty. A **capacity slider** (analyst-minutes per hour) shows which incidents get reviewed. The headline metric is **attacks caught per analyst-hour**, measured against FIFO and confidence-only baselines. Analyst feedback is stored in Neon and drives live per-class precision, a drift monitor (PSI + Unknown-rate), and a "retrain recommended" flag.

Plus two signature artifacts for Rigor and Innovation:
- **The Accuracy Illusion panel:** the same model on a random split (~99.9%), a temporal split, an unseen family, and cross-year. Side by side, with real numbers.
- **The Pitfall Scorecard:** each of Arp et al.'s 10 pitfalls and exactly how NIGHTWATCH avoids or discloses it, plus a base-rate check ("at 1M flows/day this FPR means N false alerts per day").

## Architecture

```
ml/ (Python, uv)                       web/ (Next.js App Router + TS, Vercel)
 corrected CIC-IDS2017 (328 MB)          ├─ Neon Postgres (Drizzle ORM, @neondatabase/serverless)
  → clean + label policy                 ├─ Neon Auth (Managed Better Auth, @neondatabase/auth)
  → day-based split                      │    email/password + Google; Admin plugin → roles lead/analyst
  → LightGBM + ablations                 ├─ lib/scoring/ (pure TS, no Python server)
  → conformal + IsolationForest          │    lgbm.ts (tree eval from LightGBM dump_model JSON)
  → evaluation reports (JSON)  ───────►  │    treeshap.ts (path-dependent TreeSHAP port)
  → export model JSON/thresholds ─────►  │    iforest.ts, conformal.ts
  → replay sample → Neon (load script)   ├─ API route handlers: stream tick, score upload, feedback, metrics
                                         └─ UI: Brief · Watchfloor · Evidence · Method · Try-it · Admin
```

Why scoring runs in TypeScript: the whole app deploys to Vercel and Neon with no cold-starting Python server during judging. A **parity test** checks predictions and SHAP values against Python on 1,000 flows (|Δ| < 1e-6), which also earns Technical points.

**Live stream on serverless:** held-out test-day flows sit in Neon. Each Watchfloor poll calls `POST /api/stream/tick` with a cursor. That call scores the next batch live, writes alerts and incidents, and returns the new ones. Accelerated replay of the Thursday and Friday attack windows makes it look and behave live.

### Data model (Neon)
`flows_replay` (id, ts, day, src/dst ip:port, proto, feature vector `real[]`, true_label hidden from UI) · `alerts` (flow_id, verdict known/unknown/suppressed, class, prob, conformal_set, anomaly_score, shap_top jsonb, latency_us) · `incidents` (group key, window, severity, rank_score, status) · `feedback` (incident_id, user_id, action confirm/false_positive/escalate, note, ts) · `audit_log` (append-only: actor, action, target, ts, ip hash) · `model_versions` · `drift_snapshots`. Auth tables live in the `neon_auth` schema (managed). The replay subset is about 100k flows (well under Neon free-tier storage).

### Pages
1. **Brief (landing):** the night-shift story with sourced stats, the Accuracy Illusion teaser, and "Enter the Watchfloor".
2. **Watchfloor:** a live incident queue with three lanes (Known attack · **Unknown: investigate** · Suppressed), the capacity slider, a caught-per-analyst-hour gauge, and the stream speed.
3. **Evidence card:** top SHAP drivers in plain language, the conformal set, the anomaly score, a **benign explanation shown beside every signal** (GroundTruth pattern), similar confirmed incidents, raw flow fields, and Confirm / False positive / Escalate.
4. **Method:** the Accuracy Illusion, the imbalance ablation table, the zero-day test, conformal coverage, latency, the Pitfall Scorecard, dataset label policy, and limits.
5. **Try it:** upload a CICFlowMeter CSV (zod-validated, size-capped, rate-limited), scored live.
6. **Lead/Admin (role-gated):** team precision per class, drift monitor, retrain flag, audit log viewer.

### Design direction (from your reference shots)
The reference look: near-black canvas, aurora glow, elegant serif headlines, glass and isometric panels. Applied across both the landing page and the app pages, so the demo feels like one product. The `frontend-design` skill is loaded at build time.

- **Palette (tokens in CSS vars):** canvas `#05070A`; panels as glass (`rgba(255,255,255,0.03)` with a 1px `rgba(255,255,255,0.08)` border and backdrop blur). **Aurora** is a single hue family: deep teal → mint → olive-gold, as in the reference's background glow. No blue/pink/rainbow.
- **Semantic colors:** mint = known attack handled; warm amber-gold = **Unknown: investigate** (the aurora's gold end, so it stays on-palette); soft coral = confirmed attack; slate = suppressed. All checked for WCAG AA on the dark canvas.
- **Type:** a light editorial serif for display headings (Instrument Serif or Newsreader, matching the reference's "Meet the #1 Team" style). A small, airy sans for UI (Geist or Inter). IBM Plex Mono for IPs, flow IDs, and scores (carried over from GroundTruth).
- **Primary button (replacing the rainbow one):** a glass pill with a thin **mint hairline border**, a soft inner mint glow, and near-white text. On hover, a slow single-tone light sweep crosses it and the glow intensifies. The secondary button is the same pill with no glow. Both keep the reference's small "↗"-style glyph.
- **Motifs, mapped to NIGHTWATCH content (no fake clients or testimonials, since the rules forbid misleading claims):**
  - Reference hero (aurora horizon + floating glass orb icons + thin orbit lines) → **NIGHTWATCH hero**. Orbs are attack families (DoS, PortScan, Bot, Web, Infiltration) plus one gold **"?" orb for Unknown**. Headline: "The intrusion watch that knows what it hasn't seen."
  - "How it works" stepper + glowing isometric panel → **Detect · Doubt · Decide · Triage · Learn**. The isometric panel animates to the active step (CSS 3D or SVG, not WebGL, to keep it fast).
  - "Our Services" thin-border grid → **8 capability tiles** (imbalance-aware detection, conformal doubt, zero-day test, capacity triage, SHAP evidence, drift monitor, RBAC + audit, Try-it upload).
  - Avatar orbit with a center glow → **attack-family orbit** around the NIGHTWATCH mark, glowing gold when Unknown is active.
  - 3D pillars "Our Approach" → **Pitfall Scorecard pillars** (one per Arp et al. pitfall; hover shows how NIGHTWATCH handles it).
  - "Our Impact" stat grid → **real numbers from `ml/reports`** (macro-F1, minority recall, zero-day flagged %, attacks caught per analyst-hour).
  - "Unified Security Intelligence" node graph → **incident graph** (hosts and flows; the selected incident lights up).
  - FAQ accordion → **judge questions** ("Does it auto-block?", "What data?", "How do you handle unseen attacks?").
  - Newsletter block → a **"Enter the Watchfloor" CTA**. Giant footer wordmark: **"Watch what you haven't seen."**
- **App pages** (Watchfloor, Evidence, Method, Admin) reuse the same glass panels, serif section titles, and aurora edge glows, at lower intensity so data stays readable.
- **Motion:** Motion (as in GroundTruth) for stepper and reveal animations, honoring `prefers-reduced-motion`. Aurora uses CSS gradients plus a subtle noise overlay; no heavy WebGL.
- **Responsive:** the reference's single-column flow at 390px; isometric art scales down or swaps to a flat version on mobile.

### Secure by design (it's a security project, so judges will poke it)
Server-side authorization on every mutation and role check for lead routes. zod input validation. Strict security headers (CSP, HSTS, frame-ancestors, referrer policy) in `next.config`. Postgres-backed rate limit on upload and auth-adjacent routes. Append-only audit log. No secrets client-side. `npm audit` + `pip-audit` clean. **STRIDE threat model of NIGHTWATCH itself** in `docs/THREAT_MODEL.md` and on one slide. Responsible AI: human-in-the-loop, **no auto-blocking**, uncertainty shown, dataset limits disclosed. A judge demo account goes in the submission notes.

## Folder layout
```
nightwatch/
  README.md  DEVPOST.md  .gitignore (data/, .env*)
  docs/  PRD.md  METHOD.md  THREAT_MODEL.md  RESEARCH.md (all citations + links)
  ml/    pyproject.toml  src/nightwatch_ml/{data,split,train,imbalance,conformal,openset,evaluate,export}.py
         tests/  data/{raw,interim,out}/  reports/*.json
  web/   Next.js app  app/  lib/scoring/  lib/db/schema.ts  drizzle/  scripts/load-replay.ts  tests/ (vitest + playwright)
  deck/  build_deck.(py|js)  NIGHTWATCH-DataNova2026.pptx  assets/
  video/ (optional Remotion + ElevenLabs, per avp-video-playbook skill)
```

## Execution timeline (today Oct 28 → submit Nov 10 PHT, buffer Nov 10–11 06:00)

| Day | Work | Done when |
|---|---|---|
| Oct 28–29 | **You:** register on Unstop (₹100) and select DN-CY-01 before the **Oct 30 problem-statement deadline**; join on Devpost; resolve the team rule. **Me:** scaffold `nightwatch/`, git init, download corrected 2017, EDA, label policy ("Attempted" → Benign per dataset authors) | data loads; class counts recorded in `docs/METHOD.md` |
| Oct 30–Nov 1 | ML: day split + leakage test, baselines, imbalance ablation, conformal + IForest, zero-day LOFO, Accuracy Illusion runs, latency; export JSON | `reports/*.json` generated; pytest green |
| Nov 1–2 | TS scorer + TreeSHAP port + parity tests | vitest parity < 1e-6 on 1,000 flows |
| Nov 2–5 | Neon project (AWS ap-southeast-1) + Managed Auth + Drizzle schema + replay loader; Next.js pages, stream tick, feedback, admin, upload | E2E: sign up → Watchfloor streams → feedback persists |
| Nov 5–6 | Security hardening, threat model, Vercel deploy, trusted domain; stretch: 2018 cross-year run in background | prod URL works signed-out and as judge; headers verified |
| Nov 6–7 | UI polish at desktop + mobile sizes, screenshots, README | Playwright screenshots reviewed |
| Nov 7–8 | **Deck** (below) + optional 2–3 min video | public deck link opens in incognito |
| Nov 9 | DEVPOST.md, final prod check of every link | checklist below all green |
| Nov 10 PHT | **Submit** (~19 h before the hard cutoff) | Devpost shows submitted |

## The PPT (required: public link)
Built with the `pptx` skill into `deck/NIGHTWATCH-DataNova2026.pptx`, then uploaded to your Google Drive as Google Slides with "anyone with the link can view". **I'll confirm with you before making it public.** That link goes in the "PPT for the proposed solution" field. About 13 slides, each mapped to a judging criterion. Every number comes from `ml/reports/*.json`; nothing is typed in by hand:
1. Title: NIGHTWATCH, tagline, DN-CY-01, team
2. The night shift: alert flood stats, PH ransomware context *(Relevance)*
3. The Accuracy Illusion: mislabeled benchmarks and the 99.9% myth *(Innovation)*
4. Detect · Doubt · Decide *(Solution)*
5. Architecture *(Technical)*
6. Imbalance: ablation and per-class minority recall *(Rigor)*
7. Unseen attacks: conformal + zero-day test results *(Rigor/Innovation)*
8. Triage under capacity: attacks caught per analyst-hour vs baselines *(Impact)*
9. Live demo: Watchfloor, Evidence card, Method screenshots
10. Secure & responsible by design: STRIDE, RBAC, audit, human-in-loop
11. Impact & feasibility: who uses it (SMEs, LGUs, hospitals), deploy path (CICFlowMeter → NIGHTWATCH), cost, scale
12. Validation & honest limits (Pitfall Scorecard)
13. Roadmap · team contributions · links (demo, repo, video)

## Verification
- **ML:** pytest. Assert there is no day overlap between train and test, and conformal empirical coverage ≥ target on held-out data. Reports regenerate from a clean `uv run` command.
- **Scoring parity:** vitest compares TS against Python predictions and SHAP on 1,000 flows.
- **App:** Playwright E2E covering sign-up, sign-in, sign-out, and session restore. Also the stream tick inserting alerts, feedback persisting in Neon, an analyst blocked from lead routes (403), and an oversized or malformed upload rejected.
- **Security:** verify headers on prod (curl), `npm audit` and `pip-audit`, and confirm unauthenticated mutation calls return 401.
- **UI:** inspect the running app in a browser at 390px, 768px, and 1440px. Screenshots are reviewed, not assumed. Compare the landing page against your reference shots (aurora, serif, glass, isometric), confirm no rainbow gradients remain, check AA contrast on the semantic colors, and check reduced-motion behavior.
- **Deck styling:** the deck uses the same palette and type (dark canvas, aurora accents, serif titles), so the PPT and the site read as one brand.
- **Submission:** demo, deck, repo, and video links all open in an incognito window. DEVPOST.md covers every required section (overview, problem, solution, stack, demo, validation, impact, team contributions, acknowledgements of datasets and libraries).

## Open items for you (not blocking the plan)
- **Team rule:** Devpost says "Students only · Team required". Recruit a teammate, or email contact@datanovathon.com to confirm solo entry. The datanovathon.com FAQ says individuals are allowed.
- **Unstop registration + problem selection by Oct 30.**
- After approval, I'll offer to register a MyOS card for NIGHTWATCH. Per your rules, I won't create one without a yes.
- The name is NIGHTWATCH unless you want another one. The folder name follows it.
