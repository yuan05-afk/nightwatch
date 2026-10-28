import React from 'react'
import { AbsoluteFill } from 'remotion'
import { C, Camera, FONT, H, HFScene, Key, ProductClip, W, easeOut, ramp, useT } from './lib'
import tl from './timeline.json'

const T = tl.t
const S = tl.scenes
const EV = tl.ev
const BX = tl.box as Record<string, Record<string, Box>>
const CS = tl.clipStart

type Box = { x: number; y: number; w: number; h: number; t: number }
const k = (t: number, s: number, x: number, y: number): Key => ({ t, s, x, y })
const full = (t: number) => k(t, 1, 0.5, 0.5)

/** Camera key that frames a recorded element box. */
const focus = (t: number, b: Box, fill = 0.6, max = 1.8, dx = 0, dy = 0): Key => {
  const s = Math.min(max, Math.max(1, Math.min((W * fill) / b.w, (H * fill) / b.h)))
  return k(t, s, (b.x + b.w / 2) / W + dx, (b.y + b.h / 2) / H + dy)
}
const union = (...bs: Box[]): Box => {
  const x0 = Math.min(...bs.map((b) => b.x))
  const y0 = Math.min(...bs.map((b) => b.y))
  const x1 = Math.max(...bs.map((b) => b.x + b.w))
  const y1 = Math.max(...bs.map((b) => b.y + b.h))
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0, t: Math.max(...bs.map((b) => b.t)) }
}

/* ------------------------------------------------------------------ shared pieces */
const Chip: React.FC<{ n: string; text: string; from: number; to?: number }> = ({ n, text, from, to = 1e9 }) => {
  const t = useT()
  const a = ramp(t, from, from + 0.35) * ramp(t, to - 0.25, to, 1, 0, (x) => x)
  if (a <= 0) return null
  return (
    <div style={{ position: 'absolute', left: 48, bottom: 150, display: 'flex', opacity: a, transform: `translateY(${(1 - a) * 10}px)` }}>
      <div style={{ display: 'flex', alignItems: 'stretch', borderRadius: 12, overflow: 'hidden', border: `1px solid ${C.line}`, background: 'rgba(7,9,10,0.92)', boxShadow: '0 10px 30px -12px rgba(0,0,0,0.8)' }}>
        <span style={{ fontFamily: FONT.mono, fontWeight: 500, fontSize: 22, background: C.mint, color: C.ground, padding: '10px 16px' }}>{n}</span>
        <span style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 24, color: C.ink, padding: '9px 20px' }}>{text}</span>
      </div>
    </div>
  )
}

const Tag: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'inline-block', fontFamily: FONT.sans, fontWeight: 600, fontSize: 22, background: C.mint, color: C.ground, padding: '8px 14px', borderRadius: 8, boxShadow: '0 8px 22px -10px rgba(0,0,0,0.9)' }}>{children}</div>
)

const DrawBox: React.FC<{ at: number; out?: number; b?: Box; label?: string; side?: 'top' | 'bottom' | 'left' | 'right'; pad?: number }> = ({ at, out = 1e9, b, label, side = 'top', pad = 2 }) => {
  const t = useT()
  if (!b) return null
  const p = ramp(t, at, at + 0.55, 0, 1, easeOut)
  const o = out < 1e8 ? ramp(t, out, out + 0.25, 1, 0, (v) => v) : 1
  if (p <= 0 || o <= 0) return null
  const bw = b.w + pad * 2
  const bh = b.h + pad * 2
  const per = 2 * (bw + bh)
  const la = ramp(t, at + 0.3, at + 0.6)
  const place: React.CSSProperties =
    side === 'top' ? { left: 0, top: -50 } : side === 'bottom' ? { left: 0, top: bh + 10 } : side === 'left' ? { right: '100%', marginRight: 14, top: 0 } : { left: '100%', marginLeft: 14, top: 0 }
  return (
    <div style={{ position: 'absolute', left: b.x - pad, top: b.y - pad, width: bw, height: bh, opacity: o }}>
      <svg width={bw} height={bh} style={{ position: 'absolute', inset: 0, overflow: 'visible' }}>
        <rect x={1.5} y={1.5} width={bw - 3} height={bh - 3} rx={10} fill="none" stroke={C.mint} strokeWidth={3} strokeDasharray={per} strokeDashoffset={per * (1 - p)} />
      </svg>
      {label && (
        <div style={{ position: 'absolute', ...place, opacity: la, transform: `translateY(${(1 - la) * 8}px)`, whiteSpace: 'nowrap' }}>
          <Tag>{label}</Tag>
        </div>
      )}
    </div>
  )
}

