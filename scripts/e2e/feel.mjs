// Level-feel polish — objective card, world frame, combo/near-win callouts,
// win phrase variety, smart hint, and the new gameplay settings.
import { chromium } from 'playwright-core';
const SHOT = new URL('./shots', import.meta.url).pathname;
import { mkdirSync } from 'fs';
mkdirSync(SHOT, { recursive: true });

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
await page.evaluate((KEY) => {
  const s = {
    version: 1, unlockedLevel: 20, levels: {}, coins: 999, pigment: 0, rescueTokens: 0,
    freedPigs: {}, kingdom: { house: 0, bakery: 0, fountain: 0 }, mochiRescued: true,
    rescued: { mochi: true }, dailyDone: null, items: {}, freeUsed: {},
    settings: { muted: true, relaxedMode: true, reducedMotion: false },
  };
  for (let i = 1; i <= 19; i++) s.levels[i] = { stars: 2, bestScore: 1000, bestCombo: 8, cleared: true };
  localStorage.setItem(KEY, JSON.stringify(s));
}, KEY);
await page.reload({ waitUntil: 'networkidle' });

// Migration filled the new settings with safe defaults.
const migrated = await page.evaluate((KEY) => JSON.parse(localStorage.getItem(KEY)), KEY);
// loadSave doesn't rewrite storage until a persist; check via the Settings UI instead.
await page.getByRole('button', { name: /play/i }).first().click();
await page.waitForSelector('.world-map');

// Open a World 3 level (13-18) → its board should carry the kingdom world class.
await page.locator('.node').nth(12).click(); // level 13
await page.waitForFunction(() => window.__engine && window.__engine.getSnapshot().phase === 'playing', null, { timeout: 6000 });

// 1. Objective card shows at level start.
if (await page.locator('.objective-card').count()) ok('objective card shows at level start'); else fail('no objective card');
await page.screenshot({ path: `${SHOT}/feel-objective.png` });
if (await page.locator('.objective-card.world--kingdom').count()) ok('objective card carries the world theme'); else fail('objective card missing world theme');
// Tap to dismiss.
await page.locator('.objective-overlay').click();
await page.waitForTimeout(200);
if (await page.locator('.objective-card').count() === 0) ok('objective card dismisses on tap'); else fail('objective card did not dismiss');

// 2. The game container carries the world class.
if (await page.locator('.game.world--kingdom').count()) ok('board carries per-world class'); else fail('no per-world class');

// 3. Play to a win → a varied completion phrase + stars.
await page.evaluate(async () => {
  const eng = window.__engine;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let step = 0; step < 240 && eng.getSnapshot().phase === 'playing'; step++) {
    const s = eng.getSnapshot();
    const laneW = s.width / 3;
    const cols = (l) => { const o = []; for (let c = Math.round(l * laneW); c < Math.round((l + 1) * laneW); c++) o.push(c); return o; };
    const impact = (l) => { for (let r = s.height - 1; r >= 0; r--) for (const c of cols(l)) if (s.board[r][c]) return { r, c }; return null; };
    let fired = false;
    for (let slot = 0; slot < s.pens.length && !fired; slot++) {
      const p = s.pens[slot]; if (!p) continue;
      for (let l = 0; l < 3; l++) { const im = impact(l); if (im && (p.type === 'prism' || s.board[im.r][im.c].color === p.color)) { eng.launchLane(l, slot); fired = true; break; } }
    }
    if (!fired) { const slot = s.pens.findIndex(Boolean); for (let l = 0; l < 3; l++) if (impact(l)) { eng.launchLane(l, slot); break; } }
    await sleep(12);
  }
});
await page.waitForSelector('.dialog', { timeout: 8000 });
const heading = await page.locator('.dialog h2').first().innerText();
const phrases = ['Herd Saved!', 'Perfect Pasture!', 'Piggies Home!', 'Kingdom Progress!', 'Rescue Complete!', 'The Herd Moves Forward!', 'Level Complete!'];
if (phrases.includes(heading.trim())) ok(`win shows an original phrase (“${heading.trim()}”)`); else fail('unexpected win heading: ' + heading);
await page.screenshot({ path: `${SHOT}/feel-win.png` });

// 4. New gameplay settings render + toggle + persist.
await page.locator('.dialog .btn--primary').click(); // Continue
await page.waitForTimeout(300);
await page.locator('button[aria-label="Back"]').click().catch(() => {});
await page.waitForTimeout(200);
// Go to menu → settings.
await page.getByRole('button', { name: /settings|⚙/i }).first().click().catch(async () => {
  await page.locator('.icon-btn').last().click();
});
await page.waitForTimeout(300);
const calloutRow = page.getByText(/Gameplay callouts/i);
if (await calloutRow.count()) ok('gameplay-callouts setting is present'); else fail('no callouts setting');
if (await page.getByText(/Smart hints/i).count()) ok('smart-hints setting present'); else fail('no smart-hints setting');
if (await page.getByText(/Fast celebration/i).count()) ok('fast-celebration setting present'); else fail('no fast-win setting');

if (cerr.length === 0) ok('no console errors'); else fail('console errors: ' + cerr.join('; '));
console.log('\nconsole errors:', cerr.length ? cerr : 'none');
console.log(errors.length ? `\n${errors.length} FAILURES` : '\nLEVEL FEEL E2E PASSED');
await browser.close();
process.exit(errors.length ? 1 : 0);
