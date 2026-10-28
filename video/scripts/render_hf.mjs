/**
 * Writes and renders the three motion-graphic scenes with HyperFrames (HTML + GSAP -> MP4):
 *   pivot  the wordmark reveal          built  "what we built" cards          close  the end card
 * Every cue time comes from src/timeline.json, so the scenes land on the narration like the Remotion scenes.
 * Rendered files go to public/hf/<scene>.mp4 and are placed by the Remotion composition.
 *
 * Usage: node scripts/render_hf.mjs [pivot|built|close ...]
 * Runs the CLI through the installed HyperFrames plugin's launcher (HF_PLUGIN_ROOT overrides its location).
 */
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const TL = JSON.parse(readFileSync(path.join(root, 'src', 'timeline.json'), 'utf8'))
const PLUGIN = process.env.HF_PLUGIN_ROOT || 'C:/Users/Yuan/.claude/plugins/marketplaces/hyperframes'
const CLI = path.join(PLUGIN, 'skills', 'hyperframes', 'scripts', 'plugin-cli.mjs')
const SHARED = path.join(root, 'hf', '_shared')
const LEAD = 0.2 // the Remotion scene host starts this much before the scene (wipe lead)
const TAILPAD = 0.6
const r3 = (x) => Math.round(x * 1000) / 1000

const S = TL.scenes
const T = TL.t

const head = (title) => `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <title>${title}</title>
    <script src="assets/gsap.min.js"></script>
    <style>
      @font-face { font-family: "IBM Plex Sans"; src: url("assets/fonts/IBMPlexSans-Regular.ttf"); font-weight: 400; }
      @font-face { font-family: "IBM Plex Sans"; src: url("assets/fonts/IBMPlexSans-Medium.ttf"); font-weight: 500; }
      @font-face { font-family: "IBM Plex Sans"; src: url("assets/fonts/IBMPlexSans-SemiBold.ttf"); font-weight: 600; }
      @font-face { font-family: "IBM Plex Sans"; src: url("assets/fonts/IBMPlexSans-Bold.ttf"); font-weight: 700; }
      :root { --ground: #07090a; --panel: #101415; --ink: #e8edec; --soft: #a9b3b1; --faint: #76817f; --mint: #7fe3c4; --gold: #c9b26a; --line: rgba(255,255,255,0.12); }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: var(--ground); }
      #root { position: relative; width: 100%; height: 100%; font-family: "IBM Plex Sans", sans-serif; color: var(--ink); }
      .layer { position: absolute; inset: 0; }
      .mono { font-family: "IBM Plex Mono", monospace; }
    </style>`

const mark = (id, size) => `<svg id="${id}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">
  <circle id="${id}-ring" cx="12" cy="12" r="10.25" stroke="#e8edec" stroke-width="1.1" opacity="0.6" stroke-dasharray="64.4" stroke-dashoffset="64.4" />
  <path id="${id}-moon" d="M15.6 6.2a6.6 6.6 0 1 0 2.2 8.9 5.2 5.2 0 0 1-2.2-8.9Z" fill="#e8edec" />
  <circle id="${id}-dot" cx="18.6" cy="5.4" r="1.1" fill="#c9b26a" />
</svg>`