const Card: React.FC<{ at: number; out?: number; label: string; value: string; accent?: string; style: React.CSSProperties; count?: [number, number, (n: number) => string] }> = ({
  at,
  out = 1e9,
  label,
  value,
  accent = C.ink,
  style,
  count,
}) => {
  const t = useT()
  const a = ramp(t, at, at + 0.4) * (out < 1e8 ? ramp(t, out, out + 0.3, 1, 0, (x) => x) : 1)
  if (a <= 0) return null
  const shown = count ? count[2](ramp(t, at, at + count[1], 0, count[0])) : value
  return (
    <div style={{ position: 'absolute', opacity: a, transform: `translateY(${(1 - a) * 12}px)`, ...style }}>
      <div style={{ background: 'rgba(16,20,21,0.96)', border: `1px solid ${C.line}`, borderRadius: 18, padding: '18px 30px 22px', minWidth: 560, boxShadow: '0 20px 50px -20px rgba(0,0,0,0.9)' }}>
        <div style={{ fontFamily: FONT.sans, fontSize: 24, color: C.soft }}>{label}</div>
        <div style={{ fontFamily: FONT.sans, fontWeight: 600, fontSize: 88, letterSpacing: '-0.02em', lineHeight: 1.08, color: accent, fontVariantNumeric: 'tabular-nums', marginTop: 4 }}>{shown}</div>
      </div>
    </div>
  )
}

const Dim: React.FC<{ from: number; to?: number; level?: number }> = ({ from, to = 1e9, level = 0.62 }) => {
  const t = useT()
  const a = ramp(t, from, from + 0.6, 0, level) * (to < 1e8 ? ramp(t, to, to + 0.4, 1, 0) : 1)
  return <AbsoluteFill style={{ background: C.ground, opacity: a }} />
}

/* ------------------------------------------------------------------ 1. hook, 2. scale, 3. pain (one continuous take) */
const HOOK_KEYS: Key[] = [full(0), k(EV.nw_hook.firstCritical, 1.0, 0.5, 0.5), focus(EV.nw_hook.firstCritical + 1.2, BX.nw_hook.critRow, 0.9, 1.35, 0.12, 0.18), k(S.scale[0] + 1.2, 1.0, 0.5, 0.5)]

export const HookScene: React.FC = () => (
  <AbsoluteFill>
    <Camera keys={HOOK_KEYS}>
      <ProductClip name="nw_hook" clipStart={CS.nw_hook} />
      <DrawBox at={EV.nw_hook.firstCritical + 1.0} out={S.hook[1] - 0.4} b={BX.nw_hook.critRow} label="Botnet command traffic" />
    </Camera>
  </AbsoluteFill>
)

export const ScaleScene: React.FC = () => (
  <AbsoluteFill>
    <Camera keys={HOOK_KEYS}>
      <ProductClip name="nw_hook" clipStart={CS.nw_hook} />
    </Camera>
    <Dim from={S.scale[0]} />
    <Card at={T.philhealth} label="PhilHealth, September 2023" value="Medusa ransomware" style={{ left: 140, top: 170 }} accent={C.ink} />
    <Card at={T.records13m} label="Members' records reported leaked" value="13M" accent={C.critical} style={{ left: 140, top: 420 }} count={[13, 0.9, (n) => `${Math.round(n)}M`]} />
    <Card at={T.hours72} label="To notify the National Privacy Commission" value="72 hours" accent={C.amber} style={{ left: 140, top: 670 }} />
  </AbsoluteFill>
)

