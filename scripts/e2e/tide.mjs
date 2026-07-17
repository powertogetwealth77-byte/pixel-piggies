// The Glitch Tide — real-browser verification.
// Proves in the live app: the Tide meter renders and rises, pause stops the
// clock, an item relieves the Tide, a Glitch-Strike loss never mutates the
// board and offers Second Wind, Relaxed Mode disables the Tide, and a
// real-pace player survives an early level. (The strike/loss *logic* is also
// covered deterministically in devcheck; this exercises the live UI.)
import { chromium } from 'playwright-core';

const SHOT_DIR = new URL('./shots', import.meta.url).pathname;
import { mkdirSync } from 'fs';
mkdirSync(SHOT_DIR, { recursive: true });

const errors = [];
const fail = (m) => { errors.push(m); console.log('FAIL:', m); };
const ok = (m) => console.log('ok  :', m);

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await (await browser.newContext({ viewport: { width: 420, height: 840 }, hasTouch: true })).newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
const seed = (relaxedMode) => page.evaluate((rm) => {
  const save = {
    version: 1, unlockedLevel: 15, levels: {}, coins: 999, pigment: 0,
    kingdom: { house: 0, bakery: 0, fountain: 0 }, mochiRescued: true,
    rescued: { mochi: true }, dailyDone: null, items: {}, freeUsed: {},
    settings: { muted: true, musicOff: false, hapticsOff: false, reducedMotion: false, lowEffects: false, colorSymbols: false, relaxedMode: rm, theme: 'classic' },
  };
  for (let i = 1; i <= 14; i++) save.levels[i] = { stars: 2, bestScore: 2000, bestCombo: 12, cleared: true };
  localStorage.setItem('pixel-piggies-save-v1', JSON.stringify(save));
}, relaxedMode);
await seed(false);
await page.reload({ waitUntil: 'networkidle' });

async function openLevel(id) {
  await page.getByRole('button', { name: /play/i }).first().click().catch(() => {});
  await page.waitForTimeout(300);
  await page.locator('.node').nth(id - 1).click();
  await page.waitForFunction(
    (want) => window.__engine && window.__engine.getSnapshot().level.id === want && window.__engine.getSnapshot().phase === 'playing',
    id,
    { timeout: 6000 },
  );
}

// Force three Glitch Strikes via the dev-only test seam (the organic
// tick-driven strike accumulation is proven in devcheck). Ticks a little
// between strikes so the meter/grace behave like real play; asserts the board
// is never mutated by a strike.
const driveToTideLoss = () => page.evaluate(() => {
  const eng = window.__engine;
  const blocks = eng.getSnapshot().blocksRemaining;
  for (let i = 0; i < 3 && eng.getSnapshot().phase === 'playing'; i++) {
    eng.debugForceStrike();
    eng.tick(200);
  }
  const s = eng.getSnapshot();
  return { phase: s.phase, lossReason: s.lossReason, strikes: s.strikes, blocks: s.blocksRemaining, boardKept: s.blocksRemaining === blocks };
});

// ---- 1. Tide meter renders on a real (non-tutorial) level ----
await openLevel(3);
await page.waitForTimeout(400);
if (await page.locator('.tide-track').count()) ok('Tide meter renders on level 3'); else fail('Tide meter missing');
await page.screenshot({ path: `${SHOT_DIR}/tide-hud.png` });

// Fire one shot so the Tide starts, let cascades + any chain-freeze settle,
// then confirm the meter rises on a clean idle window.
await page.evaluate(() => { const s = window.__engine.getSnapshot(); window.__engine.launchLane(0, s.pens.findIndex(Boolean)); });
await page.evaluate(() => { for (let i = 0; i < 20; i++) window.__engine.tick(200); }); // settle cascades/freeze
const t0 = await page.evaluate(() => window.__engine.getSnapshot().tide);
await page.evaluate(() => { for (let i = 0; i < 25; i++) window.__engine.tick(300); }); // ~7.5s clean idle
const t1 = await page.evaluate(() => window.__engine.getSnapshot().tide);
if (t1 > t0) ok(`Tide rises while idle (${t0.toFixed(1)} -> ${t1.toFixed(1)})`); else fail(`Tide did not rise (${t0} -> ${t1})`);

// ---- 2. Item use relieves the Tide (Time Treat) ----
const raised = await page.evaluate(() => window.__engine.getSnapshot().tide);
await page.locator('.item-btn').first().click();
await page.waitForTimeout(150);
const afterItem = await page.evaluate(() => window.__engine.getSnapshot().tide);
if (raised > 1 && afterItem < raised) ok(`Time Treat pushes the Tide back (${raised.toFixed(1)} -> ${afterItem.toFixed(1)})`);
else fail(`item did not relieve tide (${raised} -> ${afterItem})`);
if (await page.evaluate(() => JSON.parse(localStorage.getItem('pixel-piggies-save-v1')).freeUsed.timeTreat) === 1)
  ok('Time Treat consumed one free use'); else fail('free use not consumed');

