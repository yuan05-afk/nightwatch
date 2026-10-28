"""
Synth helpers shared by the NIGHTWATCH audio build: procedural pads, plucks, bells, drums and UI sound
effects. Copied from the GroundTruth demo (../../audio/build_audio.py) so both films sound alike;
call configure(duration) before using silence(), place() or smooth_ramp().
"""
import json
import subprocess
from pathlib import Path

import numpy as np
from scipy import signal
from scipy.io import wavfile

ROOT = Path(__file__).resolve().parent.parent
AUDIO = ROOT / "public" / "audio"
SR = 48000
DUR = 1.0  # set by configure()
N = int(SR * DUR)
rng = np.random.default_rng(7)


def silence():
    return np.zeros((N, 2), dtype=np.float64)


def place(buf, mono, t, pan=0.0, gain=1.0):
    i = int(t * SR)
    if i >= N:
        return
    seg = mono[: N - i] * gain
    l = np.cos((pan + 1) * np.pi / 4)
    r = np.sin((pan + 1) * np.pi / 4)
    buf[i : i + len(seg), 0] += seg * l
    buf[i : i + len(seg), 1] += seg * r


def lp(x, f, order=2):
    b, a = signal.butter(order, f / (SR / 2), "low")
    return signal.lfilter(b, a, x)


def hp(x, f, order=2):
    b, a = signal.butter(order, f / (SR / 2), "high")
    return signal.lfilter(b, a, x)


def bp(x, lo, hi, order=2):
    b, a = signal.butter(order, [lo / (SR / 2), hi / (SR / 2)], "band")
    return signal.lfilter(b, a, x)


def mtof(m):
    return 440.0 * 2 ** ((m - 69) / 12)


def tt(dur):
    return np.arange(int(SR * dur)) / SR


def env_adsr(n, a, r):
    e = np.ones(n)
    ai, ri = int(a * SR), int(r * SR)
    if ai > 0:
        e[:ai] = np.linspace(0, 1, ai) ** 1.5
    if ri > 0 and ri < n:
        e[-ri:] *= np.linspace(1, 0, ri) ** 1.5
    return e


def reverb(buf, wet=0.3, length=2.4, damp=3500):
    n = int(length * SR)
    t = np.arange(n) / SR
    out = np.zeros_like(buf)
    for ch in range(2):
        ir = rng.standard_normal(n) * np.exp(-t * 2.6)
        ir = lp(ir, damp, 1)
        ir[: int(0.012 * SR)] *= np.linspace(0, 1, int(0.012 * SR))
        ir /= np.sqrt(np.sum(ir**2)) + 1e-9
        out[:, ch] = signal.fftconvolve(buf[:, ch], ir)[: len(buf)]
    return buf * (1 - wet * 0.5) + out * wet


# ---------------------------------------------------------------- VO
# ---------------------------------------------------------------- Music
def pad_note(freq, dur):
    t = tt(dur)
    s = np.zeros_like(t)
    for det in (-0.07, 0.0, 0.07):
        f = freq * 2 ** (det / 12)
        s += signal.sawtooth(2 * np.pi * f * t + rng.random() * 6.28) * 0.33
    s += np.sin(2 * np.pi * freq * t) * 0.5
    s = lp(s, 1100 + freq * 0.5)
    return s * env_adsr(len(s), 1.4, 1.8)


def pluck(freq, dur=1.6):
    t = tt(dur)
    s = np.sin(2 * np.pi * freq * t) * np.exp(-t * 4.2)
    s += 0.35 * np.sin(2 * np.pi * freq * 2 * t) * np.exp(-t * 7)
    s += 0.12 * np.sin(2 * np.pi * freq * 3.01 * t) * np.exp(-t * 11)
    s[: 30] *= np.linspace(0, 1, 30)
    return s


def bell(freq, dur=3.0):
    t = tt(dur)
    s = np.zeros_like(t)
    for ratio, amp, dec in ((1, 1.0, 1.1), (2.0, 0.45, 1.7), (2.76, 0.3, 2.4), (5.4, 0.12, 3.4)):
        s += amp * np.sin(2 * np.pi * freq * ratio * t) * np.exp(-t * dec)
    s[:40] *= np.linspace(0, 1, 40)
    return s


def kick(dur=0.5):
    t = tt(dur)
    f = 42 + 90 * np.exp(-t * 28)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 7.5)


