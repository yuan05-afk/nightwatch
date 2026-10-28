/**
 * Captures the README screenshots from the live product (NW_URL overrides the target).
 *   NODE_PATH=video/node_modules node docs/capture-readme-shots.mjs
 */
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.NW_URL || 'https://nightwatch-olive.vercel.app'
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'screenshots')
await mkdir(OUT, { recursive: true })

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1.5, colorScheme: 'dark' })
page.setDefaultTimeout(90000)
const shot = (name) => page.screenshot({ path: path.join(OUT, name) })

await page.goto(`${BASE}/`)
await page.waitForTimeout(3500)
await page.screenshot({ path: path.join(OUT, '01-landing-hero.jpg'), quality: 86 })

await page.goto(`${BASE}/auth/sign-in`)
await page.getByRole('button', { name: 'Use the judge demo account' }).click()
await page.waitForURL(/\/console/)
await page.waitForTimeout(1500)
await page.getByRole('button', { name: 'Start monitoring' }).first().click()
await page.waitForURL(/session=/)
await page.waitForTimeout(25000)
await shot('02-console.png')

await page.evaluate(() => window.scrollTo(0, 470))
await page.locator('tbody tr').first().locator('td').nth(2).click()
await page.getByRole('button', { name: 'Confirm threat' }).waitFor()
await page.waitForTimeout(1200)
await shot('03-investigate.png')

await page.getByRole('button', { name: 'Confirm threat' }).click()
await page.waitForTimeout(1500)
await page.getByRole('button', { name: 'Close' }).click()
await page.evaluate(() => window.scrollTo(0, 0))
await page.waitForFunction(() => {
  const el = [...document.querySelectorAll('a,button')].find((e) => e.textContent.trim() === 'Create incident report')
  return el && el.getAttribute('aria-disabled') !== 'true'
}, null, { timeout: 60000 })
await page.getByRole('link', { name: 'Create incident report' }).or(page.getByRole('button', { name: 'Create incident report' })).first().click()
await page.waitForURL(/reports\//)
await page.getByText('Breach notification deadline').waitFor()
await page.waitForTimeout(1500)
await shot('04-incident-report.png')

await page.goto(`${BASE}/check`)
await page.getByRole('button', { name: 'Use the sample file' }).click()
await page.getByText('Incidents to review').waitFor()
await page.waitForTimeout(1200)
await shot('05-check-your-network.png')

await page.goto(`${BASE}/method`)
await page.waitForTimeout(1500)
const unseen = page.getByRole('heading', { name: 'Attacks it has never seen' })
await page.evaluate((y) => window.scrollTo(0, y), await unseen.evaluate((el) => el.getBoundingClientRect().top + window.scrollY - 100))
await page.waitForTimeout(1200)
await shot('06-method-unseen-attacks.png')

await browser.close()
console.log('screenshots written to', OUT)
