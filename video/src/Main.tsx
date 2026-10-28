import React from 'react'
import { AbsoluteFill, Audio, staticFile, useCurrentFrame } from 'remotion'
import { C, FONT, FPS, Scene, ramp, useFonts } from './lib'
import {
  BuiltScene,
  CapacityScene,
  CheckScene,
  CloseScene,
  DetectScene,
  HookScene,
  InvestigateScene,
  MethodScene,
  MonitorScene,
  PainScene,
  PivotScene,
  PrioritizeScene,
  ReportScene,
  ScaleScene,
} from './scenes'
import tl from './timeline.json'

const S = tl.scenes

/** Burned-in captions, hand-written in audio/timeline.py and timed to the narration. */
const Captions: React.FC = () => {
  const t = useCurrentFrame() / FPS
  const i = tl.captions.findIndex((p) => t >= p.start && t < p.end)
  if (i < 0) return null
  const p = tl.captions[i]
  const a = Math.min(ramp(t, p.start, p.start + 0.12), ramp(t, p.end - 0.1, p.end, 1, 0, (x) => x))
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, bottom: 56, display: 'flex', justifyContent: 'center', opacity: a, transform: `translateY(${(1 - a) * 6}px)` }}>
      <div style={{ fontFamily: FONT.sans, fontWeight: 500, fontSize: 36, lineHeight: 1.28, color: C.ink, background: 'rgba(7,9,10,0.92)', border: `1px solid ${C.line}`, borderRadius: 12, padding: '10px 26px 12px', textAlign: 'center', maxWidth: 1500 }}>
        {p.text}
      </div>
    </div>
  )
}

export const NightwatchDemo: React.FC = () => {
  useFonts()
  return (
    <AbsoluteFill style={{ background: C.ground, overflow: 'hidden' }}>
      <Scene from={S.hook[0]} to={S.hook[1]} transition="cut">
        <HookScene />
      </Scene>
      <Scene from={S.scale[0]} to={S.scale[1]} transition="cut">
        <ScaleScene />
      </Scene>
      <Scene from={S.pain[0]} to={S.pain[1]} transition="cut">
        <PainScene />
      </Scene>
      <Scene from={S.pivot[0]} to={S.pivot[1]} transition="wipe">
        <PivotScene />
      </Scene>
      <Scene from={S.monitor[0]} to={S.monitor[1]} transition="fade">
        <MonitorScene />
      </Scene>
      <Scene from={S.detect[0]} to={S.detect[1]} transition="wipe">
        <DetectScene />
      </Scene>
      <Scene from={S.prioritize[0]} to={S.prioritize[1]} transition="wipe">
        <PrioritizeScene />
      </Scene>
      <Scene from={S.capacity[0]} to={S.capacity[1]} transition="wipe">
        <CapacityScene />
      </Scene>
      <Scene from={S.investigate[0]} to={S.investigate[1]} transition="wipe">
        <InvestigateScene />
      </Scene>
      <Scene from={S.report[0]} to={S.report[1]} transition="wipe">
        <ReportScene />
      </Scene>
      <Scene from={S.check[0]} to={S.check[1]} transition="wipe">
        <CheckScene />
      </Scene>
      <Scene from={S.method[0]} to={S.method[1]} transition="wipe">
        <MethodScene />
      </Scene>
      <Scene from={S.built[0]} to={S.built[1]} transition="wipe">
        <BuiltScene />
      </Scene>
      <Scene from={S.close[0]} to={S.close[1]} transition="wipe">
        <CloseScene />
      </Scene>
      <Captions />
      <Audio src={staticFile('audio/mix.wav')} />
    </AbsoluteFill>
  )
}
