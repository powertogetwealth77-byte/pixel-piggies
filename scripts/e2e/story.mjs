// Story layer — real-browser verification.
// Verifies: a fresh save opens the opening cinematic, Skip persists (no repeat
// on reload), the menu can replay it, the world map shows chapter framing, and
// the Sanctuary shows the restoration banner + a pig's memory line on rescue.
import { chromium } from 'playwright-core';
const SHOT_DIR = new URL('./shots', import.meta.url).pathname;
import { mkdirSync } from 'fs';
mkdirSync(SHOT_DIR, { recursive: true });

const errors = [];
const fail = (m) => { errors.push(m); console.log('FAIL:', m); };
const ok = (m) => console.log('ok  :', m);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await (await browser.newContext({ viewport: { width: 420, height: 900 }, hasTouch: true })).newPage();
const cerr = [];
page.on('console', (m) => { if (m.type() === 'error') cerr.push(m.text()); });
page.on('pageerror', (e) => cerr.push('pageerror: ' + e.message));

const KEY = 'pixel-piggies-save-v1';
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.evaluate((KEY) => localStorage.removeItem(KEY), KEY);
await page.reload({ waitUntil: 'networkidle' });

// 1. Fresh save opens on the cinematic.
if (await page.locator('.cine').count()) ok('fresh save opens the opening cinematic'); else fail('no cinematic on fresh save');
await page.screenshot({ path: `${SHOT_DIR}/story-intro.png` });

// 2. Skip lands on the menu and marks the intro seen.
await page.locator('.cine-skip').click();
await page.waitForTimeout(250);
if (await page.getByRole('button', { name: /^▶ Play$|play/i }).count()) ok('Skip reaches the main menu'); else fail('Skip did not reach the menu');
const seen = await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY) || '{}').story?.introSeen, KEY);
if (seen === true) ok('intro marked seen after skip'); else fail('introSeen not persisted: ' + seen);

// 3. Reload does NOT replay the cinematic.
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(250);
if (await page.locator('.cine').count() === 0) ok('cinematic does not repeat after being seen'); else fail('cinematic replayed unexpectedly');

// 4. Menu can replay the story on demand.
await page.getByRole('button', { name: /story/i }).click();
await page.waitForTimeout(200);
if (await page.locator('.cine').count()) ok('menu Story button replays the cinematic'); else fail('Story replay did not open cinematic');
await page.locator('.cine-skip').click(); // "Close"
await page.waitForTimeout(200);

// 5. World map shows chapter framing.
await page.getByRole('button', { name: /play/i }).first().click();
await page.waitForSelector('.world-map', { timeout: 6000 });
const chapters = await page.locator('.chapter-eyebrow').count();
if (chapters === 5) ok('all 5 chapters framed on the world map'); else fail('chapter eyebrows: ' + chapters);
const beat = await page.locator('.chapter-beat').first().count();
if (beat) ok('chapter story beat shown'); else fail('no chapter beat');

// 6. Sanctuary: restoration banner + a memory line when a storied pig is freed.
await page.evaluate((KEY) => {
  const s = JSON.parse(localStorage.getItem(KEY));
  s.coins = 5000; // enough to free Rosie (has a memory line)
  localStorage.setItem(KEY, JSON.stringify(s));
}, KEY);
await page.reload({ waitUntil: 'networkidle' });
await page.getByRole('button', { name: /play/i }).first().click();
await page.waitForSelector('.world-map', { timeout: 6000 });
await page.locator('.icon-btn[aria-label="Rescue Sanctuary"]').click();
await page.waitForTimeout(300);
if (await page.locator('.restore-banner').count()) ok('sanctuary restoration banner renders'); else fail('no restoration banner');
// Rosie is the first captive and carries a memory line.
await page.locator('.captive button').first().click();
await page.waitForTimeout(400);
if (await page.locator('.rescue-memory').count()) ok('freeing a storied pig shows a memory line'); else fail('no memory line on rescue');
await page.screenshot({ path: `${SHOT_DIR}/story-sanctuary.png` });

if (cerr.length === 0) ok('no console errors'); else fail('console errors: ' + cerr.join('; '));
console.log('\nconsole errors:', cerr.length ? cerr : 'none');
console.log(errors.length ? `\n${errors.length} FAILURES` : '\nSTORY LAYER E2E PASSED');
await browser.close();
process.exit(errors.length ? 1 : 0);
