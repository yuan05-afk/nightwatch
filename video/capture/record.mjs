/**
 * Records the NIGHTWATCH demo clips from the live product via CDP screencast, and logs timed events plus
 * element boxes (viewport CSS px, 1440x810) so overlays land on the real UI. Same method as the GroundTruth
 * recorder (../../capture/record3.mjs).
 *
 * Every action is scheduled on a clip clock (seconds after recording starts) chosen to match the narration
 * cadence; audio/timeline.py anchors one event per clip to a spoken word.
 *
 * Usage: node capture/record.mjs [clipName ...]     (NW_URL overrides the target)
 */
import { chromium } from 'playwright'
import { access, mkdir, rm, writeFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const BASE = process.env.NW_URL || 'https://nightwatch-olive.vercel.app'
const CLIPS_DIR = path.join(root, 'public', 'clips')
const TMP = path.join(root, 'capture', '_frames')
const AUTH = path.join(root, 'capture', '_frames', 'auth.json')

const VIEW = { width: 1440, height: 810 }
const DPR = 2

// White arrow with a dark outline (the app is dark), and a faint mint ring on click.
const CURSOR_INIT = `
(() => {
  const mk = () => {
    if (document.getElementById('__cur')) return
    const c = document.createElement('div')
    c.id = '__cur'
    c.style.cssText = 'position:fixed;left:0;top:0;width:28px;height:28px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px);opacity:0'
    c.innerHTML = '<svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M5 3l15 9.5-6.2 1.5 3.7 7.2-3.2 1.6-3.7-7.2L5 20.5V3z" fill="#f4f6f6" stroke="#07090a" stroke-width="1.8" stroke-linejoin="round"/></svg>'
    const r = document.createElement('div')
    r.id = '__ring'
    r.style.cssText = 'position:fixed;left:0;top:0;width:34px;height:34px;margin:-17px 0 0 -17px;border-radius:50%;border:2px solid #7fe3c4;z-index:2147483646;pointer-events:none;opacity:0;transform:translate(-100px,-100px) scale(.4)'
    document.documentElement.appendChild(r)
    document.documentElement.appendChild(c)
    let x = -100, y = -100
    addEventListener('mousemove', (e) => {
      x = e.clientX; y = e.clientY
      c.style.opacity = '1'
      c.style.transform = 'translate(' + (x - 5) + 'px,' + (y - 3) + 'px)'
    }, true)
    addEventListener('mousedown', () => {
      r.style.transition = 'none'
      r.style.opacity = '.5'
      r.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(.4)'
      requestAnimationFrame(() => requestAnimationFrame(() => {
        r.style.transition = 'transform .45s cubic-bezier(.22,1,.36,1), opacity .45s ease-out'
        r.style.opacity = '0'
        r.style.transform = 'translate(' + x + 'px,' + y + 'px) scale(1.5)'
      }))
    }, true)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mk)
  else mk()
})()
`
// Hide the scrollbar gutter, and let the floating glass nav scroll away with the page so scrolled views
// are not overlaid by page text showing through it.
const STYLE_INIT = `
(() => {
  const s = document.createElement('style')
  s.textContent = 'html{scrollbar-width:none} ::-webkit-scrollbar{display:none} header.sticky{position:relative !important;top:16px !important}'
  const add = () => document.head && document.head.appendChild(s)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', add)
  else add()
})()
`

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function ensureAuth() {
  try {
    await access(AUTH)
    return
  } catch {}
  await mkdir(path.dirname(AUTH), { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(`${BASE}/auth/sign-in`, { timeout: 90000 })
  await page.getByRole('button', { name: 'Use the judge demo account' }).click()
  await page.waitForURL(/\/console/, { timeout: 90000 })
  await page.context().storageState({ path: AUTH })
  await browser.close()
  console.log('signed in with the demo account')
}

async function launch() {
  const browser = await chromium.launch({
    args: ['--use-angle=d3d11', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--hide-scrollbars'],
  })
  const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: DPR, storageState: AUTH, colorScheme: 'dark' })
  await context.addInitScript(CURSOR_INIT)
  await context.addInitScript(STYLE_INIT)
  const page = await context.newPage()
  page.setDefaultTimeout(90000)
  return { browser, page }
}

let mouse = { x: 760, y: 560 }
let EVENTS = []
let T0 = 0
const mark = (type, extra = {}) => EVENTS.push({ type, t: Date.now() / 1000, ...extra })
/** Wait until `sec` seconds after the clip clock started. */
const until = async (sec) => {
  const d = sec * 1000 - (Date.now() - T0)
  if (d > 0) await sleep(d)
}

async function glide(page, x, y, dur = 700) {
  const from = { ...mouse }
  const t0 = Date.now()
  for (;;) {
    const raw = Math.min(1, (Date.now() - t0) / dur)
    const t = ease(raw)
    await page.mouse.move(from.x + (x - from.x) * t, from.y + (y - from.y) * t)
    if (raw >= 1) break
    await sleep(8)
  }
  mouse = { x, y }
}
async function center(locator) {
  const b = await locator.boundingBox()
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}
/** Glide to an element so the click lands at clock time T. */
async function clickAtT(page, locator, T, dur = 700, name = 'click') {
  await until(T - dur / 1000 - 0.2)
  const c = await center(locator)
  await glide(page, c.x, c.y, dur)
  await sleep(120)
  mark(name)
  await page.mouse.down()
  await sleep(70)
  await page.mouse.up()
}
/** Glide over an element so the cursor arrives at clock time T (no click). */
async function hoverAtT(page, locator, T, dur = 650, name = 'hover') {
  await until(T - dur / 1000)
  const c = await center(locator)
  await glide(page, c.x, c.y, dur)
  mark(name)
}
async function boxOf(page, locator, name, pad = 0) {
  const b = await locator.boundingBox({ timeout: 4000 }).catch(() => null)
  if (!b) {
    console.warn('  no box for', name)
    return
  }
  mark('box', { name, x: b.x - pad, y: b.y - pad, w: b.width + pad * 2, h: b.height + pad * 2 })
}
/** Box around a union of several locators (e.g. the first five severity badges). */
async function boxUnion(page, locators, name, pad = 0) {
  const bs = (await Promise.all(locators.map((l) => l.boundingBox({ timeout: 4000 }).catch(() => null)))).filter(Boolean)
  if (!bs.length) return console.warn('  no union box for', name)
  const x0 = Math.min(...bs.map((b) => b.x)), y0 = Math.min(...bs.map((b) => b.y))
  const x1 = Math.max(...bs.map((b) => b.x + b.width)), y1 = Math.max(...bs.map((b) => b.y + b.height))
  mark('box', { name, x: x0 - pad, y: y0 - pad, w: x1 - x0 + pad * 2, h: y1 - y0 + pad * 2 })
}

async function scrollPageTo(page, y, dur = 1200) {
  const y0 = await page.evaluate(() => window.scrollY)
  const t0 = Date.now()
  for (;;) {
    const raw = Math.min(1, (Date.now() - t0) / dur)
    await page.evaluate((v) => window.scrollTo(0, v), y0 + (y - y0) * ease(raw))
    if (raw >= 1) break
    await sleep(16)
  }
}
const topOf = (page, locator, pad) => locator.evaluate((el, p) => el.getBoundingClientRect().top + window.scrollY - p, pad)

/** Scrolls the investigation drawer (an <aside> with its own scroll) so `text` heading sits `pad` px from its top. */
async function scrollPanelToText(page, text, pad = 90, dur = 1000) {
  const [y0, target] = await page.evaluate(
    ([text, pad]) => {
      const p = document.querySelector('aside.overflow-y-auto')
      const el = [...p.querySelectorAll('h2,h3')].find((e) => e.textContent.trim() === text)
      return [p.scrollTop, p.scrollTop + el.getBoundingClientRect().top - p.getBoundingClientRect().top - pad]
    },
    [text, pad],
  )
  const t0 = Date.now()
  for (;;) {
    const raw = Math.min(1, (Date.now() - t0) / dur)
    await page.evaluate((v) => { document.querySelector('aside.overflow-y-auto').scrollTop = v }, y0 + (target - y0) * ease(raw))
    if (raw >= 1) break
    await sleep(16)
  }
}

/** Starts a Friday replay off-camera and lets it stream for `secs` seconds. */
async function startFriday(page, secs) {
  await page.goto(`${BASE}/console`, { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Start monitoring' }).first().click()
  await page.waitForURL(/session=/)
  await page.getByText('Connections scanned').waitFor()
  await page.waitForTimeout(secs * 1000)
}
const rows = (page) => page.locator('tbody tr')
const tile = (page, label) => page.locator('dl > div', { hasText: label }).first()
const panelWith = (page, heading) => page.locator('div.panel', { has: page.getByRole('heading', { name: heading }) }).first()

async function record(name, run, { start = '/console', prepare = null, warmup = 1500 } = {}) {
  const { browser, page } = await launch()
  const dir = path.join(TMP, name)
  await rm(dir, { recursive: true, force: true })
  await mkdir(dir, { recursive: true })

  if (prepare) await prepare(page)
  else await page.goto(`${BASE}${start}`, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(warmup)
  mouse = { x: 1180, y: 700 }
  await page.mouse.move(mouse.x, mouse.y)

  const cdp = await page.context().newCDPSession(page)
  const frames = []
  let n = 0
  cdp.on('Page.screencastFrame', async (f) => {
    const file = path.join(dir, `f${String(n++).padStart(5, '0')}.jpg`)
    frames.push({ file, ts: f.metadata.timestamp })
    await writeFile(file, Buffer.from(f.data, 'base64'))
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {})
  })
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 92, maxWidth: VIEW.width * DPR, maxHeight: VIEW.height * DPR, everyNthFrame: 1 })
  EVENTS = []
  await sleep(300)
  T0 = Date.now()
  await run(page)
  const endTs = Date.now() / 1000
  await sleep(250)
  await cdp.send('Page.stopScreencast')
  await sleep(400)
  await browser.close()

  frames.sort((a, b) => a.ts - b.ts)
  const lines = []
  for (let i = 0; i < frames.length; i++) {
    const next = i + 1 < frames.length ? frames[i + 1].ts : Math.max(endTs, frames[i].ts + 0.05)
    lines.push(`file '${frames[i].file.replace(/\\/g, '/')}'`, `duration ${Math.max(0.001, next - frames[i].ts).toFixed(4)}`)
  }
  lines.push(`file '${frames[frames.length - 1].file.replace(/\\/g, '/')}'`)
  const base = frames[0].ts
  await mkdir(CLIPS_DIR, { recursive: true })
  await writeFile(path.join(CLIPS_DIR, `${name}.events.json`), JSON.stringify(EVENTS.map((e) => ({ ...e, t: +(e.t - base).toFixed(3) })), null, 1))
  const list = path.join(dir, 'list.txt')
  await writeFile(list, lines.join('\n'))
  const out = path.join(CLIPS_DIR, `${name}.mp4`)
  execFileSync(
    'ffmpeg',
    ['-y', '-f', 'concat', '-safe', '0', '-i', list, '-vf', 'fps=30,scale=2880:1620:flags=lanczos', '-c:v', 'libx264', '-crf', '17', '-preset', 'medium', '-pix_fmt', 'yuv420p', '-an', out],
    { stdio: 'ignore' },
  )
  console.log(`clip ${name}: ${frames.length} frames, ${(endTs - base).toFixed(1)}s -> ${out}`)
}

const clips = {
  // Hook, scale and pain: a running Friday replay where botnet incidents rise to the top.
  async nw_hook() {
    // The first scan batch already holds the botnet rows, so the replay is paused right after it starts and
    // resumed on the clip clock (off-screen button), letting the rows appear on cue.
    const toggle = (page) =>
      page.evaluate(() => [...document.querySelectorAll('button')].find((b) => /^(Pause scan|Resume scan|Resume|Continue scan)$/.test(b.textContent.trim()))?.click())
    await record(
      'nw_hook',
      async (page) => {
        await boxOf(page, page.locator('dl').first(), 'stats', 6)
        await until(2.5)
        await toggle(page)
        mark('resume')
        let seen = false
        while (Date.now() - T0 < 40000) {
          if ((await page.locator('tbody tr', { hasText: 'Critical' }).count()) > 0) {
            seen = true
            break
          }
          await sleep(60)
        }
        mark('firstCritical')
        if (!seen) console.warn('  no Critical row appeared')
        await page.waitForTimeout(500)
        await boxOf(page, rows(page).first(), 'critRow', 4)
        const tFirst = (Date.now() - T0) / 1000
        await until(tFirst + 9)
        await boxOf(page, page.locator('tbody').first(), 'table', 4)
        await until(tFirst + 22)
      },
      {
        prepare: async (page) => {
          await page.goto(`${BASE}/console`, { waitUntil: 'domcontentloaded' })
          await page.getByRole('button', { name: 'Start monitoring' }).first().click()
          await page.getByRole('button', { name: 'Pause scan' }).waitFor()
          await toggle(page)
          await page.waitForURL(/session=/)
          await page.getByText('Connections scanned').waitFor()
          await page.evaluate(() => window.scrollTo(0, 345))
          const before = await page.locator('tbody tr', { hasText: 'Critical' }).count()
          if (before > 0) throw new Error('a scan batch landed before the pause; retry')
        },
        warmup: 400,
      },
    )
  },

  // 01 Monitor: pick the Friday replay, counters start running.
  async nw_monitor() {
    await record('nw_monitor', async (page) => {
      const fri = page.getByRole('button', { name: /Friday afternoon/ }).first()
      await boxOf(page, fri, 'friday', 6)
      await clickAtT(page, fri, 2.6, 800, 'pick')
      await page.waitForURL(/session=/)
      await page.getByText('Connections scanned').waitFor()
      mark('loaded')
      await page.waitForTimeout(600)
      await boxOf(page, page.getByRole('progressbar').first(), 'progress', 8)
      await boxOf(page, tile(page, 'Scan speed'), 'speed', 4)
      await until(13)
    })
  },

  // 02 Detect: the three verdict tiles, then "never silently dropped".
  async nw_detect() {
    await record(
      'nw_detect',
      async (page) => {
        await boxOf(page, tile(page, 'Recognized attacks'), 'rec', 4)
        await boxOf(page, tile(page, 'Need review'), 'rev', 4)
        await boxOf(page, tile(page, 'Cleared as normal'), 'clr', 4)
        await boxOf(page, tile(page, 'Attacks missed'), 'missed', 4)
        await hoverAtT(page, tile(page, 'Recognized attacks'), 2.5, 700, 'hRec')
        await hoverAtT(page, tile(page, 'Need review'), 3.5, 500, 'hRev')
        await hoverAtT(page, tile(page, 'Cleared as normal'), 7.7, 600, 'hClr')
        await until(9.0)
        const legend = panelWith(page, 'What the labels mean')
        await boxOf(page, legend, 'legend', 6)
        await hoverAtT(page, legend.getByText('Needs review').first(), 9.6, 700, 'hDrop')
        await until(13)
      },
      { prepare: async (page) => { await startFriday(page, 30); await page.evaluate(() => window.scrollTo(0, 260)) } },
    )
  },

  // 03 Prioritize: incidents ranked by severity with ATT&CK codes; botnet at the top.
  async nw_prioritize() {
    await record(
      'nw_prioritize',
      async (page) => {
        const r = rows(page)
        await boxUnion(page, [r.nth(0), r.nth(5)], 'incidents', 4)
        await until(1.6)
        await boxUnion(page, [0, 1, 2, 3, 4, 5, 6].map((i) => r.nth(i).locator('td').nth(1)), 'sev', 6)
        await until(5.0)
        await boxOf(page, r.nth(0).getByText('T1071').first(), 'tcode', 6)
        await hoverAtT(page, r.nth(0).getByText('T1071').first(), 5.4, 700, 'hT')
        await until(7.2)
        await boxOf(page, r.nth(0), 'top', 4)
        await hoverAtT(page, r.nth(0).locator('td').nth(2), 7.8, 700, 'hTop')
        await until(11.5)
      },
      { prepare: async (page) => { await startFriday(page, 34); await page.evaluate(() => window.scrollTo(0, 470)) } },
    )
  },

  // 04 Your time: drag the analyst capacity down to 30 minutes; the line and the comparison update.
  async nw_capacity() {
    await record(
      'nw_capacity',
      async (page) => {
        const cap = panelWith(page, 'Analyst capacity')
        const range = cap.locator('input[type=range]')
        await boxOf(page, cap, 'capacity', 6)
        const b = await range.boundingBox()
        const [min, max] = await range.evaluate((el) => [Number(el.min), Number(el.max)])
        const xAt = (v) => b.x + 8 + ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * (b.width - 16)
        const y = b.y + b.height / 2
        await until(0.6)
        await glide(page, xAt(120), y, 600)
        mark('drag')
        await page.mouse.down()
        await sleep(60)
        await glide(page, xAt(30), y, 1000)
        await page.mouse.up()
        mark('dragEnd')
        await page.waitForTimeout(400)
        const r = rows(page)
        await boxUnion(page, [r.nth(0), r.nth(4)], 'fits', 4)
        await boxOf(page, cap.getByText('Real attacks you would reach').first().locator('xpath=..'), 'compare', 6)
        await glide(page, xAt(30) + 40, y + 90, 700)
        await until(12.5)
      },
      {
        prepare: async (page) => {
          await startFriday(page, 34)
          await page.evaluate(() => window.scrollTo(0, 470))
          // Start wide (120 min) so the drag down to 30 is visible.
          const range = page.locator('input[type=range]').first()
          await range.evaluate((el) => {
            const set = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set
            set.call(el, '120')
            el.dispatchEvent(new Event('input', { bubbles: true }))
            el.dispatchEvent(new Event('change', { bubbles: true }))
          })
        },
      },
    )
  },

  // 05 Investigate: open the top botnet incident, read it, evidence, response.
  async nw_investigate() {
    await record(
      'nw_investigate',
      async (page) => {
        await clickAtT(page, rows(page).nth(0).locator('td').nth(2), 1.0, 800, 'open')
        await page.getByRole('button', { name: 'Confirm threat' }).waitFor()
        await page.waitForTimeout(500)
        await boxOf(page, page.getByRole('heading', { name: 'What happened' }).locator('xpath=..'), 'what', 8)
        await until(3.6)
        mark('toEvidence')
        await scrollPanelToText(page, 'Evidence', 70, 1000)
        await page.waitForTimeout(250)
        await boxOf(page, page.getByRole('heading', { name: 'Evidence' }).locator('xpath=..'), 'evidence', 8)
        await boxOf(page, page.getByText('Could also be normal', { exact: false }).first(), 'benign', 6)
        await until(8.6)
        mark('toResponse')
        await scrollPanelToText(page, 'Recommended response', 70, 1000)
        await page.waitForTimeout(250)
        await boxOf(page, page.getByRole('heading', { name: 'Recommended response' }).locator('xpath=..'), 'response', 8)
        await until(13)
      },
      { prepare: async (page) => { await startFriday(page, 34); await page.evaluate(() => window.scrollTo(0, 470)) } },
    )
  },

  // 06 Report: confirm the threat, create the report, timeline, hosts, NPC fields, deadline.
  async nw_report() {
    await record(
      'nw_report',
      async (page) => {
        await clickAtT(page, page.getByRole('button', { name: 'Confirm threat' }), 0.9, 700, 'confirm')
        await page.getByText('Recorded as Confirmed threat', { exact: false }).waitFor({ timeout: 15000 }).catch(async () => {
          throw new Error('confirm click did not register: ' + (await page.locator('aside.overflow-y-auto').innerText()).slice(-200))
        })
        await page.waitForTimeout(300)
        await clickAtT(page, page.getByRole('button', { name: 'Close' }), 1.9, 500, 'close')
        await page.waitForTimeout(150)
        mark('toTop')
        await scrollPageTo(page, 0, 650)
        const create = page.getByRole('button', { name: 'Create incident report' }).or(page.getByRole('link', { name: 'Create incident report' })).first()
        // Enabled once the console's next status refresh sees the confirmed decision.
        await page.waitForFunction(() => {
          const el = [...document.querySelectorAll('a,button')].find((e) => e.textContent.trim() === 'Create incident report')
          return el && el.getAttribute('aria-disabled') !== 'true' && !el.disabled
        }, null, { timeout: 30000 })
        await clickAtT(page, create, 3.4, 700, 'create')
        await page.waitForURL(/reports\//)
        await page.getByText('Breach notification deadline').waitFor()
        mark('loaded')
        await page.waitForTimeout(400)
        const deadline = page.getByText('Breach notification deadline').locator('xpath=..')
        await boxOf(page, deadline, 'deadline', 6)
        await until(5.0)
        mark('toTimeline')
        await scrollPageTo(page, await topOf(page, page.getByRole('heading', { name: '2. Timeline' }), 110), 900)
        await page.waitForTimeout(200)
        await boxOf(page, page.getByRole('heading', { name: '2. Timeline' }).locator('xpath=..'), 'timeline', 8)
        await boxOf(page, page.getByRole('heading', { name: '3. Affected systems' }).locator('xpath=..'), 'hosts', 8)
        await until(7.3)
        mark('toNpc')
        await scrollPageTo(page, await topOf(page, page.getByRole('heading', { name: /NPC breach notification fields/ }), 100), 1000)
        await page.waitForTimeout(200)
        await boxOf(page, page.getByRole('heading', { name: /NPC breach notification fields/ }).locator('xpath=..'), 'npc', 8)
        await until(9.9)
        mark('toDeadline')
        await scrollPageTo(page, 0, 900)
        await page.waitForTimeout(200)
        await boxOf(page, deadline, 'deadline2', 6)
        await until(13)
      },
      {
        prepare: async (page) => {
          await startFriday(page, 30)
          // Pause the scan (off-screen) so the drawer's related-incidents list stops growing under the cursor.
          await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Pause scan')?.click())
          await page.waitForTimeout(1500)
          await page.evaluate(() => window.scrollTo(0, 470))
          await rows(page).nth(0).locator('td').nth(2).click()
          await page.getByRole('button', { name: 'Confirm threat' }).waitFor()
          await page.waitForTimeout(400)
          await scrollPanelToText(page, 'Your decision', 60, 50)
        },
      },
    )
  },

  // 07 Your network: upload the sample flow export; scored in memory, never stored.
  async nw_check() {
    await record(
      'nw_check',
      async (page) => {
        await boxOf(page, page.getByText('never stored', { exact: false }).first(), 'stored', 6)
        await clickAtT(page, page.getByRole('button', { name: 'Use the sample file' }), 2.2, 800, 'upload')
        await page.getByText('Incidents to review').waitFor()
        mark('results')
        await page.waitForTimeout(300)
        await boxOf(page, page.locator('dl, div.grid', { hasText: 'Incidents to review' }).first(), 'tiles', 6)
        await glide(page, 760, 560, 900)
        await until(9.5)
      },
      { start: '/check' },
    )
  },

  // 08 The method: "unflattering stays", 99.96% flagged, the unseen-family test.
  async nw_method() {
    await record(
      'nw_method',
      async (page) => {
        await boxOf(page, page.getByText('Where a result is unflattering, it stays', { exact: false }).first(), 'stays', 6)
        await until(1.6)
        mark('toFlagged')
        const noPort = page.getByRole('heading', { name: 'Is it just reading port numbers?' })
        await scrollPageTo(page, await topOf(page, noPort, 90), 1300)
        await page.waitForTimeout(250)
        const used = page.locator('tr', { hasText: '(used)' }).first()
        await boxOf(page, used, 'flaggedRow', 4)
        await boxOf(page, used.getByText('99.96%'), 'flagged', 8)
        await until(6.6)
        mark('toFamilies')
        const unseen = page.getByRole('heading', { name: 'Attacks it has never seen' })
        await scrollPageTo(page, await topOf(page, unseen, 70), 1500)
        await page.waitForTimeout(250)
        const table = page.locator('table').filter({ hasText: 'Flagged Unknown' }).first()
        await boxOf(page, table, 'families', 6)
        await boxOf(page, table.locator('tr', { hasText: 'DDoS' }).first(), 'ddos', 4)
        await boxOf(page, table.locator('tr', { hasText: 'Botnet' }).first(), 'botnet', 4)
        await until(14.5)
      },
      { start: '/method', warmup: 2500 },
    )
  },
}

await ensureAuth()
const want = process.argv.slice(2)
for (const k of Object.keys(clips)) {
  if (want.length === 0 || want.includes(k)) {
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        await clips[k]()
        break
      } catch (e) {
        console.warn(`clip ${k} attempt ${attempt} failed: ${e.message.split('\n')[0]}`)
        if (attempt === 2) process.exitCode = 1
      }
    }
  }
}
console.log('done')
