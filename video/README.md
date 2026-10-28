# NIGHTWATCH demo video

A 2:22 product demo for DataNova 2026, made with the same method as the GroundTruth demo
(`../../GROUNDTRUTH_VIDEO_DOCUMENTATION.md`), with HyperFrames added for the motion-graphic scenes.

| Item | Value |
| --- | --- |
| Output | `out/nightwatch-demo.mp4` (142.4 s, 1920x1080, 30 fps, H.264 CRF 16, AAC 48 kHz), `out/nightwatch-demo.srt` (45 cues), `out/thumbnail.png` |
| Measured | -17.0 LUFS integrated, true peak -1.4 dBFS, LRA 3.2 LU; no silence over 2 s; only freeze is the 4 s end-card hold |
| Narration | ElevenLabs, voice "Marcus – Clear Canadian Professional" (`6WjhCXzqp2hnSqFtrG8P`), `eleven_multilingual_v2`, one take (take B of two; take A dropped words) |
| Footage | Real recordings of the live site, https://nightwatch-olive.vercel.app, signed in with the judge demo account |
| Motion graphics | HyperFrames (HTML + GSAP): wordmark reveal, "what we built", end card |
| Assembly | Remotion 4.0.532: footage, virtual camera, chapter chips, self-drawing boxes, captions, audio |
| Music and SFX | Procedural, from the GroundTruth synth (96 BPM, D minor to D major), ducked about 8 dB under the voice |

## Structure

| Time | Block | Picture |
| --- | --- | --- |
| 0:00 | Hook | A botnet appears in a live replay |
| 0:09 | Scale | PhilHealth 2023, 13M records, 72 hours |
| 0:18 | Pain | Hospitals, schools, town halls: who's watching at night? |
| 0:25 | Pivot | Wordmark (HyperFrames) |
| 0:29 to 1:56 | Demo, 01 to 08 | Monitor, Detect, Prioritize, Your time, Investigate, Report, Your network, The method |
| 1:56 | Built | Four cards (HyperFrames) |
| 2:13 | Close | Tagline, console button, live URL, repo (HyperFrames) |

The method chapter shows what the model misses on the screen and says it aloud.

## Rebuild

From this folder (needs Node, Python with numpy, scipy and faster-whisper, ffmpeg, and the HyperFrames plugin):

```bash
npm install
node capture/record.mjs            # records public/clips/*.mp4 + *.events.json from the live site
python audio/align_vo.py public/audio/vo.mp3 public/audio/words.json
python audio/timeline.py           # src/timeline.json: the single source of truth (prints a coverage check)
python audio/build_audio.py        # public/audio/mix.wav
node scripts/render_hf.mjs         # public/hf/{pivot,built,close}.mp4 via the HyperFrames plugin CLI
node scripts/stills.mjs            # spot-check sheets in out/stills/
npx remotion render src/index.ts NightwatchDemo out/nightwatch-demo.mp4
python scripts/make_srt.py
```

Notes from production:

- The first scan batch already contains the botnet rows, so the hook recording pauses the replay right after it starts and resumes it off-screen on cue.
- The report recording pauses the scan before opening an incident: the drawer's related-incidents list grows while streaming and moves the decision buttons under the cursor.
- "Create incident report" enables only after the console's next status refresh, so the recorder waits for it.
- During recording the floating nav scrolls with the page instead of staying fixed, so scrolled frames are not overlaid by text showing through it.
