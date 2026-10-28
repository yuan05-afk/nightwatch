/**
 * Captures the Devpost gallery (3:2, 2400x1600) from the live product.
 *   NODE_PATH=video/node_modules node submission/capture_gallery.mjs
 */
import { chromium } from 'playwright'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = process.env.NW_URL || 'https://nightwatch-olive.vercel.app'
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'gallery')
const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 2400 / 1440, colorScheme: 'dark' })
page.setDefaultTimeout(90000)
const shot = (name) => page.screenshot({ path: path.join(OUT, name), type: 'jpeg', quality: 88 })

await page.goto(`${BASE}/`)
await page.waitForTimeout(3500)
await shot('01-nightwatch.jpg')

await page.goto(`${BASE}/auth/sign-in`)
await page.getByRole('button', { name: 'Use the judge demo account' }).click()
await page.waitForURL(/\/console/)
await page.waitForTimeout(1500)
await page.getByRole('button', { name: 'Start monitoring' }).first().click()
await page.waitForURL(/session=/)
await page.waitForTimeout(25000)
await shot('02-security-console.jpg')

await page.evaluate(() => [...document.querySelectorAll('button')].find((b) => b.textContent.trim() === 'Pause scan')?.click())
await page.waitForTimeout(1500)
await page.evaluate(() => window.scrollTo(0, 470))
await page.locator('tbody tr').first().locator('td').nth(2).click()
await page.getByRole('button', { name: 'Confirm threat' }).waitFor()
await page.waitForTimeout(1200)
await shot('03-investigate.jpg')

await page.getByRole('button', { name: 'Confirm threat' }).click()
await page.getByText('Recorded as Confirmed threat', { exact: false }).waitFor()
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
await shot('04-incident-report.jpg')

await page.goto(`${BASE}/check`)
await page.getByRole('button', { name: 'Use the sample file' }).click()
await page.getByText('Incidents to review').waitFor()
await page.waitForTimeout(1200)
await shot('05-check-your-network.jpg')

await page.goto(`${BASE}/method`)
await page.waitForTimeout(1500)
const go = async (name) => {
  const h = page.getByRole('heading', { name })
  await page.evaluate((y) => window.scrollTo(0, y), await h.evaluate((el) => el.getBoundingClientRect().top + window.scrollY - 100))
  await page.waitForTimeout(1000)
}
await go('Attacks it has never seen')
await shot('06-unseen-attacks.jpg')
await go('The accuracy illusion')
await shot('07-accuracy-illusion.jpg')
await browser.close()
console.log('gallery written to', OUT)
