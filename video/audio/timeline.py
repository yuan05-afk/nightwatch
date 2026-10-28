"""
Builds src/timeline.json for the NIGHTWATCH demo: the single source of truth for picture, captions, SFX,
music and the HyperFrames scene timings. Same method as the GroundTruth timeline (../../audio/timeline_v3.py).

Inputs
  public/audio/words.json      word timings of the ElevenLabs narration (VO time)
  public/clips/*.events.json   timed events + element boxes logged while each clip was recorded
Anchors are authored in VO time. Paragraph gaps are widened (GAPS) so the picture can breathe; every VO time
is mapped to video time with v().
"""
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "src" / "timeline.json"
CLIPS = ROOT / "public" / "clips"
WJ = json.loads((ROOT / "public" / "audio" / "words.json").read_text())
WORDS, VO_DUR = WJ["words"], WJ["duration"]

VO_OFFSET = 1.0
# (VO time inside a silence, extra seconds of silence inserted there)
GAPS = [(22.7, 0.6), (26.7, 0.5), (34.3, 0.4), (46.2, 0.4), (56.1, 0.5), (64.3, 0.4), (75.4, 0.5), (78.7, 1.0), (86.6, 0.6), (94.2, 0.8), (108.6, 0.6), (124.4, 0.5)]
TAIL = 5.0


def v(t):
    return round(t + VO_OFFSET + sum(g for b, g in GAPS if t >= b), 3)


K = 1920 / 1440  # viewport CSS px -> 1920x1080 design px
DURATION = round(v(VO_DUR) + TAIL, 2)


def clip_info(name):
    evs = json.loads((CLIPS / f"{name}.events.json").read_text())
    first, boxes = {}, {}
    for e in evs:
        if e["type"] == "box":
            boxes[e["name"]] = {"x": round(e["x"] * K, 1), "y": round(e["y"] * K, 1), "w": round(e["w"] * K, 1), "h": round(e["h"] * K, 1), "t": e["t"]}
        else:
            first.setdefault(e["type"], e["t"])
    dur = float(subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(CLIPS / f"{name}.mp4")]).strip())
    return first, boxes, dur


# clip -> (anchor event, VO time that event should land on)
ANCHORS = {
    "nw_hook": ("firstCritical", 1.58),  # rows appear on "checking in"
    "nw_monitor": ("pick", 28.5),  # click lands on "recorded traffic"
    "nw_detect": ("hRec", 37.32),  # cursor reaches the tile on "recognized"
    "nw_prioritize": ("hT", 51.68),  # cursor on T1071 on "MITRE"
    "nw_capacity": ("dragEnd", 57.2),  # drag ends on "minutes"
    "nw_investigate": ("open", 65.62),  # click on "incident"
    "nw_report": ("confirm", 76.04),  # click on "Confirm"
    "nw_check": ("upload", 89.5),  # click on "Upload"
    "nw_method": ("toFlagged", 96.0),  # scroll starts just before "On traffic"
}


def para_start(t):
    return round(v(t) - 0.3, 3)


SCENES = {
    "hook": [0.0, round(v(7.6), 3)],
    "scale": [round(v(7.6), 3), round(v(17.0), 3)],
    "pain": [round(v(17.0), 3), round(v(23.40) - 0.35, 3)],
    "pivot": [round(v(23.40) - 0.35, 3), para_start(27.22)],
    "monitor": [para_start(27.22), para_start(34.82)],
    "detect": [para_start(34.82), para_start(46.60)],
    "prioritize": [para_start(46.60), para_start(56.54)],
    "capacity": [para_start(56.54), para_start(65.32)],
    "investigate": [para_start(65.32), para_start(76.04)],
    "report": [para_start(76.04), para_start(87.42)],
    "check": [para_start(87.42), para_start(94.58)],
    "method": [para_start(94.58), round(v(109.14) - 0.35, 3)],
    "built": [round(v(109.14) - 0.35, 3), round(v(125.16) - 0.45, 3)],
    "close": [round(v(125.16) - 0.45, 3), DURATION],
}

COVER = {
    "nw_hook": ["hook", "scale", "pain"],
    "nw_monitor": ["monitor"],
    "nw_detect": ["detect"],
    "nw_prioritize": ["prioritize"],
    "nw_capacity": ["capacity"],
    "nw_investigate": ["investigate"],
    "nw_report": ["report"],
    "nw_check": ["check"],
    "nw_method": ["method"],
}

