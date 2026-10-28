# NIGHTWATCH demo video: script

Target about 2:20, 1920x1080 at 30 fps. Same production method as the GroundTruth demo
(`../../GROUNDTRUTH_VIDEO_DOCUMENTATION.md`): real recordings of the live product, one ElevenLabs take
(voice "Marcus – Clear Canadian Professional", `eleven_multilingual_v2`), hand-written captions, one
generated timeline driving picture, captions, sound effects and music.

Every claim below traces to `ml/reports/*.json` or `docs/RESEARCH.md`. No clock time is claimed for the
hook: the replay shows dataset timestamps converted to the viewer's time zone.

| # | Block | Picture | Narration (as captioned) |
|---|---|---|---|
| 1 | Hook | Console, Friday replay: a Critical botnet incident appears | A computer inside this network starts checking in with an outside server, again and again. It's a botnet taking orders. And nobody is watching. |
| 2 | Scale | Same footage dimmed, two stat cards | In 2023, ransomware hit PhilHealth. About 13 million members' records leaked. And the law gives you 72 hours to report a breach. |
| 3 | Pain | Incidents piling up | Most hospitals, schools and town halls have no security team. So who's watching at night? |
| 4 | Pivot | HyperFrames: wordmark reveal | Nightwatch is the night-shift security analyst they can't afford. |
| 5 | 01 Monitor | Start page, pick Friday, counters run | Choose a day of real recorded traffic. Nightwatch scores every connection as it streams in, in a fraction of a millisecond. |
| 6 | 02 Detect | Boxes on the three verdict tiles | Each one gets one of three labels. A recognized attack. Needs review, when it fits nothing the model knows. Or cleared as normal. The unknown is never silently dropped. |
| 7 | 03 Prioritize | Incident table, severity and ATT&CK | Related alerts become one incident, ranked Critical, High, Medium or Low, with its MITRE ATT&CK technique. Botnet traffic goes straight to the top. |
| 8 | 04 Your time | Capacity slider and comparison | Only have 30 minutes? The capacity line shows what fits, and how many real attacks you reach, compared with oldest first. |
| 9 | 05 Investigate | Investigation panel | Open an incident. What happened, in plain words. The evidence behind the alert, each with an innocent explanation. And what to do first. |
| 10 | 06 Report | Confirm, then the incident report | Confirm the threat, and Nightwatch drafts the incident report. A timeline, the affected hosts, the four fields the Privacy Commission asks for, and the 72-hour deadline. |
| 11 | 07 Your network | Check your network, sample upload | Have your own logs? Upload a flow export. It's scored by the same model, in memory, and never stored. |
| 12 | 08 The method | Method page: results, zero-day test | Nothing is hidden. On traffic from later in time, it flags 99.96% of attacks. Hide a whole attack family, and it still catches floods, but misses traffic that imitates normal. The method page says so. |
| 13 | Built | HyperFrames: four cards | We built Nightwatch for DataNova 2026. A LightGBM model, trained on a corrected public intrusion dataset, with conformal prediction to measure doubt. It runs in TypeScript inside a Next.js app, on Neon Postgres and Neon Auth. |
| 14 | Close | HyperFrames: end card with URL and repo | Nightwatch. Your team goes home. Nightwatch stays on. |