/* ------------------------------------------------------------------ pivot: the wordmark reveal */
function pivot() {
  const start = S.pivot[0] - LEAD
  const dur = r3(S.pivot[1] + TAILPAD - start)
  const at = (t) => r3(t - start)
  const t0 = at(T.pivotMark) - 0.1
  const letters = 'Nightwatch'.split('').map((c, i) => `<span class="l" id="pv-l${i}">${c}</span>`).join('')
  return {
    dur,
    html: `${head('Nightwatch pivot')}
    <style>
      #pv-glow { position: absolute; left: -10%; right: -10%; bottom: -62%; height: 100%; border-radius: 50%;
        background: radial-gradient(closest-side, rgba(127,227,196,0.22), rgba(127,227,196,0.05) 60%, transparent 72%); }
      #pv-arc { position: absolute; left: -15%; right: -15%; bottom: -88%; height: 120%; border-radius: 50%; border-top: 2px solid rgba(127,227,196,0.55); }
      #pv-center { position: absolute; left: 0; right: 0; top: 0; bottom: 0; display: flex; align-items: center; justify-content: center; }
      #pv-row { display: flex; align-items: center; gap: 36px; }
      #pv-word { font-size: 150px; font-weight: 500; letter-spacing: -0.02em; line-height: 1; display: flex; }
      #pv-word .l { display: inline-block; }
      #pv-sub { position: absolute; left: 0; right: 0; top: 640px; text-align: center; font-size: 30px; color: var(--soft); font-weight: 400; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${dur}" data-width="1920" data-height="1080">
      <div id="pv-bg" class="clip layer" data-start="0" data-duration="${dur}" data-track-index="0" data-layout-allow-overflow>
        <div id="pv-glow"></div><div id="pv-arc"></div>
      </div>
      <div id="pv-stage" class="clip layer" data-start="0" data-duration="${dur}" data-track-index="1">
        <div id="pv-center"><div id="pv-row">${mark('pv-mark', 170)}<div id="pv-word">${letters}</div></div></div>
        <div id="pv-sub">Network intrusion detection for teams without a security operations center</div>
      </div>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.fromTo("#pv-glow", { opacity: 0 }, { opacity: 1, duration: 1.2, ease: "power2.inOut" }, 0);
      tl.fromTo("#pv-arc", { opacity: 0, y: 40 }, { opacity: 1, y: 0, duration: 1.4, ease: "expo.out" }, 0.1);
      tl.fromTo("#pv-mark", { scale: 1.9, x: 260 }, { scale: 1.9, x: 260, duration: 0.01 }, 0);
      tl.fromTo("#pv-mark-ring", { attr: { "stroke-dashoffset": 64.4 } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.6, ease: "power2.inOut" }, ${t0});
      tl.fromTo("#pv-mark-moon", { opacity: 0, scale: 0.6, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.5, ease: "expo.out" }, ${r3(t0 + 0.3)});
      tl.fromTo("#pv-mark-dot", { opacity: 0, scale: 0, transformOrigin: "50% 50%" }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(1.6)" }, ${r3(t0 + 0.62)});
      tl.to("#pv-mark", { scale: 1, x: 0, duration: 0.6, ease: "power3.inOut" }, ${r3(t0 + 0.95)});
      ${'Nightwatch'.split('').map((_, i) => `tl.fromTo("#pv-l${i}", { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.2, ease: "power4.out" }, ${r3(t0 + 1.2 + i * 0.045)});`).join('\n      ')}
      tl.fromTo("#pv-sub", { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.3, ease: "power4.out" }, ${r3(t0 + 1.9)});
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`,
  }
}