clipStart, ev, boxes, problems = {}, {}, {}, []
for name, (anchor, vo_t) in ANCHORS.items():
    first, bx, dur = clip_info(name)
    cs = round(v(vo_t) - first[anchor], 3)
    clipStart[name] = cs
    ev[name] = {k: round(cs + t, 3) for k, t in first.items()}
    boxes[name] = {k: {**b, "t": round(cs + b["t"], 3)} for k, b in bx.items()}
    s = SCENES[COVER[name][0]][0]
    e = SCENES[COVER[name][-1]][1]
    if cs > s - 0.25 + 0.02:  # wipes start 0.2 s early
        problems.append(f"{name}: clip starts {cs - (s - 0.25):.2f}s after its first scene begins")
    if cs + dur < e + 0.6:
        problems.append(f"{name}: clip ends {e + 0.6 - (cs + dur):.2f}s too early (clip {dur:.1f}s)")
if problems:
    print("COVERAGE PROBLEMS")
    for p in problems:
        print("  -", p)

# ------------------------------------------------------------------ captions (VO times of first and last word)
CAPS = [
    (0.00, 3.66, "A computer inside this network starts checking in with an outside server, again and again."),
    (4.46, 5.30, "It's a botnet taking orders."),
    (5.94, 6.48, "And nobody is watching."),
    (8.20, 10.02, "In 2023, ransomware hit PhilHealth."),
    (11.08, 12.68, "About 13 million members' records leaked."),
    (13.60, 16.00, "And the law gives you 72 hours to report a breach."),
    (17.52, 20.50, "Most hospitals, schools and town halls have no security team."),
    (21.22, 22.02, "So who's watching at night?"),
    (23.40, 26.12, "Nightwatch is the night-shift security analyst they can't afford."),
    (27.22, 28.98, "Choose a day of real recorded traffic."),
    (30.00, 33.28, "Nightwatch scores every connection as it streams in, in a fraction of a millisecond."),
    (34.82, 35.84, "Each one gets one of three labels."),
    (37.26, 37.76, "A recognized attack."),
    (38.20, 40.86, "Needs review, when it fits nothing the model knows."),
    (41.20, 42.82, "Or cleared as normal."),
    (44.14, 45.56, "The unknown is never silently dropped."),
    (46.60, 47.56, "Related alerts become one incident,"),
    (47.96, 52.24, "ranked Critical, High, Medium or Low, with its MITRE ATT&CK technique."),
    (53.76, 55.50, "Botnet traffic goes straight to the top."),
    (56.54, 57.20, "Only have 30 minutes?"),
    (59.04, 60.32, "The capacity line shows what fits,"),
    (60.56, 63.26, "and how many real attacks you reach, compared with oldest first."),
    (65.32, 65.68, "Open an incident."),
    (66.66, 67.56, "What happened, in plain words."),
    (68.76, 71.48, "The evidence behind the alert, each with an innocent explanation."),
    (73.90, 74.50, "And what to do first."),
    (76.04, 78.48, "Confirm the threat, and Nightwatch drafts the incident report."),
    (78.92, 81.02, "A timeline, the affected hosts,"),
    (81.88, 83.60, "the four fields the Privacy Commission asks for,"),
    (84.48, 85.58, "and the 72-hour deadline."),
    (87.42, 87.88, "Have your own logs?"),
    (89.50, 90.02, "Upload a flow export."),
    (91.30, 93.78, "It's scored by the same model, in memory, and never stored."),
    (94.58, 94.94, "Nothing is hidden."),
    (96.40, 100.30, "On traffic from later in time, it flags 99.96% of attacks."),
    (101.58, 103.70, "Hide a whole attack family, and it still catches floods,"),
    (104.24, 105.64, "but misses traffic that imitates normal."),
    (106.62, 108.02, "The method page says so."),
    (109.14, 110.60, "We built Nightwatch for DataNova 2026."),
    (112.80, 115.58, "A LightGBM model, trained on a corrected public intrusion dataset,"),
    (116.12, 118.16, "with conformal prediction to measure doubt."),
    (119.42, 121.56, "It runs in TypeScript inside a Next.js app,"),
    (121.92, 123.58, "on Neon Postgres and Neon Auth."),
    (125.16, 125.16, "Nightwatch."),
    (126.78, 128.84, "Your team goes home. Nightwatch stays on."),
]


def word_at(t):
    return min(WORDS, key=lambda w: abs(w["start"] - t))


def speech_envelope():
    import numpy as np

    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(ROOT / "public" / "audio" / "vo.mp3"), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"])
    y = np.frombuffer(raw, dtype=np.float32)
    hop = 320  # 20 ms
    n = len(y) // hop
    env = np.sqrt((y[: n * hop].reshape(n, hop) ** 2).mean(axis=1))
    return env, 0.12 * float(np.percentile(env, 95)), hop / 16000


