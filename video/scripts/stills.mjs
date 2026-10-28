/**
 * Renders spot-check stills of the composition at the given seconds (default: a sweep across the film) and
 * tiles them into out/stills/sheet-<n>.jpg for review.
 *   node scripts/stills.mjs [seconds ...]
 */
import { bundle } from '@remotion/bundler'
import { renderStill, selectComposition } from '@remotion/renderer'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const tl = JSON.parse(readFileSync(path.join(root, 'src', 'timeline.json'), 'utf8'))
const OUT = path.join(root, 'out', 'stills')
mkdirSync(OUT, { recursive: true })
const args = process.argv.slice(2).map(Number)
const secs = args.length ? args : Array.from({ length: 24 }, (_, i) => +(1.5 + i * ((tl.duration - 3) / 23)).toFixed(2))

const serveUrl = await bundle({ entryPoint: path.join(root, 'src', 'index.ts'), publicDir: path.join(root, 'public') })
const composition = await selectComposition({ serveUrl, id: 'NightwatchDemo' })
const files = []
for (const s of secs) {
  const file = path.join(OUT, `t${String(s).padStart(6, '0')}.jpg`)
  await renderStill({ composition, serveUrl, output: file, frame: Math.min(composition.durationInFrames - 1, Math.round(s * tl.fps)), imageFormat: 'jpeg', jpegQuality: 85 })
  files.push(file)
  console.log('still', s)
}
for (let i = 0; i < files.length; i += 6) {
  const group = files.slice(i, i + 6)
  const inputs = group.flatMap((f) => ['-i', f])
  const n = group.length
  const scaled = group.map((_, j) => `[${j}]scale=640:-1[v${j}]`).join(';')
  const layout = group.map((_, j) => `${(j % 2) * 640}_${Math.floor(j / 2) * 360}`).join('|')
  const filter = n > 1 ? `${scaled};${group.map((_, j) => `[v${j}]`).join('')}xstack=inputs=${n}:layout=${layout}:fill=black` : `[0]scale=640:-1`
  execFileSync('ffmpeg', ['-v', 'error', '-y', ...inputs, '-filter_complex', filter, path.join(OUT, `sheet-${i / 6 + 1}.jpg`)])
}
console.log('sheets in', OUT)