/* ------------------------------------------------------------------ built: what we built */
function built() {
  const start = S.built[0] - LEAD
  const dur = r3(S.built[1] + TAILPAD - start)
  const at = (t) => r3(t - start)
  const b = T.built.map(at)
  const cards = [
    { n: '01', k: 'Model', title: 'LightGBM', body: 'Class-balanced over 15 traffic classes, chosen on calibration data.', chips: ['Python', 'scikit-learn'] },
    { n: '02', k: 'Data', title: 'Corrected <span class="nw">CIC-IDS2017</span>', body: '2,099,976 flows, split by time inside each attack.', chips: ['DistriNet, IEEE CNS 2022'] },
    { n: '03', k: 'Doubt', title: 'Mondrian conformal', body: '95% coverage per class. Traffic it cannot place goes to Needs review.', chips: ['TreeSHAP', 'Isolation Forest'] },
    { n: '04', k: 'App', title: 'Next.js 16 on Vercel', body: 'Scoring runs in TypeScript, matching Python to 0.000001.', chips: ['Neon Postgres', 'Neon Auth'] },
  ]
  const cardHtml = cards
    .map(
      (c, i) => `<div class="card" id="bt-c${i}" style="left:${120 + i * 430}px">
        <div class="cardbox" id="bt-c${i}-box"></div>
        <div class="cardin" id="bt-c${i}-in">
          <div class="ck"><span class="cn mono">${c.n}</span>${c.k}</div>
          <div class="ct">${c.title}</div>
          <div class="cb">${c.body}</div>
          <div class="chips">${c.chips.map((x, j) => `<span class="chip" id="bt-c${i}-chip${j}">${x}</span>`).join('')}</div>
        </div>
      </div>`,
    )
    .join('\n')
  const arrows = [0, 1, 2].map((i) => `<div class="arrow" id="bt-a${i}" style="left:${120 + i * 430 + 392}px"></div>`).join('')
  return {
    dur,
    html: `${head('Nightwatch built')}
    <style>
      #bt-head { position: absolute; left: 120px; top: 120px; }
      #bt-label { font-size: 28px; color: var(--mint); font-weight: 500; }
      #bt-title { font-size: 84px; font-weight: 500; letter-spacing: -0.02em; margin-top: 14px; }
      #bt-title .b { color: var(--soft); }
      .card { position: absolute; top: 380px; width: 392px; height: 460px; }
      .nw { white-space: nowrap; }
      .cardbox { position: absolute; inset: 0; border: 1.5px solid var(--line); border-radius: 18px; background: var(--panel); }
      .cardin { position: absolute; inset: 0; padding: 30px 30px; }
      .ck { font-size: 28px; color: var(--soft); display: flex; align-items: center; gap: 14px; }
      .cn { font-size: 24px; color: var(--ground); background: var(--mint); border-radius: 8px; padding: 2px 10px; }
      .ct { font-size: 36px; font-weight: 600; line-height: 1.12; margin-top: 22px; letter-spacing: -0.01em; }
      .cb { font-size: 28px; line-height: 1.32; color: var(--soft); margin-top: 16px; }
      .chips { position: absolute; left: 30px; right: 30px; bottom: 30px; display: flex; flex-wrap: wrap; gap: 10px; }
      .chip { font-size: 24px; color: var(--ink); border: 1px solid var(--line); border-radius: 999px; padding: 6px 14px; }
      .arrow { position: absolute; top: 610px; width: 38px; height: 2px; background: var(--faint); transform-origin: 0 50%; }
      #bt-banner { position: absolute; left: 120px; right: 120px; top: 880px; height: 84px; border-radius: 16px; background: var(--mint); color: var(--ground);
        display: flex; align-items: center; justify-content: center; font-size: 32px; font-weight: 600; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${dur}" data-width="1920" data-height="1080">
      <div id="bt-stage" class="clip layer" data-start="0" data-duration="${dur}" data-track-index="0">
        <div id="bt-head"><div id="bt-label">Built for DataNova 2026</div><div id="bt-title">One model. <span class="b">One web app.</span></div></div>
        ${cardHtml}
        ${arrows}
        <div id="bt-banner">No Python server to fail. No automatic blocking. A person always decides.</div>
      </div>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.fromTo("#bt-label", { opacity: 0, filter: "blur(6px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.25, ease: "power4.out" }, ${r3(b[0] + 0.05)});
      tl.fromTo("#bt-title", { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.3, ease: "power4.out" }, ${r3(b[0] + 0.35)});
      ${[b[1], b[2], b[3], b[4]]
        .map(
          (t, i) => `tl.fromTo("#bt-c${i}-box", { opacity: 0, scaleY: 0.92, transformOrigin: "50% 0%" }, { opacity: 1, scaleY: 1, duration: 0.45, ease: "expo.out" }, ${r3(t)});
      tl.fromTo("#bt-c${i}-in", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, ease: "expo.out" }, ${r3(t + 0.12)});${
        i > 0 ? `\n      tl.fromTo("#bt-a${i - 1}", { scaleX: 0 }, { scaleX: 1, duration: 0.35, ease: "power2.inOut" }, ${r3(t - 0.1)});` : ''
      }`,
        )
        .join('\n      ')}
      tl.fromTo("#bt-c3-chip0, #bt-c3-chip1", { backgroundColor: "rgba(127,227,196,0)", color: "#e8edec" }, { backgroundColor: "rgba(127,227,196,0.18)", color: "#7fe3c4", duration: 0.35, ease: "power2.out" }, ${r3(b[5])});
      tl.fromTo("#bt-banner", { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.45, ease: "expo.out" }, ${r3(at(T.builtBanner))});
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`,
  }
}