ENV, ENV_THR, ENV_DT = speech_envelope()


def snap_start(t):
    """Whisper word starts can sit in the silence before the word; slide to the first real energy within 0.7 s."""
    i0 = int(t / ENV_DT)
    if ENV[min(i0 + 3, len(ENV) - 1)] > ENV_THR:
        return t
    for i in range(i0, min(i0 + int(0.7 / ENV_DT), len(ENV))):
        if ENV[i] > ENV_THR:
            return i * ENV_DT
    return t


captions = []
for i, (a, b, text) in enumerate(CAPS):
    wa, wb = word_at(a), word_at(b)
    start = snap_start(wa["start"]) - 0.04
    end = wb["end"] + 0.32
    limit = word_at(CAPS[i + 1][0])["start"] - 0.07 if i + 1 < len(CAPS) else 1e9
    end = min(end, limit)
    if end - start < 0.8:
        end = min(start + 0.8, limit)
    captions.append({"start": v(start), "end": v(end), "text": text})

# ------------------------------------------------------------------ named times used by the scenes (video time)
B = boxes
T = {
    "philhealth": v(8.30),
    "records13m": v(11.08),
    "hours72": v(14.30),
    "orgTags": [v(17.68), v(18.60), v(19.12)],
    "question": v(21.22),
    "pivotMark": v(23.40),
    "monFriday": v(27.22),
    "monProgress": v(30.0),
    "monSpeed": v(32.46),
    "detRec": v(37.26),
    "detRev": v(38.20),
    "detClr": v(41.20),
    "detDrop": v(44.14),
    "priIncidents": v(46.60),
    "priSev": v(47.96),
    "priTcode": v(51.50),
    "priTop": v(53.76),
    "capOnly": v(56.54),
    "capFits": v(59.04),
    "capCompare": v(60.56),
    "invWhat": v(66.66),
    "invEvidence": max(v(68.76), B["nw_investigate"]["evidence"]["t"]),
    "invBenign": max(v(70.60), B["nw_investigate"]["benign"]["t"]),
    "invResponse": max(v(73.90), B["nw_investigate"]["response"]["t"]),
    "repDraft": max(v(77.20), B["nw_report"]["deadline"]["t"]),
    "repTimeline": max(v(78.92), B["nw_report"]["timeline"]["t"]),
    "repHosts": max(v(80.62), B["nw_report"]["hosts"]["t"]),
    "repNpc": max(v(81.88), B["nw_report"]["npc"]["t"]),
    "repDeadline": max(v(84.48), B["nw_report"]["deadline2"]["t"]),
    "chkResults": max(v(91.30), ev["nw_check"]["results"] + 0.2),
    "chkStored": v(92.70),
    "metHidden": v(94.58),
    "metFlagged": max(v(98.0), B["nw_method"]["flagged"]["t"]),
    "metFamilies": max(v(101.58), B["nw_method"]["families"]["t"]),
    "metDdos": max(v(103.38), B["nw_method"]["ddos"]["t"]),
    "metBotnet": max(v(104.44), B["nw_method"]["botnet"]["t"]),
    "metSays": v(106.62),
    "built": [v(109.14), v(112.80), v(114.58), v(116.72), v(119.66), v(122.24)],
    "builtBanner": v(121.6),
    "closeMark": v(125.16),
    "line1": v(126.78),
    "line2": v(128.28),
    "cta": round(v(VO_DUR) + 0.3, 3),
    "click": round(v(VO_DUR) + 2.0, 3),
}

# ------------------------------------------------------------------ sfx
sfx = []
add = lambda t, typ, gain=0.5, pitch=1.0: sfx.append({"t": round(t, 3), "type": typ, "gain": gain, **({"pitch": pitch} if typ in ("pop", "ping") else {})})

add(0.35, "whoosh", 0.35)
add(ev["nw_hook"]["firstCritical"], "pop", 0.55, 1.0)
add(v(6.9), "thud", 0.6)
add(T["philhealth"], "pop", 0.55, 1.0)
add(T["records13m"], "pop", 0.55, 1.2)
add(T["hours72"], "pop", 0.55, 1.4)
for i, t in enumerate(T["orgTags"]):
    add(t, "pop", 0.45, [1.0, 1.12, 1.26][i])
