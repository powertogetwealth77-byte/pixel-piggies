// Living Sanctuary — restoration reveals, memories, Heart Tree, menu status.
// Verifies: crossing a tier boundary fires a one-time reveal, Skip persists it,
// it never repeats, Restoration Memories can replay it, the Heart Tree panel
// reports progress, and the menu shows a Sanctuary status card.
import { chromium } from 'playwright-core';
const SHOT = new URL('./shots', import.meta.url).pathname;
import { mkdirSync } from 'fs';
mkdirSync(SHOT, { recursive: true });

const errors = [];
const fail = (m) => { errors.push(m); console.log('FAIL:', m); };
const ok = (m) => console.log('ok  :', m);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await (await browser.newContext({ viewport: { width: 420, height: 950 }, hasTouch: true })).newPage();
const cerr = [];
page.on('console', (m) => { if (m.type() === 'error') cerr.push(m.text()); });
page.on('pageerror', (e) => cerr.push('pageerror: ' + e.message));

const KEY = 'pixel-piggies-save-v1';
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });

// Fresh-feeling save: intro seen, no reveals yet, enough coins to free Rosie
// (120), which crosses into Tier 1 "The First Light".
await page.evaluate((KEY) => {
  const s = {
    version: 1, unlockedLevel: 31, levels: {}, coins: 500, pigment: 0, rescueTokens: 0,
    freedPigs: {}, kingdom: { house: 0, bakery: 0, fountain: 0 }, mochiRescued: true,
    rescued: { mochi: true }, dailyDone: null, items: {}, freeUsed: {}, worldChests: {},
    starRewarded: {}, replay: { levelId: 0, streak: 0 },
    story: { introSeen: true, sanctuaryReveals: {} },
    settings: { muted: true, musicOff: false, hapticsOff: false, reducedMotion: false, lowEffects: false, colorSymbols: false, relaxedMode: true, theme: 'classic' },
  };
  localStorage.setItem(KEY, JSON.stringify(s));
}, KEY);
await page.reload({ waitUntil: 'networkidle' });

// Menu status card is present.
if (await page.locator('.sanctuary-status').count()) ok('menu shows a Sanctuary status card'); else fail('no menu status card');

await page.getByRole('button', { name: /play/i }).first().click();
await page.waitForSelector('.world-map');
await page.locator('.icon-btn[aria-label="Rescue Sanctuary"]').click();
await page.waitForSelector('.sanctuary-scene');
if (await page.locator('.scene--t0').count()) ok('scene starts at tier 0'); else fail('scene not tier 0');

// Free the first captive (Rosie) → crosses into Tier 1.
await page.locator('.captive button').first().click();
await page.waitForTimeout(400);
// Close the rescue celebration.
const yay = page.getByRole('button', { name: /yay/i });
if (await yay.count()) await yay.click();
await page.waitForTimeout(400);

// The restoration reveal appears.
if (await page.locator('.reveal-card').count()) ok('crossing tier 1 fires a restoration reveal'); else fail('no reveal on tier-up');
await page.screenshot({ path: `${SHOT}/sanctuary-reveal.png` });

// Skip it, and confirm it persists as viewed.
await page.locator('.reveal-skip').click();
await page.waitForTimeout(300);
const seen1 = await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY)).story.sanctuaryReveals['1'], KEY);
if (seen1 === true) ok('reveal marked viewed after skip'); else fail('reveal not persisted: ' + seen1);
if (await page.locator('.reveal-card').count() === 0) ok('reveal dismissed'); else fail('reveal still visible after skip');

// Re-enter the Sanctuary → reveal must NOT replay.
await page.locator('button[aria-label="Back"]').click();
await page.waitForSelector('.world-map');
await page.locator('.icon-btn[aria-label="Rescue Sanctuary"]').click();
await page.waitForSelector('.sanctuary-scene');
await page.waitForTimeout(400);
if (await page.locator('.reveal-card').count() === 0) ok('reveal does not replay once viewed'); else fail('reveal replayed unexpectedly');
if (await page.locator('.scene--t1').count()) ok('scene advanced to tier 1'); else fail('scene not tier 1');

// Restoration Memories can replay it.
await page.getByRole('button', { name: /memories/i }).click();
await page.waitForTimeout(200);
await page.locator('.memory-row').first().click();
await page.waitForTimeout(400);
if (await page.locator('.reveal-card').count()) ok('Restoration Memories replays a completed reveal'); else fail('memories did not replay reveal');
await page.locator('.reveal-skip').click();
await page.waitForTimeout(200);

// Heart Tree panel reports progress.
await page.locator('.heart-tree').click();
await page.waitForTimeout(200);
const treeStats = await page.locator('.tree-stats').count();
if (treeStats) ok('Heart Tree panel opens with progress'); else fail('no Heart Tree panel');
const remaining = await page.locator('.tree-stats b').nth(1).innerText();
if (remaining === '21') ok('Heart Tree reports 21 remaining'); else fail('remaining wrong: ' + remaining);

if (cerr.length === 0) ok('no console errors'); else fail('console errors: ' + cerr.join('; '));
console.log('\nconsole errors:', cerr.length ? cerr : 'none');
console.log(errors.length ? `\n${errors.length} FAILURES` : '\nSANCTUARY RESTORATION E2E PASSED');
await browser.close();
process.exit(errors.length ? 1 : 0);