/* ------------------------------------------------------------------ close: the end card */
function close() {
  const start = S.close[0] - LEAD
  const dur = r3(S.close[1] - start)
  const at = (t) => r3(t - start)
  const c0 = at(S.close[0])
  return {
    dur,
    html: `${head('Nightwatch close')}
    <style>
      #cl-glow { position: absolute; left: -10%; right: -10%; bottom: -70%; height: 100%; border-radius: 50%;
        background: radial-gradient(closest-side, rgba(127,227,196,0.16), rgba(127,227,196,0.04) 60%, transparent 72%); }
      #cl-brand { position: absolute; left: 0; right: 0; top: 150px; display: flex; justify-content: center; align-items: center; gap: 24px; }
      #cl-word { font-size: 96px; font-weight: 500; letter-spacing: -0.02em; }
      #cl-lines { position: absolute; left: 0; right: 0; top: 330px; text-align: center; font-size: 84px; font-weight: 500; letter-spacing: -0.02em; line-height: 1.12; }
      #cl-l2 { color: var(--mint); }
      #cl-cta { position: absolute; left: 0; right: 0; top: 610px; display: flex; flex-direction: column; align-items: center; gap: 22px; }
      #cl-btn { background: var(--mint); color: #04140f; font-size: 34px; font-weight: 600; border-radius: 999px; padding: 18px 40px; }
      #cl-url { font-size: 34px; color: var(--ink); }
      #cl-repo { font-size: 28px; color: var(--soft); }
      #cl-foot { position: absolute; left: 120px; right: 120px; bottom: 70px; display: flex; justify-content: space-between; align-items: center; font-size: 28px; color: var(--faint); }
      #cl-ymir { display: flex; align-items: center; gap: 14px; }
      #cl-ymir img { width: 44px; height: 44px; }
      #cl-cursor { position: absolute; left: 0; top: 0; width: 40px; height: 40px; }
      #cl-ring { position: absolute; left: -24px; top: -24px; width: 48px; height: 48px; border-radius: 50%; border: 3px solid var(--mint); opacity: 0; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${dur}" data-width="1920" data-height="1080">
      <div id="cl-stage" class="clip layer" data-start="0" data-duration="${dur}" data-track-index="0" data-layout-allow-overflow>
        <div id="cl-glow"></div>
        <div id="cl-brand">${mark('cl-mark', 92)}<div id="cl-word">Nightwatch</div></div>
        <div id="cl-lines"><div id="cl-l1">Your team goes home.</div><div id="cl-l2">Nightwatch stays on.</div></div>
        <div id="cl-cta"><div id="cl-btn">Open the security console</div><div id="cl-url" class="mono">nightwatch-olive.vercel.app</div><div id="cl-repo" class="mono">github.com/yuan05-afk/nightwatch</div></div>
        <div id="cl-foot"><div id="cl-built">Built for DataNova 2026</div><div id="cl-ymir"><span>A YMIR project</span><img src="assets/ymir-logo.png" alt="YMIR" /></div></div>
        <div id="cl-ptr" style="position:absolute;left:0;top:0"><div id="cl-ring"></div><svg id="cl-cursor" viewBox="0 0 28 28" fill="none"><path d="M5 3l15 9.5-6.2 1.5 3.7 7.2-3.2 1.6-3.7-7.2L5 20.5V3z" fill="#f4f6f6" stroke="#07090a" stroke-width="1.8" stroke-linejoin="round"/></svg></div>
      </div>
    </div>
    <script>
      window.__timelines = window.__timelines || {};
      const tl = gsap.timeline({ paused: true });
      tl.fromTo("#cl-glow", { opacity: 0 }, { opacity: 1, duration: 1.0, ease: "power2.inOut" }, ${c0});
      tl.fromTo("#cl-mark-ring", { attr: { "stroke-dashoffset": 64.4 } }, { attr: { "stroke-dashoffset": 0 }, duration: 0.5, ease: "power2.inOut" }, ${r3(c0 + 0.05)});
      tl.fromTo("#cl-mark-moon, #cl-mark-dot", { opacity: 0 }, { opacity: 1, duration: 0.35, ease: "power2.out" }, ${r3(c0 + 0.3)});
      tl.fromTo("#cl-word", { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.25, ease: "power4.out" }, ${r3(c0 + 0.25)});
      tl.fromTo("#cl-l1", { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.2, ease: "power4.out" }, ${at(T.line1)});
      tl.fromTo("#cl-l2", { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.2, ease: "power4.out" }, ${at(T.line2)});
      tl.fromTo("#cl-cta", { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.45, ease: "expo.out" }, ${at(T.cta)});
      tl.fromTo("#cl-foot", { opacity: 0 }, { opacity: 1, duration: 0.5, ease: "power2.out" }, ${r3(at(T.cta) + 0.2)});
      tl.fromTo("#cl-ptr", { x: 1380, y: 900, opacity: 0 }, { x: 1380, y: 900, opacity: 1, duration: 0.2 }, ${r3(at(T.click) - 1.1)});
      tl.to("#cl-ptr", { x: 1040, y: 650, duration: 0.85, ease: "power2.inOut" }, ${r3(at(T.click) - 0.9)});
      tl.fromTo("#cl-ring", { opacity: 0.6, scale: 0.4 }, { opacity: 0, scale: 1.6, duration: 0.45, ease: "expo.out", immediateRender: false }, ${at(T.click)});
      tl.fromTo("#cl-btn", { scale: 1 }, { scale: 0.97, duration: 0.08, ease: "power2.out", yoyo: true, repeat: 1 }, ${at(T.click)});
      window.__timelines["main"] = tl;
    </script>
  </body>
</html>
`,
  }
}

