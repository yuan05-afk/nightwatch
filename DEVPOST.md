# Devpost submission: copy-paste guide

Every field of the DataNova 2026 submission form, in order. Character counts were checked against the form's limits.
The story follows the eight items the official rules require (overview, problem, solution, stack, demonstration,
results, impact, team contributions) and acknowledges all third-party data and libraries.

---

## General info

**Project name** (45 of 60 characters)

```
NIGHTWATCH: Your Night-Shift Security Analyst
```

**Elevator pitch** (193 of 200 characters)

```
Intrusion detection for hospitals, schools and town halls with no security team. It flags 99.96% of attacks, says when it's unsure, ranks what to fix first and drafts the 72-hour breach report.
```

---

## Project story: About the project

Paste everything between the two lines below.

---

## Project overview

NIGHTWATCH is a night-shift security analyst for organizations that cannot afford one. It watches network traffic, explains every alert in plain language, ranks what to fix first, and drafts the breach report the Philippine Data Privacy Act requires within 72 hours. It is built for provincial hospitals, schools, local governments and small businesses that have no security team.

**Try it:** [nightwatch-olive.vercel.app](https://nightwatch-olive.vercel.app). On the sign-in page, press **Use the judge demo account**, start the Friday replay, and open the first Critical incident.

## Inspiration and problem statement

In September 2023, the Medusa ransomware group hit PhilHealth. About 13 million members' records were reported leaked, and its antivirus licence had lapsed months before. If a national agency with an IT department can miss an attack, a provincial hospital with one IT person and no night shift has little chance. The law still gives every organization 72 hours to notify the National Privacy Commission after discovering a breach (NPC Circular 16-03; GDPR Article 33 sets the same window).

Three jobs go unstaffed in these organizations:

- **Noticing the attack.** Detection tools fire thousands of alerts a day; 46% of security alerts are false positives even in staffed security operations centers, and 73% of security teams name false positives their top problem.
- **Deciding what comes first.** An IT generalist may have half an hour a day for security. Reviewing alerts oldest-first spends it on noise.
- **Reporting in time.** The NPC asks for the nature of the breach, the personal data involved, the measures taken and a contact person, within 72 hours.

Machine-learning intrusion detectors often make this worse. They report 99% accuracy on shuffled benchmark data, quietly label attacks they have never seen as normal, and give the one IT person no reason to trust or doubt an alert. More than 25% of the flows in the original CIC-IDS2017 benchmark were mislabeled or broken (Engelen et al. 2021; Liu et al. 2022).

## Proposed solution

NIGHTWATCH does the analyst's night shift in five steps:

1. **Monitor:** reads network flow logs (CICFlowMeter format) from a live replay of held-out traffic, or an uploaded file scored in memory and never stored.
2. **Detect:** a LightGBM model names the attack. Conformal prediction sends anything it cannot name with 95% confidence to *Needs review* instead of calling it normal.
3. **Prioritize:** groups alerts into incidents, ranks them Critical, High, Medium or Low, and tags the MITRE ATT&CK technique. An analyst-capacity slider shows which incidents fit in the time available.
4. **Investigate:** explains each incident in plain words, shows the model's evidence (TreeSHAP) with an innocent explanation beside every signal, and lists the first response steps.
5. **Report:** turns the analyst's decisions into a draft breach report with the NPC notification fields, a timeline, affected hosts and the 72-hour deadline, marked as a draft for the Data Protection Officer.

NIGHTWATCH never blocks traffic on its own. It says what happened, how sure it is and what to do first; a person decides.

### How we built it

- **Data:** the corrected CIC-IDS2017 release (DistriNet, IEEE CNS 2022): 2,099,976 flows, 15 classes. Flows labelled "Attempted" are treated as benign, as the dataset's authors recommend. IP addresses, source ports, flow IDs and timestamps are removed; 83 flow features remain.
- **Splits that reflect deployment:** attack flows are split by time inside each campaign (first 60% train, next 20% calibrate, last 20% test); normal traffic is split in whole 15-minute blocks. The test set is later traffic, not shuffled neighbours.
- **Imbalance:** no reweighting, class-balanced weights and SMOTE were compared. The strategy was chosen on calibration macro-F1, never on test (class-balanced won).
- **Calibrated doubt:** Mondrian split-conformal prediction gives each class $k$ its own threshold $\hat q_k$, the conformal quantile of the calibration scores $1 - \hat p_k(x)$ for that class. A flow's prediction set is $C(x) = \{\, k : 1 - \hat p_k(x) \le \hat q_k \,\}$. One attack label means a recognized attack, only "benign" means cleared, and anything else goes to *Needs review*. Attack classes use $\alpha = 0.05$; normal traffic uses a stricter, pre-declared false-alert budget of $\alpha = 0.002$. An Isolation Forest trained on normal traffic is a narrow backstop.
- **The model inside the web app:** the LightGBM trees, path-dependent TreeSHAP, the Isolation Forest and the conformal layer are re-implemented in TypeScript. A parity test shows they match Python to within 0.000001 on 901 test flows, so there is no Python server to fail during judging.
- **Product:** Next.js 16 on Vercel (functions in Singapore, next to the database), Neon Postgres with Drizzle ORM, Neon Auth accounts, server-side checks on every data route, rate limits, and an append-only audit log of analyst decisions.

## Technology stack

- **Machine learning:** Python 3.12 (uv), pandas, NumPy, LightGBM, scikit-learn, imbalanced-learn, SHAP, pytest
- **Scoring engine:** TypeScript (tree evaluation, TreeSHAP, Isolation Forest, Mondrian conformal), Vitest
- **Web:** Next.js 16, React 19, Tailwind CSS 4, IBM Plex
- **Data and accounts:** Neon Postgres, Drizzle ORM, Neon Auth (managed Better Auth)
- **Hosting:** Vercel (`sin1`)
- **Dataset:** corrected CIC-IDS2017; labels mapped to MITRE ATT&CK techniques
- **Demo video:** Remotion, HyperFrames, ElevenLabs narration, Playwright screen capture

## Implementation and demonstration

- **Live demo:** [nightwatch-olive.vercel.app](https://nightwatch-olive.vercel.app), with the judge demo account on the sign-in page
- **Source code:** [github.com/yuan05-afk/nightwatch](https://github.com/yuan05-afk/nightwatch), with the ML pipeline, web app, deck generator and video sources
- **Method page:** [/method](https://nightwatch-olive.vercel.app/method) lists every number, ablation and limit, generated by the public pipeline
- **Video:** the 2:22 demo above walks the full workflow on the live product
- **Reproducible:** `uv run python -m nightwatch_ml.pipeline` regenerates every reported number; the deck reads its figures from the same reports

## Results and validation

Held-out test split, 393,993 flows from later in time than training:

- **99.96%** of attack flows raised an alert
- **0.42%** of normal flows raised a false alert
- **0.039%** of attack flows were missed
- **0.865** macro-F1 over attack classes; **0.868** when destination port and protocol are removed, so the model is not just reading port numbers
- **The accuracy illusion:** the same model scores 99.99% accuracy on a shuffled split, which is why accuracy is never our headline
- **Prioritization:** across five replayed days, 102,268 alerts were grouped into 471 incidents. Reviewing 10 incidents a day in NIGHTWATCH's order reaches 19 of 22 real attack incidents, against 16 for oldest-first and 1 for trusting model confidence alone
- **Unseen attacks (leave-one-family-out):** each attack family was removed from training and the pipeline rebuilt. DDoS and Heartbleed were still flagged 100% of the time; botnet, brute-force and port-scan traffic, which imitates normal traffic, mostly passed. We show this on the Method page and say it in the video
- **Engineering checks:** 28 Python tests (labels, splits, conformal coverage), 14 web tests (scoring parity, CSV parsing, ranking, safe redirects). Lighthouse on the live site: desktop 100 in all four categories; mobile performance 98 to 99 with accessibility, best practices and SEO at 100

## Potential impact

- **Who benefits:** provincial hospitals, schools, local government units and small businesses in the Philippines and similar settings, which face the same attackers as banks with none of the staff.
- **Feasibility:** flow logs come from the free CICFlowMeter tool; the app runs on free tiers of Vercel and Neon for a pilot; there is nothing to install beyond a browser.
- **Scalability:** scoring is a pure TypeScript function that runs at a fraction of a millisecond per connection inside serverless functions; sessions and decisions live in Postgres.
- **Measurable benefit:** fewer things to look at (alerts grouped into incidents), the right things first (severity-first ranking), and a report draft ready inside the 72-hour window.

## Challenges we ran into

- **Our first split flattered us.** Holding out the last 20% of each day made "review oldest first" look artificially good. We switched normal traffic to blocked 15-minute splits and retrained everything.
- **Too many false alerts.** A single 95% conformal level flagged 3.9% of normal flows. A pre-declared budget for the normal class brought it to 0.42%, and the full trade-off curve is published.
- **Honest limits.** The unseen-attack test showed that mimicry attacks slip through. We kept that result in the product instead of hiding it.

## What we learned

Accuracy is the wrong headline for intrusion detection. A model's limits belong in the product, not a footnote. And the analyst's time, not the model, is the scarcest resource in a small organization.

## Responsible AI, privacy and security

- Human in the loop: no automatic blocking; every action is a recommendation.
- Uncertainty is shown, never hidden: doubtful traffic goes to *Needs review* with its reason.
- Uploaded logs are processed in memory and never stored; IP addresses are hashed in the audit log.
- Breach reports are drafts for the organization's Data Protection Officer, not legal advice.
- Limits disclosed: one public lab dataset from 2017; attacks that imitate normal traffic can slip through.

## What's next

Testing on the corrected CSE-CIC-IDS2018 for drift, learning from analyst decisions to cut repeat false alarms, tuning the false-alert budget per site, and a pilot with a school or local government office.

## Team contributions

- **Yuan Andrei C. Mariano** (@yuan05-afk): concept and product design, ML pipeline and evaluation, TypeScript scoring engine, web app and deployment, presentation and demo video.
- **Alicia Jhyle Vilale** (@asvilale): research and problem framing (the PhilHealth case, NPC breach rules, sources and target users), testing and quality assurance of the live demo and its claims.
- **@ymir-hackathon:** _[add this teammate's name and contribution before submitting]_

## Acknowledgements

- **Data:** corrected CIC-IDS2017 by Liu, Engelen, Lynar, Essam and Joosen (IEEE CNS 2022); original dataset by Sharafaldin, Lashkari and Ghorbani (UNB CIC, 2018).
- **Methods:** split conformal prediction (Vovk et al.; Angelopoulos and Bates, 2021), Isolation Forest (Liu, Ting and Zhou, 2008), TreeSHAP (Lundberg et al., 2020), LightGBM (Ke et al., 2017), evaluation pitfalls from Arp et al. (USENIX Security 2022).
- **Open-source libraries:** all listed under Technology stack, used under their licences.
- **MITRE ATT&CK®** is a registered trademark of The MITRE Corporation.
- **Tools:** development was assisted by AI coding tools (Claude Code); every reported number comes from our own pipeline and is checked against its reports. Narration voiced with ElevenLabs.

---

## Built with (25 of 25 tags)

```
python, lightgbm, scikit-learn, imbalanced-learn, shap, pandas, numpy, pytest, typescript, next.js, react, tailwindcss, node.js, neon, postgresql, drizzle-orm, better-auth, vercel, vitest, playwright, cic-ids2017, mitre-attack, remotion, hyperframes, elevenlabs
```

## "Try it out" links

1. `https://nightwatch-olive.vercel.app` (live demo)
2. `https://github.com/yuan05-afk/nightwatch` (source code)
3. `https://nightwatch-olive.vercel.app/method` (method and results)
4. Your Google Slides link (presentation)

## Image gallery (3:2, all under 5 MB)

Upload `submission/gallery/` in this order; the first image becomes the project thumbnail:

1. `01-nightwatch.jpg`: landing page
2. `02-security-console.jpg`: live console, botnet ranked Critical
3. `03-investigate.jpg`: plain-language investigation with ATT&CK and response steps
4. `04-incident-report.jpg`: draft breach report with the 72-hour deadline
5. `05-check-your-network.jpg`: upload your own flow logs
6. `06-unseen-attacks.jpg`: the leave-one-family-out test, misses included
7. `07-accuracy-illusion.jpg`: shuffled vs time-ordered evaluation
8. `08-says-im-not-sure.jpg`: 99.96% flagged, 0.42% false alerts
9. `09-what-it-misses.jpg`: what it catches and misses
10. `10-ranked-list.jpg`: 19 of 22 attack incidents reached

## Video demo link

Upload `video/out/nightwatch-demo.mp4` to YouTube (Public or Unlisted) or Vimeo, then paste the link. Suggested upload details:

- **Title:** NIGHTWATCH: Your Night-Shift Security Analyst (DataNova 2026 demo)
- **Description:** Network intrusion detection for hospitals, schools and town halls with no security team. Live demo: https://nightwatch-olive.vercel.app (judge demo account on the sign-in page). Code: https://github.com/yuan05-afk/nightwatch
- **Subtitles:** upload `video/out/nightwatch-demo.srt`
- **Thumbnail:** `video/out/thumbnail.png`

## Additional info: upload a file

Upload `submission/NIGHTWATCH-DataNova2026-submission.zip` (under the 35 MB limit). It holds the presentation (PPTX and PDF), documentation, the evaluation reports and a snapshot of the source code, which is what the DN-CY-01 problem statement asks teams to submit.
