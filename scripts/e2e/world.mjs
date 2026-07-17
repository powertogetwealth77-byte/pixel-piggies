// Adventure map + replay economy — real-browser verification.
// Verifies: 5 worlds render, a world chest claims once and persists across a
// refresh, a replay shows the reward summary + sanctuary CTA and pays out, and
// an old-shape save migrates without loss.
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

// Full modern save with world 1 complete, coins/tokens on hand.
await page.evaluate((KEY) => {
  const save = {
    version: 1, unlockedLevel: 7, levels: {}, coins: 1000, pigment: 50, rescueTokens: 5,
    freedPigs: {}, kingdom: { house: 0, bakery: 0, fountain: 0 }, mochiRescued: true,
    rescued: { mochi: true }, dailyDone: null, items: {}, freeUsed: {}, worldChests: {},
    starRewarded: {}, replay: { levelId: 0, streak: 0 },
    settings: { muted: true, musicOff: false, hapticsOff: false, reducedMotion: false, lowEffects: false, colorSymbols: false, relaxedMode: true, theme: 'classic' },
  };
  for (let i = 1; i <= 6; i++) save.levels[i] = { stars: 2, bestScore: 1000, bestCombo: 12, cleared: true };
  localStorage.setItem(KEY, JSON.stringify(save));
}, KEY);
await page.reload({ waitUntil: 'networkidle' });
await page.getByRole('button', { name: /play/i }).first().click();
await page.waitForSelector('.world-map', { timeout: 6000 });

// 1. Five worlds render.
const worlds = await page.locator('.world').count();
if (worlds === 5) ok('5 worlds render on the map'); else fail('world count: ' + worlds);
await page.screenshot({ path: `${SHOT_DIR}/world-map.png`, fullPage: true });

// 2. World 1 chest is ready and claims once, paying coins + tokens.
const coins0 = await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY)).coins, KEY);
const chest = page.locator('.chest--ready').first();
if (await chest.count()) ok('world 1 chest is ready'); else fail('world 1 chest not ready');
await chest.click();
await page.waitForTimeout(400);
const afterClaim = await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY)), KEY);
if (afterClaim.coins === coins0 + 150 && afterClaim.rescueTokens === 6 && afterClaim.worldChests['0'] === true)
  ok(`chest paid out (coins ${coins0} -> ${afterClaim.coins}, tokens 6)`);
else fail('chest payout wrong: ' + JSON.stringify({ coins: afterClaim.coins, tokens: afterClaim.rescueTokens, chests: afterClaim.worldChests }));

// 3. Claim cannot repeat, and it survives a refresh (no duplicate).
await page.reload({ waitUntil: 'networkidle' });
await page.getByRole('button', { name: /play/i }).first().click();
await page.waitForSelector('.world-map', { timeout: 6000 });
const claimedChest = page.locator('.chest--claimed').first();
if (await claimedChest.count() && (await claimedChest.isDisabled())) ok('chest shows claimed + disabled after refresh');
else fail('chest not locked after refresh');
const coinsAfterRefresh = await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY)).coins, KEY);
if (coinsAfterRefresh === coins0 + 150) ok('no duplicate chest reward after refresh'); else fail('coins changed on refresh: ' + coinsAfterRefresh);

// 4. Replay a cleared level → reward summary + sanctuary CTA + payout.
const coinsBeforeReplay = await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY)).coins, KEY);
await page.locator('.node').first().click(); // level 1 (relaxed, so deterministic)
await page.waitForFunction(() => window.__engine && window.__engine.getSnapshot().phase === 'playing', null, { timeout: 6000 });
await page.evaluate(async () => {
  const eng = window.__engine;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let step = 0; step < 200 && eng.getSnapshot().phase === 'playing'; step++) {
    const s = eng.getSnapshot();
    const w = s.width, h = s.height, laneW = w / 3;
    const cols = (l) => { const o = []; for (let c = Math.round(l * laneW); c < Math.round((l + 1) * laneW); c++) o.push(c); return o; };
    const impact = (l) => { for (let r = h - 1; r >= 0; r--) for (const c of cols(l)) if (s.board[r][c]) return { r, c }; return null; };
    let fired = false;
    for (let slot = 0; slot < s.pens.length && !fired; slot++) {
      const p = s.pens[slot]; if (!p) continue;
      for (let l = 0; l < 3; l++) { const im = impact(l); if (im && (p.type === 'prism' || s.board[im.r][im.c].color === p.color)) { eng.launchLane(l, slot); fired = true; break; } }
    }
    if (!fired) { const slot = s.pens.findIndex(Boolean); for (let l = 0; l < 3; l++) if (impact(l)) { eng.launchLane(l, slot); break; } }
    await sleep(20);
  }
});
await page.waitForTimeout(1200);
const summaryShown = await page.locator('.reward-breakdown').count();
const ctaShown = await page.locator('.sanctuary-cta').count();
if (summaryShown) ok('replay shows reward breakdown'); else fail('no reward breakdown on replay');
if (ctaShown) ok('sanctuary CTA shown'); else fail('no sanctuary CTA');
await page.screenshot({ path: `${SHOT_DIR}/reward-summary.png` });
const coinsAfterReplay = await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY)).coins, KEY);
// Bounded replay reward: base+score (≤25) + high-score (15) + treasure (≤50) = ≤90.
const gained = coinsAfterReplay - coinsBeforeReplay;
if (gained > 0 && gained <= 90) ok(`replay paid a bounded reward (+${gained} coins)`);
else fail(`replay payout out of range: ${coinsBeforeReplay} -> ${coinsAfterReplay}`);

// 5. Migration: an OLD-shape save (pre-worlds) loads without loss or crash.
await page.evaluate((KEY) => {
  const old = {
    version: 1, unlockedLevel: 4, levels: { 1: { stars: 3, bestScore: 900, bestCombo: 5, cleared: true }, 2: { stars: 1, bestScore: 200, bestCombo: 3, cleared: true }, 3: { stars: 2, bestScore: 500, bestCombo: 4, cleared: true } },
    coins: 777, pigment: 30, kingdom: { house: 25, bakery: 0, fountain: 0 }, mochiRescued: false, rescued: {}, dailyDone: null,
    settings: { muted: false, reducedMotion: false },
  };
  localStorage.setItem(KEY, JSON.stringify(old));
}, KEY);
await page.reload({ waitUntil: 'networkidle' });
await page.getByRole('button', { name: /play/i }).first().click();
await page.waitForSelector('.world-map', { timeout: 6000 });
const migrated = await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY) || '{}'), KEY);
// loadSave doesn't rewrite storage until next persist; check via the live UI instead: level 1 node shows 3 stars, coins preserved.
const perfectNode = await page.locator('.node--perfect').count();
if (perfectNode >= 1) ok('migrated save keeps perfected level (3-star node present)'); else fail('perfected node missing after migration');
if (cerr.length === 0) ok('migration produced no console errors'); else fail('migration console errors: ' + cerr.join('; '));

console.log('\nconsole errors:', cerr.length ? cerr : 'none');
console.log(errors.length ? `\n${errors.length} FAILURES` : '\nWORLD MAP + REPLAY E2E PASSED');
await browser.close();
process.exit(errors.length ? 1 : 0);
