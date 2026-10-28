import { loadFont } from '@remotion/fonts'
import React, { createContext, useContext, useEffect, useState } from 'react'
import { AbsoluteFill, cancelRender, continueRender, delayRender, Easing, Freeze, interpolate, OffthreadVideo, Sequence, staticFile, useCurrentFrame } from 'remotion'
import tl from './timeline.json'

export const FPS = tl.fps
export const W = 1920
export const H = 1080
export const f = (s: number) => Math.round(s * FPS)
export const TL = tl

// The product's own palette (web/app/globals.css).
export const C = {
  ground: '#07090a',
  panel: '#101415',
  ink: '#e8edec',
  soft: '#a9b3b1',
  faint: '#76817f',
  mint: '#7fe3c4',
  gold: '#c9b26a',
  amber: '#e6ad55',
  critical: '#f2508f',
  line: 'rgba(255,255,255,0.14)',
}

export const FONT = {
  sans: "'IBM Plex Sans', 'Helvetica Neue', Arial, sans-serif",
  mono: "'IBM Plex Mono', ui-monospace, monospace",
}

export const easeOut = Easing.bezier(0.22, 1, 0.36, 1)
export const easeInOut = Easing.bezier(0.65, 0, 0.35, 1)

export const useFonts = () => {
  const [handle] = useState(() => delayRender('fonts'))
  useEffect(() => {
    const d = (family: string, file: string, weight: string) => loadFont({ family, url: staticFile(`fonts/${file}`), weight, format: 'truetype' })
    Promise.all([
      d('IBM Plex Sans', 'IBMPlexSans-Regular.ttf', '400'),
      d('IBM Plex Sans', 'IBMPlexSans-Medium.ttf', '500'),
      d('IBM Plex Sans', 'IBMPlexSans-SemiBold.ttf', '600'),
      d('IBM Plex Sans', 'IBMPlexSans-Bold.ttf', '700'),
      d('IBM Plex Mono', 'IBMPlexMono-Regular.ttf', '400'),
      d('IBM Plex Mono', 'IBMPlexMono-Medium.ttf', '500'),
    ])
      .then(() => continueRender(handle))
      .catch((e) => cancelRender(e))
  }, [handle])
}

/* ------------------------------------------------------------ time */
const TimeCtx = createContext(0)
export const useT = () => {
  const base = useContext(TimeCtx)
  return base + useCurrentFrame() / FPS
}
export const useBase = () => useContext(TimeCtx)

export const ramp = (t: number, a: number, b: number, from = 0, to = 1, e: (n: number) => number = easeOut) =>
  interpolate(t, [a, b], [from, to], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: e })

/** Scene: owns a slice of the master timeline and reveals with a wipe led by a thin mint line. */
export const Scene: React.FC<{ from: number; to: number; transition?: 'wipe' | 'fade' | 'cut'; bg?: string; children: React.ReactNode }> = ({
  from,
  to,
  transition = 'wipe',
  bg = C.ground,
  children,
}) => {
  const lead = transition === 'wipe' ? 0.2 : transition === 'fade' ? 0.15 : 0
  const start = from - lead
  const dur = f(to + 0.5) - f(start)
  return (
    <Sequence from={f(start)} durationInFrames={dur} layout="none">
      <TimeCtx.Provider value={f(start) / FPS}>
        <Reveal kind={transition} bg={bg}>
          {children}
        </Reveal>
      </TimeCtx.Provider>
    </Sequence>
  )
}

const Reveal: React.FC<{ kind: 'wipe' | 'fade' | 'cut'; bg: string; children: React.ReactNode }> = ({ kind, bg, children }) => {
  const frame = useCurrentFrame()
  if (kind === 'cut') return <AbsoluteFill style={{ background: bg }}>{children}</AbsoluteFill>
  if (kind === 'fade') {
    const o = interpolate(frame, [0, f(0.35)], [0, 1], { extrapolateRight: 'clamp' })
    return <AbsoluteFill style={{ background: bg, opacity: o }}>{children}</AbsoluteFill>
  }
  const p = interpolate(frame, [0, f(0.5)], [0, 1], { extrapolateRight: 'clamp', easing: easeInOut })
  return (
    <>
      <AbsoluteFill style={{ background: bg, clipPath: `inset(0 ${(1 - p) * 100}% 0 0)` }}>{children}</AbsoluteFill>
      {p < 1 && <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${p * 100}%`, width: 3, background: C.mint }} />}
    </>
  )
}

/* ------------------------------------------------------------ camera */
export type Key = { t: number; s: number; x: number; y: number }

export const camAt = (keys: Key[], t: number) => {
  if (t <= keys[0].t) return keys[0]
  for (let i = 0; i < keys.length - 1; i++) {
    const a = keys[i]
    const b = keys[i + 1]
    if (t >= a.t && t <= b.t) {
      const p = easeInOut((t - a.t) / Math.max(1e-6, b.t - a.t))
      return { t, s: a.s + (b.s - a.s) * p, x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p }
    }
  }
  return keys[keys.length - 1]
}

/** Crops/zooms a 1920x1080 design-space child. (x,y) is the view centre, normalised. */
export const Camera: React.FC<{ keys: Key[]; children: React.ReactNode }> = ({ keys, children }) => {
  const t = useT()
  const k = camAt(keys, t)
  const vw = W / k.s
  const vh = H / k.s
  const X = Math.min(Math.max(k.x * W - vw / 2, 0), W - vw)
  const Y = Math.min(Math.max(k.y * H - vh / 2, 0), H - vh)
  return (
    <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, overflow: 'hidden' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, transformOrigin: '0 0', transform: `scale(${k.s}) translate(${-X}px, ${-Y}px)` }}>{children}</div>
    </div>
  )
}

/** Plays a recorded product clip so that clip t=0 sits at master time `clipStart`. If the clip starts a moment
 * after its scene does, its first frame is held until then, so a wipe never reveals an empty frame. */
export const ProductClip: React.FC<{ name: string; clipStart: number }> = ({ name, clipStart }) => {
  const base = useBase()
  const delay = clipStart - base
  const video = (startFrom: number) => (
    <OffthreadVideo src={staticFile(`clips/${name}.mp4`)} startFrom={startFrom} muted style={{ position: 'absolute', left: 0, top: 0, width: W, height: H, objectFit: 'cover' }} />
  )
  if (delay > 0.001) {
    return (
      <>
        <Sequence durationInFrames={Math.max(1, f(delay))} layout="none">
          <Freeze frame={0}>{video(0)}</Freeze>
        </Sequence>
        <Sequence from={f(delay)} layout="none">
          {video(0)}
        </Sequence>
      </>
    )
  }
  return video(f(base - clipStart))
}

/** A HyperFrames-rendered scene, placed so its t=0 sits at master time `at`. */
export const HFScene: React.FC<{ name: string; at: number }> = ({ name, at }) => {
  const base = useBase()
  const delay = at - base
  const video = (startFrom: number) => (
    <OffthreadVideo src={staticFile(`hf/${name}.mp4`)} startFrom={startFrom} muted style={{ position: 'absolute', left: 0, top: 0, width: W, height: H }} />
  )
  if (delay > 0.001) {
    return (
      <Sequence from={f(delay)} layout="none">
        {video(0)}
      </Sequence>
    )
  }
  return video(f(base - at))
}

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US')