add(T["question"], "tick", 0.6)
add(SCENES["pivot"][0] - 0.35, "whoosh", 0.6)
add(SCENES["pivot"][0], "boom", 0.7)
add(SCENES["pivot"][0] + 0.02, "ping", 0.5, 1.0)
for name in ("monitor", "detect", "prioritize", "capacity", "investigate", "report", "check", "method"):
    add(SCENES[name][0] - 0.2, "whoosh", 0.5)
add(ev["nw_monitor"]["pick"], "click", 0.6)
add(T["monSpeed"], "pop", 0.45, 1.3)
for i, k in enumerate(("detRec", "detRev", "detClr")):
    add(T[k], "pop", 0.5, [1.0, 1.2, 1.4][i])
add(T["detDrop"], "pop", 0.45, 1.6)
add(T["priSev"], "pop", 0.45, 1.0)
add(T["priTcode"], "pop", 0.45, 1.2)
add(T["priTop"], "pop", 0.45, 1.4)
add(ev["nw_capacity"]["drag"], "click", 0.5)
add(T["capFits"], "pop", 0.45, 1.2)
add(T["capCompare"], "pop", 0.45, 1.4)
add(ev["nw_investigate"]["open"], "click", 0.6)
add(ev["nw_investigate"]["open"] + 0.3, "swish", 0.45)
add(T["invEvidence"], "pop", 0.45, 1.1)
add(T["invResponse"], "pop", 0.45, 1.3)
add(ev["nw_report"]["confirm"], "click", 0.6)
add(ev["nw_report"]["close"], "click", 0.45)
add(ev["nw_report"]["create"], "click", 0.6)
add(T["repTimeline"], "pop", 0.45, 1.0)
add(T["repNpc"], "pop", 0.45, 1.2)
add(T["repDeadline"], "pop", 0.5, 1.4)
add(T["repDeadline"] + 0.1, "ping", 0.3, 1.5)
add(ev["nw_check"]["upload"], "click", 0.6)
add(T["chkResults"], "pop", 0.45, 1.2)
add(T["chkStored"], "pop", 0.45, 1.4)
add(T["metHidden"], "pop", 0.45, 1.0)
add(T["metFlagged"], "pop", 0.5, 1.2)
add(T["metFamilies"], "pop", 0.45, 1.3)
add(T["metBotnet"], "pop", 0.45, 1.5)
add(SCENES["built"][0] - 0.25, "whoosh", 0.6)
for i, t in enumerate(T["built"]):
    add(t + 0.15, "pop", 0.5, [1.0, 1.1, 1.25, 1.4, 1.55, 1.8][i])
add(SCENES["close"][0] - 0.3, "whoosh", 0.6)
add(SCENES["close"][0] + 0.05, "boom", 0.8)
add(SCENES["close"][0] + 0.08, "ping", 0.55, 1.0)
add(T["line1"], "ping", 0.3, 1.5)
add(T["line2"], "ping", 0.3, 2.0)
add(T["click"], "click", 0.6)

tickRuns = [
    {"from": ev["nw_capacity"]["drag"], "to": ev["nw_capacity"]["dragEnd"], "count": 9, "gain": 0.22, "pitch": [1.3, 0.8]},
    {"from": T["records13m"], "to": T["records13m"] + 0.9, "count": 12, "gain": 0.24, "pitch": [0.8, 1.5]},
]

tl = {
    "fps": 30,
    "duration": DURATION,
    "voOffset": VO_OFFSET,
    "gaps": GAPS,
    "scenes": SCENES,
    "clipStart": clipStart,
    "ev": ev,
    "box": boxes,
    "t": T,
    "captions": captions,
    "sfx": sfx,
    "tickRuns": tickRuns,
    "music": {
        "sections": [0, SCENES["scale"][0], SCENES["pain"][0], SCENES["pivot"][0], SCENES["detect"][0], SCENES["close"][0], DURATION],
        "close": SCENES["close"][0],
        "groove": [SCENES["detect"][0], SCENES["close"][0] - 0.3],
        "clock": [SCENES["pain"][0], SCENES["pivot"][0] - 0.2],
        "risers": [[SCENES["scale"][0], 2.0], [SCENES["pivot"][0], 2.0], [SCENES["detect"][0], 1.5], [SCENES["built"][0], 1.5], [SCENES["close"][0], 2.2]],
    },
}
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(tl, indent=1))
print("wrote", OUT, "duration", DURATION, f"({int(DURATION // 60)}:{DURATION % 60:04.1f})")
for k, (a, b) in SCENES.items():
    print(f"  {k:11s} {a:7.2f} -> {b:7.2f}  ({b - a:5.1f}s)")