// ---- 3. Pause stops the clock ----
await page.getByRole('button', { name: /pause/i }).click();
await page.waitForTimeout(150);
const paused0 = await page.evaluate(() => window.__engine.getSnapshot().tide);
await page.evaluate(() => { for (let i = 0; i < 40; i++) window.__engine.tick(1000); });
const paused1 = await page.evaluate(() => window.__engine.getSnapshot().tide);
if (paused0 === paused1) ok('pause stops the Tide clock'); else fail(`pause did not stop clock (${paused0} -> ${paused1})`);
await page.getByRole('button', { name: /resume/i }).click();
await page.waitForTimeout(150);

// ---- 4. Glitch-Strike loss: board untouched, Second Wind offered ----
const blocksBefore = await page.evaluate(() => window.__engine.getSnapshot().blocksRemaining);
const lost = await driveToTideLoss();
if (lost.phase === 'lost' && lost.lossReason === 'tide' && lost.strikes === 3 && lost.boardKept)
  ok(`tide loss after 3 strikes; board untouched (${lost.blocks} blocks)`);
else fail('tide loss/board issue: ' + JSON.stringify(lost) + ` before=${blocksBefore}`);
await page.waitForTimeout(400);
const glitchedOut = await page.getByText(/Glitched Out/i).count();
const secondWind = await page.getByRole('button', { name: /second wind/i }).count();
if (glitchedOut && secondWind) ok('loss dialog shows Glitched Out + Second Wind continue');
else fail(`loss dialog wrong: glitchedOut=${glitchedOut} secondWind=${secondWind}`);
await page.screenshot({ path: `${SHOT_DIR}/tide-loss.png` });

// Take Second Wind → play resumes, board intact, strikes wound back.
await page.getByRole('button', { name: /second wind/i }).click();
await page.waitForTimeout(300);
const revived = await page.evaluate(() => { const s = window.__engine.getSnapshot(); return { phase: s.phase, strikes: s.strikes, blocks: s.blocksRemaining }; });
if (revived.phase === 'playing' && revived.strikes === 1 && revived.blocks === blocksBefore)
  ok(`Second Wind revived play (strikes ${revived.strikes}, board intact)`);
else fail('second wind failed: ' + JSON.stringify(revived));
const usedSW = await page.evaluate(() => JSON.parse(localStorage.getItem('pixel-piggies-save-v1')).freeUsed.secondWind);
if (usedSW === 1) ok('Second Wind consumed one free use (no coins needed)'); else fail('second wind not consumed: ' + usedSW);

// ---- 5. Relaxed Mode toggle disables the Tide mid-level ----
await page.getByRole('button', { name: /pause/i }).click();
await page.waitForTimeout(150);
await page.getByRole('button', { name: /relaxed mode/i }).click();
await page.waitForTimeout(150);
await page.getByRole('button', { name: /resume/i }).click();
await page.waitForTimeout(150);
const relaxedState = await page.evaluate(() => {
  const eng = window.__engine;
  const before = eng.getSnapshot().tide;
  for (let i = 0; i < 60; i++) eng.tick(1000);
  const s = eng.getSnapshot();
  return { enabled: s.tideEnabled, relaxed: s.relaxed, rose: s.tide > before };
});
if (!relaxedState.enabled && relaxedState.relaxed && !relaxedState.rose) ok('Relaxed Mode disables the Tide mid-level');
else fail('relaxed toggle failed: ' + JSON.stringify(relaxedState));

// ---- 6. A real-pace player survives an early level ----
await seed(false);
await page.reload({ waitUntil: 'networkidle' });
await openLevel(2);
const survive = await page.evaluate(async () => {
  const eng = window.__engine;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let step = 0; step < 140; step++) {
    const s = eng.getSnapshot();
    if (s.phase !== 'playing') return { phase: s.phase, strikes: s.strikes };
    const width = s.width, height = s.height, laneW = width / 3;
    const colsFor = (l) => { const o = []; for (let c = Math.round(l*laneW); c < Math.round((l+1)*laneW); c++) o.push(c); return o; };
    const impact = (l) => { for (let r = height-1; r>=0; r--) for (const c of colsFor(l)) if (s.board[r][c]) return { r, c }; return null; };
    let fired = false;
    for (let slot = 0; slot < s.pens.length && !fired; slot++) {
      const p = s.pens[slot];
      if (!p || (p.type === 'prism' && s.prismUsed)) continue;
      for (let l = 0; l < 3; l++) { const imp = impact(l); if (imp && (p.type === 'prism' || s.board[imp.r][imp.c].color === p.color)) { eng.launchLane(l, slot); fired = true; break; } }
    }
    if (!fired) { for (let l = 0; l < 3 && !fired; l++) { const imp = impact(l); const slot = s.pens.findIndex(Boolean); if (imp && slot >= 0) { eng.launchLane(l, slot); fired = true; } } }
    for (let i = 0; i < 7; i++) { eng.tick(200); await sleep(1); } // ~1.4s human cadence
  }
  const s = eng.getSnapshot();
  return { phase: s.phase, strikes: s.strikes };
});
if (survive.phase === 'won' && survive.strikes < 3) ok(`real-pace player beats level 2 (strikes=${survive.strikes})`);
else fail('survivability failed: ' + JSON.stringify(survive));

console.log('\nconsole errors:', consoleErrors.length ? consoleErrors : 'none');
console.log(errors.length ? `\n${errors.length} FAILURES` : '\nGLITCH TIDE E2E PASSED');
await browser.close();
process.exit(errors.length ? 1 : 0);