export const PainScene: React.FC = () => {
  const t = useT()
  const orgs = ['Hospitals', 'Schools', 'Town halls']
  const q = ramp(t, T.question, T.question + 0.3)
  return (
    <AbsoluteFill>
      <Camera keys={HOOK_KEYS}>
        <ProductClip name="nw_hook" clipStart={CS.nw_hook} />
      </Camera>
      <Dim from={S.pain[0] - 0.6} level={0.78} />
      <div style={{ position: 'absolute', left: 0, right: 0, top: 300, display: 'flex', justifyContent: 'center', gap: 22 }}>
        {orgs.map((o, i) => {
          const a = ramp(t, T.orgTags[i], T.orgTags[i] + 0.35)
          return (
            <div key={o} style={{ opacity: a, transform: `translateY(${(1 - a) * 12}px)`, fontFamily: FONT.sans, fontWeight: 600, fontSize: 40, color: C.ink, border: `1px solid ${C.line}`, background: 'rgba(16,20,21,0.95)', borderRadius: 999, padding: '14px 32px' }}>
              {o}
            </div>
          )
        })}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 420, textAlign: 'center', fontFamily: FONT.sans, fontSize: 36, color: C.soft, opacity: ramp(t, T.orgTags[2] + 0.5, T.orgTags[2] + 0.9) }}>
        No security team. No night shift.
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 540, textAlign: 'center', fontFamily: FONT.sans, fontWeight: 500, fontSize: 104, letterSpacing: '-0.02em', color: C.ink, opacity: q, filter: `blur(${(1 - q) * 8}px)` }}>
        Who's watching at night?
      </div>
    </AbsoluteFill>
  )
}

export const PivotScene: React.FC = () => <HFScene name="pivot" at={S.pivot[0] - 0.2} />

/* ------------------------------------------------------------------ 01 Monitor */
export const MonitorScene: React.FC = () => {
  const b = BX.nw_monitor
  const keys = [full(S.monitor[0]), focus(EV.nw_monitor.pick - 1.2, b.friday, 0.5, 1.5), focus(EV.nw_monitor.pick, b.friday, 0.5, 1.5), full(EV.nw_monitor.loaded + 0.3), full(T.monSpeed - 0.9), focus(T.monSpeed, union(b.progress, b.speed), 0.85, 1.35)]
  return (
    <AbsoluteFill>
      <Camera keys={keys}>
        <ProductClip name="nw_monitor" clipStart={CS.nw_monitor} />
        <DrawBox at={T.monFriday + 0.2} out={EV.nw_monitor.pick} b={b.friday} label="A real recorded day" />
        <DrawBox at={T.monProgress} b={b.progress} label="Every connection, as it streams" side="top" />
        <DrawBox at={T.monSpeed} b={b.speed} label="A fraction of a millisecond each" side="bottom" />
      </Camera>
      <Chip n="01" text="Monitor" from={S.monitor[0] + 0.15} to={S.monitor[1]} />
    </AbsoluteFill>
  )
}

/* ------------------------------------------------------------------ 02 Detect */
export const DetectScene: React.FC = () => {
  const b = BX.nw_detect
  const tiles = union(b.rec, b.rev, b.clr)
  const keys = [full(S.detect[0]), focus(T.detRec - 0.6, tiles, 0.92, 1.45, 0, 0.12), focus(T.detDrop - 0.8, tiles, 0.92, 1.45, 0, 0.12), focus(T.detDrop, b.legend, 0.6, 1.5)]
  return (
    <AbsoluteFill>
      <Camera keys={keys}>
        <ProductClip name="nw_detect" clipStart={CS.nw_detect} />
        <DrawBox at={T.detRec} out={T.detDrop - 0.3} b={b.rec} label="Recognized attack" side="bottom" />
        <DrawBox at={T.detRev} out={T.detDrop - 0.3} b={b.rev} label="Needs review" side="bottom" />
        <DrawBox at={T.detClr} out={T.detDrop - 0.3} b={b.clr} label="Cleared" side="top" />
        <DrawBox at={T.detDrop + 0.3} b={b.legend} label="Never silently dropped" side="left" />
      </Camera>
      <Chip n="02" text="Detect" from={S.detect[0] + 0.15} to={S.detect[1]} />
    </AbsoluteFill>
  )
}

