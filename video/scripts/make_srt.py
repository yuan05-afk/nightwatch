"""Writes out/nightwatch-demo.srt from the hand-written captions in src/timeline.json."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
tl = json.loads((ROOT / "src" / "timeline.json").read_text(encoding="utf-8"))


def ts(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


out = ROOT / "out" / "nightwatch-demo.srt"
out.parent.mkdir(exist_ok=True)
out.write_text("\n".join(f"{i + 1}\n{ts(c['start'])} --> {ts(c['end'])}\n{c['text']}\n" for i, c in enumerate(tl["captions"])), encoding="utf-8")
print("wrote", out, len(tl["captions"]), "cues")
