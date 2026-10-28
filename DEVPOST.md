# NIGHTWATCH: your night-shift security analyst

**Track:** Cybersecurity and Fraud Detection, DN-CY-01 (Network Intrusion Detection with Imbalanced Threat Data)

- **Live demo:** https://nightwatch-olive.vercel.app (press "Use the judge demo account" on the sign-in page)
- **Code:** https://github.com/yuan05-afk/nightwatch
- **Presentation:** _paste the Google Slides link_
- **Video:** _paste the video link_

## Inspiration

In September 2023, the Medusa ransomware group hit PhilHealth. About 13 million members' records were reported leaked, and its antivirus licence had lapsed months before. If a national agency with an IT department can miss an attack, a provincial hospital with one IT person and no night shift has little chance. The Philippine Data Privacy Act still gives every organization 72 hours to notify the National Privacy Commission after discovering a breach.

Security operations centers are priced for banks. Machine-learning intrusion detectors that score 99% in the lab bury small teams in false alarms and quietly call new attacks "normal". We wanted to build the analyst these organizations cannot hire.

## What it does

NIGHTWATCH does the analyst's night shift in five steps:

1. **Monitor:** reads network flow logs (CICFlowMeter format) from a live replay of held-out traffic or an uploaded file.
2. **Detect:** a LightGBM model names the attack. Conformal prediction sends anything it cannot name with 95% confidence to *Needs review* instead of calling it normal.
3. **Prioritize:** groups alerts into incidents, ranks them Critical, High, Medium or Low, and tags the MITRE ATT&CK technique.
4. **Investigate:** explains each incident in plain words, shows the model's evidence with an innocent explanation beside every signal, and lists the first response steps.
5. **Report:** turns the analyst's decisions into a draft breach report with the NPC Circular 16-03 notification fields and the 72-hour deadline.

It never blocks traffic on its own. A person decides.

## How we built it

- **Data:** the corrected CIC-IDS2017 release (Liu et al., IEEE CNS 2022): 2,099,976 flows, 15 classes. More than 25% of flows in the original release were mislabeled or broken.
- **Evaluation that reflects deployment:** attacks are split by time inside each campaign (60/20/20) and normal traffic in whole 15-minute blocks, so the test set is later traffic, not shuffled neighbours.
- **Imbalance:** no reweighting, class-balanced weights and SMOTE compared; the strategy is chosen on calibration macro-F1, never on test.
- **Doubt:** Mondrian split-conformal prediction (95% per attack class, a 0.2% false-alert budget for normal traffic) plus an Isolation Forest trained on normal traffic.
- **Scoring in the web app:** the LightGBM trees, path-dependent TreeSHAP and the conformal layer are re-implemented in TypeScript, matching Python to within 0.000001 on 901 test flows, so there is no Python server to fail.
- **Product:** Next.js 16 on Vercel (functions in Singapore), Neon Postgres with Drizzle, Neon Auth, rate limits, an append-only audit log, uploads scored in memory and never stored.

## Results (held-out test split, 393,993 flows)

| Measure | Value |
| --- | ---: |
| Attack flows that raised an alert | 99.96% |
| Normal flows that raised a false alert | 0.42% |
| Attack flows missed | 0.039% |
| Macro-F1 over attack classes | 0.865 (0.868 without port and protocol) |
| Five replayed days | 102,268 alerts grouped into 471 incidents |
| Reviewing 10 incidents a day | reaches 19 of 22 real attack incidents (oldest-first: 16; model confidence alone: 1) |

## Challenges we ran into

- **Our first split flattered us.** Holding out the last 20% of each day made "review oldest first" look artificially good. We switched normal traffic to blocked 15-minute splits and retrained everything.
- **Too many false alerts.** A single 95% conformal level flagged 3.9% of normal flows. A pre-declared 0.2% budget for the normal class brought it to 0.42%, with the full trade-off curve published.
- **Unseen attacks.** Removing each attack family from training showed the honest picture: structurally new attacks (DDoS, Heartbleed) are flagged 100% of the time, but botnet, brute-force and port-scan traffic that imitates normal mostly passes. We show this on the Method page instead of hiding it.

## Accomplishments we're proud of

- A detector that says "I'm not sure" with a calibrated guarantee.
- A complete workflow from raw flows to a breach report draft a Data Protection Officer can act on.
- Lighthouse on the live site: desktop 100 in all four categories; mobile performance 98 to 99 with accessibility, best practices and SEO at 100.

## What we learned

Accuracy is the wrong headline for intrusion detection, a model's limits belong in the product, and the analyst's time is the scarcest resource.

## What's next

Testing on the corrected CSE-CIC-IDS2018 for drift, learning from analyst decisions, tuning the false-alert budget per site, and a pilot with a school or local government office.

## Built with

Python, LightGBM, scikit-learn, imbalanced-learn, SHAP, TypeScript, Next.js, React, Tailwind CSS, Neon Postgres, Neon Auth, Drizzle ORM, Vercel, Remotion, HyperFrames, ElevenLabs.

**Data and credits:** corrected CIC-IDS2017 (Liu, Engelen, Lynar, Essam, Joosen, IEEE CNS 2022; original dataset by Sharafaldin, Lashkari and Ghorbani, UNB CIC, 2018). MITRE ATT&CK® is a registered trademark of The MITRE Corporation.