/* ------------------------------------------------------------------ 03 Prioritize */
export const PrioritizeScene: React.FC = () => {
  const b = BX.nw_prioritize
  const keys = [full(S.prioritize[0]), focus(T.priSev - 0.3, b.incidents, 0.92, 1.4), focus(T.priTcode - 0.4, b.incidents, 0.92, 1.4), focus(T.priTop, b.top, 0.75, 1.5)]
  return (
    <AbsoluteFill>
      <Camera keys={keys}>
        <ProductClip name="nw_prioritize" clipStart={CS.nw_prioritize} />
        <DrawBox at={T.priSev} out={T.priTop - 0.2} b={b.sev} label="Critical to Low" side="top" />
        <DrawBox at={T.priTcode} out={T.priTop - 0.2} b={b.tcode} label="MITRE ATT&CK" side="bottom" />
        <DrawBox at={T.priTop} b={b.top} label="Botnet first" side="top" />
      </Camera>
      <Chip n="03" text="Prioritize" from={S.prioritize[0] + 0.15} to={S.prioritize[1]} />
    </AbsoluteFill>
  )
}

/* ------------------------------------------------------------------ 04 Your time */
export const CapacityScene: React.FC = () => {
  const b = BX.nw_capacity
  const keys = [full(S.capacity[0]), focus(EV.nw_capacity.drag - 0.4, b.capacity, 0.7, 1.5, -0.08, 0), focus(T.capFits - 0.6, union(b.fits, b.capacity), 0.95, 1.25), focus(T.capCompare, b.compare, 0.6, 1.6)]
  return (
    <AbsoluteFill>
      <Camera keys={keys}>
        <ProductClip name="nw_capacity" clipStart={CS.nw_capacity} />
        <DrawBox at={T.capOnly + 0.2} out={T.capFits - 0.3} b={b.capacity} label="30 minutes" side="left" />
        <DrawBox at={T.capFits} b={b.fits} label="What fits" side="top" />
        <DrawBox at={T.capCompare} b={b.compare} label="Real attacks reached" side="left" />
      </Camera>
      <Chip n="04" text="Your time" from={S.capacity[0] + 0.15} to={S.capacity[1]} />
    </AbsoluteFill>
  )
}

/* ------------------------------------------------------------------ 05 Investigate */
export const InvestigateScene: React.FC = () => {
  const b = BX.nw_investigate
  const e = EV.nw_investigate
  const keys = [full(S.investigate[0]), full(e.open + 0.2), focus(T.invWhat, b.what, 0.6, 1.45), focus(e.toEvidence + 1.0, union(b.evidence), 0.75, 1.35), focus(e.toResponse + 1.0, b.response, 0.6, 1.45)]
  return (
    <AbsoluteFill>
      <Camera keys={keys}>
        <ProductClip name="nw_investigate" clipStart={CS.nw_investigate} />
        <DrawBox at={T.invWhat} out={e.toEvidence} b={b.what} label="In plain words" side="left" />
        <DrawBox at={T.invEvidence} out={e.toResponse} b={b.evidence} label="The evidence" side="left" />
        <DrawBox at={T.invBenign} out={e.toResponse} b={b.benign} label="Innocent explanation" side="left" />
        <DrawBox at={T.invResponse} b={b.response} label="What to do first" side="left" />
      </Camera>
      <Chip n="05" text="Investigate" from={S.investigate[0] + 0.15} to={S.investigate[1]} />
    </AbsoluteFill>
  )
}