const SCENES = { pivot, built, close }
const want = process.argv.slice(2).length ? process.argv.slice(2) : Object.keys(SCENES)
mkdirSync(path.join(root, 'public', 'hf'), { recursive: true })
for (const name of want) {
  const { html, dur } = SCENES[name]()
  const dir = path.join(root, 'hf', name)
  mkdirSync(path.join(dir, 'assets', 'fonts'), { recursive: true })
  copyFileSync(path.join(SHARED, 'gsap.min.js'), path.join(dir, 'assets', 'gsap.min.js'))
  copyFileSync(path.join(SHARED, 'ymir-logo.png'), path.join(dir, 'assets', 'ymir-logo.png'))
  for (const f of ['IBMPlexSans-Regular.ttf', 'IBMPlexSans-Medium.ttf', 'IBMPlexSans-SemiBold.ttf', 'IBMPlexSans-Bold.ttf']) copyFileSync(path.join(SHARED, f), path.join(dir, 'assets', 'fonts', f))
  writeFileSync(path.join(dir, 'index.html'), html)
  console.log(`${name}: ${dur}s`)
  if (process.env.HF_NO_RENDER) continue
  const out = path.join(root, 'public', 'hf', `${name}.mp4`)
  execFileSync('node', [CLI, 'render', dir, '-o', out, '--fps', '30', '--quiet', '--skill', 'hyperframes'], { stdio: 'inherit', cwd: root })
}
