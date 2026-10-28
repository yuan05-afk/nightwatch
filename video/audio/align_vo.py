"""Word-level timings for the ElevenLabs narration (local forced-ish alignment via faster-whisper)."""
import json
import sys
from pathlib import Path

import subprocess

import numpy as np
from faster_whisper import WhisperModel

ROOT = Path(__file__).resolve().parent.parent
src = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "public" / "audio" / "vo.mp3"
out = Path(sys.argv[2]) if len(sys.argv) > 2 else ROOT / "public" / "audio" / "words.json"

model = WhisperModel("small.en", device="cpu", compute_type="int8")
raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(src), "-f", "f32le", "-ac", "1", "-ar", "16000", "-"])
audio = np.frombuffer(raw, dtype=np.float32)
segments, info = model.transcribe(
    audio,
    word_timestamps=True,
    language="en",
    vad_filter=False,
    condition_on_previous_text=False,
    initial_prompt="Nightwatch, PhilHealth, botnet, MITRE attack, Privacy Commission, LightGBM, DataNova, conformal prediction, TypeScript, Next JS, Neon Postgres, Neon Auth.",
)
words = []
for seg in segments:
    for w in seg.words:
        words.append({"text": w.word.strip(), "start": round(w.start, 3), "end": round(w.end, 3)})
out.write_text(json.dumps({"duration": info.duration, "words": words}, indent=1))
print(len(words), "words,", round(info.duration, 2), "s")
print(" ".join(f"{w['text']}@{w['start']:.2f}" for w in words))