/* ------------------------------------------------------------------ 06 Report */
export const ReportScene: React.FC = () => {
  const b = BX.nw_report
  const e = EV.nw_report
  const keys = [full(S.report[0]), full(e.loaded + 0.2), focus(T.repDraft + 0.2, b.deadline, 0.8, 1.35), full(e.toTimeline + 0.2), focus(T.repTimeline, union(b.timeline, b.hosts), 0.9, 1.25), focus(T.repNpc, b.npc, 0.85, 1.25), focus(T.repDeadline, b.deadline2, 0.8, 1.35)]
  return (
    <AbsoluteFill>
      <Camera keys={keys}>
        <ProductClip name="nw_report" clipStart={CS.nw_report} />
        <DrawBox at={T.repDraft} out={e.toTimeline} b={b.deadline} label="Draft breach report" side="top" />
        <DrawBox at={T.repTimeline} out={e.toNpc} b={b.timeline} label="Timeline" side="left" />
        <DrawBox at={T.repHosts} out={e.toNpc} b={b.hosts} label="Affected hosts" side="left" />
        <DrawBox at={T.repNpc} out={e.toDeadline} b={b.npc} label="NPC notification fields" side="left" />
        <DrawBox at={T.repDeadline} b={b.deadline2} label="72-hour deadline" side="top" />
      </Camera>
      <Chip n="06" text="Report" from={S.report[0] + 0.15} to={S.report[1]} />
    </AbsoluteFill>
  )
}

/* ------------------------------------------------------------------ 07 Your network */
export const CheckScene: React.FC = () => {
  const b = BX.nw_check
  const keys = [full(S.check[0]), full(EV.nw_check.results), focus(T.chkResults + 0.2, b.tiles, 0.85, 1.35), focus(T.chkStored, b.stored, 0.7, 1.45)]
  return (
    <AbsoluteFill>
      <Camera keys={keys}>
        <ProductClip name="nw_check" clipStart={CS.nw_check} />
        <DrawBox at={T.chkResults} out={T.chkStored - 0.2} b={b.tiles} label="Scored by the same model" side="top" />
        <DrawBox at={T.chkStored} b={b.stored} label="In memory, never stored" side="bottom" />
      </Camera>
      <Chip n="07" text="Your network" from={S.check[0] + 0.15} to={S.check[1]} />
    </AbsoluteFill>
  )
}

/* ------------------------------------------------------------------ 08 The method */
export const MethodScene: React.FC = () => {
  const b = BX.nw_method
  const e = EV.nw_method
  const keys = [full(S.method[0]), focus(T.metHidden, b.stays, 0.75, 1.4), full(e.toFlagged + 0.3), focus(T.metFlagged, b.flaggedRow, 0.8, 1.35), full(e.toFamilies + 0.3), focus(T.metFamilies + 0.2, b.families, 0.9, 1.25)]
  return (
    <AbsoluteFill>
      <Camera keys={keys}>
        <ProductClip name="nw_method" clipStart={CS.nw_method} />
        <DrawBox at={T.metHidden + 0.1} out={e.toFlagged} b={b.stays} label="Unflattering results stay" side="bottom" />
        <DrawBox at={T.metFlagged} out={e.toFamilies} b={b.flagged} label="99.96% flagged" side="top" />
        <DrawBox at={T.metDdos} b={b.ddos} label="Caught" side="left" />
        <DrawBox at={T.metBotnet} b={b.botnet} label="Missed" side="left" />
      </Camera>
      <Chip n="08" text="The method" from={S.method[0] + 0.15} to={S.method[1]} />
    </AbsoluteFill>
  )
}

export const BuiltScene: React.FC = () => <HFScene name="built" at={S.built[0] - 0.2} />
export const CloseScene: React.FC = () => <HFScene name="close" at={S.close[0] - 0.2} />