def hat(dur=0.08):
    n = rng.standard_normal(int(SR * dur))
    n = hp(n, 7000)
    return n * np.exp(-tt(dur) * 55)


def tick_clock(dur=0.03):
    t = tt(dur)
    s = np.sin(2 * np.pi * 2100 * t) * np.exp(-t * 180)
    s += hp(rng.standard_normal(len(t)), 3500) * np.exp(-t * 220) * 0.4
    return s


def smooth_ramp(times, values):
    x = np.arange(N) / SR
    return np.interp(x, times, values)


BPM = 96
BEAT = 60 / BPM
BAR = BEAT * 4

# chord = (bass midi, pad midis, pluck midis)
CHORDS = {
    "Dm": (38, [50, 53, 57, 62], [62, 65, 69, 74]),
    "Bb": (34, [46, 50, 53, 58], [58, 62, 65, 70]),
    "F": (41, [53, 57, 60, 65], [60, 65, 69, 72]),
    "C": (36, [48, 52, 55, 60], [60, 64, 67, 72]),
    "Gm": (43, [55, 58, 62, 67], [58, 62, 67, 70]),
    "D": (38, [50, 54, 57, 62], [62, 66, 69, 74]),
}
PROG = ["Dm", "Dm", "Bb", "Bb", "F", "F", "C", "C", "Dm", "Dm", "Bb", "Bb", "F", "F", "C", "C", "Bb", "Bb", "Gm", "Gm"]


# ---------------------------------------------------------------- SFX
def sfx_click():
    t = tt(0.09)
    s = np.sin(2 * np.pi * 1500 * t) * np.exp(-t * 90) * 0.7
    s += hp(rng.standard_normal(len(t)), 2500) * np.exp(-t * 160) * 0.5
    s += np.sin(2 * np.pi * 180 * t) * np.exp(-t * 60) * 0.5
    return s


def sfx_tick(pitch=1.0):
    t = tt(0.05)
    f = 2200 * pitch
    s = np.sin(2 * np.pi * f * t) * np.exp(-t * 110) * 0.8
    s += np.sin(2 * np.pi * f * 2.01 * t) * np.exp(-t * 160) * 0.2
    return s


def sfx_whoosh(dur=0.55):
    n = rng.standard_normal(int(SR * dur))
    out = np.zeros_like(n)
    blk = 1024
    for i0 in range(0, len(n), blk):
        p = i0 / len(n)
        fc = 350 * (9 ** p)
        seg = n[i0 : i0 + blk]
        if len(seg) > 40:
            out[i0 : i0 + blk] = bp(seg, fc * 0.55, fc * 1.5, 1)
    env = np.sin(np.pi * np.linspace(0, 1, len(n))) ** 1.8
    return out * env * 0.9


def sfx_boom(dur=1.4):
    t = tt(dur)
    f = 38 + 70 * np.exp(-t * 7)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 3.0)
    s += lp(rng.standard_normal(len(t)), 220) * np.exp(-t * 9) * 0.25
    s[:60] *= np.linspace(0, 1, 60)
    return s


def sfx_thud():
    t = tt(0.4)
    f = 60 + 90 * np.exp(-t * 24)
    ph = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(ph) * np.exp(-t * 10) * 0.9


def sfx_ping(pitch=1.0):
    return bell(1568 * pitch, 1.8) * 0.7


def sfx_pop(pitch=1.0):
    t = tt(0.16)
    f = 760 * pitch * (1 - 0.25 * t / 0.16)
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) * np.exp(-t * 32)
    s[:20] *= np.linspace(0, 1, 20)
    return s * 0.8


# ---------------------------------------------------------------- Mix
def speech_gate(vo):
    x = np.abs(vo).max(axis=1)
    win = int(0.12 * SR)
    env = np.convolve(x, np.ones(win) / win, mode="same")
    gate = (env > 0.015).astype(np.float64)
    # smooth: fast attack (duck quickly), slow release
    out = np.zeros_like(gate)
    a = 1 - np.exp(-1 / (0.10 * SR))
    r = 1 - np.exp(-1 / (0.55 * SR))
    v = 0.0
    for i, g in enumerate(gate):
        v += (a if g > v else r) * (g - v)
        out[i] = v
    return out


def to_wav(path, x):
    x = np.clip(x, -1, 1)
    wavfile.write(path, SR, (x * 32767).astype(np.int16))




def configure(duration):
    global DUR, N
    DUR = duration
    N = int(SR * DUR)
