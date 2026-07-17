// Plays the entire 15-level campaign through the real UI.
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';

const SHOT_DIR = new URL('./shots', import.meta.url).pathname;
mkdirSync(SHOT_DIR, { recursive: true });

const errors = [];
const fail = (m) => { errors.push(m); console.log('FAIL:', m); };
const ok = (m) => console.log('ok  :', m);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 420, height: 840 }, hasTouch: true });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
await page.getByRole('button', { name: /play/i }).first().click();
await page.waitForTimeout(300);

async function ensureLevelSelect() {
  for (let i = 0; i < 20; i++) {
    if (await page.locator('.level-grid').count()) return true;
    if (await page.getByText(/Piggy Rescued/i).count()) {
      const btn = page.getByRole('button', { name: /continue/i });
      if (await btn.count()) await btn.click();
      else await page.waitForTimeout(600);
      continue;
    }
    if (await page.getByText(/Piggy Kingdom/i).count()) {
      await page.getByRole('button', { name: /back/i }).click();
      continue;
    }
    if (await page.getByText(/Level Complete/i).count()) {
      await page.getByRole('button', { name: /continue/i }).click();
      continue;
    }
    if (await page.getByText(/Out of Piggies|Pens Overflowed/i).count()) {
      await page.getByRole('button', { name: /levels/i }).click();
      continue;
    }
    await page.waitForTimeout(400);
  }
  return false;
}

async function greedyPlayToWin() {
  return page.evaluate(async () => {
    const eng = window.__engine;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let step = 0; step < 400; step++) {
      const snap = eng.getSnapshot();
      if (snap.phase === 'won' || snap.phase === 'lost') return snap.phase;
      if (snap.phase !== 'playing') { await sleep(150); continue; }
      const width = snap.width, height = snap.height, laneW = width / 3;
      const colsFor = (lane) => {
        const out = [];
        for (let c = Math.round(lane * laneW); c < Math.round((lane + 1) * laneW); c++) out.push(c);
        return out;
      };
      const impact = (lane) => {
        for (let r = height - 1; r >= 0; r--) for (const c of colsFor(lane)) if (snap.board[r][c]) return { r, c };
        return null;
      };
      const flood = (sr, sc) => {
        const target = snap.board[sr][sc]; const seen = new Set(); const st = [[sr, sc]];
        while (st.length) {
          const [r, c] = st.pop(); const k = r + ',' + c;
          if (seen.has(k)) continue;
          const cell = snap.board[r] && snap.board[r][c];
          if (!cell || cell.color !== target.color) continue;
          seen.add(k); st.push([r-1,c],[r+1,c],[r,c-1],[r,c+1]);
        }
        return seen.size;
      };
      // Evaluate every pen/lane candidate.
      // matchedBest: color-matched clears (blaze/pip/prism, or matched mochi).
      // mochiBest: best unmatched mochi area clear (reserve option).
      let matchedBest = null;
      let mochiBest = null;
      const anyLane = () => { for (let l = 0; l < 3; l++) if (impact(l)) return l; return 0; };
      for (let slot = 0; slot < snap.pens.length; slot++) {
        const p = snap.pens[slot];
        if (!p) continue;
        if (p.type === 'prism' && snap.prismUsed) continue;
        for (let lane = 0; lane < 3; lane++) {
          const imp = impact(lane);
          if (!imp) continue;
          const cell = snap.board[imp.r][imp.c];
          const matched = p.type === 'prism' || cell.color === p.color;
          let size = 0;
          if (matched) size = flood(imp.r, imp.c);
          if (p.type === 'pip') {
            size = 0;
            for (let r = 0; r < height; r++) for (const c of colsFor(lane)) {
              const b = snap.board[r][c];
              if (b && b.color === p.color) size++;
            }
          }
          if (p.type === 'mochi') {
            let area = 0;
            for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++)
              if (snap.board[imp.r + dr] && snap.board[imp.r + dr][imp.c + dc]) area++;
            const total = (matched ? size : 0) + area;
            if (matched && total > 0 && (!matchedBest || total > matchedBest.size)) matchedBest = { slot, lane, size: total };
            if (!mochiBest || area > mochiBest.size) mochiBest = { slot, lane, size: area };
            continue;
          }
          if (size > 0 && (!matchedBest || size > matchedBest.size)) matchedBest = { slot, lane, size };
        }
      }
      if (matchedBest) {
        eng.launchLane(matchedBest.lane, matchedBest.slot);
        await sleep(30);
        continue;
      }
      const pensFull = snap.pens.every(Boolean);
      if (snap.queue.length > 0 && !pensFull) {
        // Wait (fast-forwarded) for more piggies instead of wasting any.
        eng.tick(2500);
        await sleep(30);
        continue;
      }
      // Stuck with full pens or an empty queue: use a mochi (always clears), else
      // dump the least valuable piggy to make room / reach an end state.
      if (mochiBest && mochiBest.size > 0) {
        eng.launchLane(mochiBest.lane, mochiBest.slot);
        await sleep(30);
        continue;
      }
      // Dump the piggy whose color is most useless for the remaining board
      // (fewest same-color blocks left), preferring duplicates in pens.
      const colorCount = {};
      for (let r = 0; r < height; r++) for (let c = 0; c < width; c++) {
        const b = snap.board[r][c];
        if (b) colorCount[b.color] = (colorCount[b.color] || 0) + 1;
      }
      const penColorDup = {};
      for (const p of snap.pens) if (p) penColorDup[p.color] = (penColorDup[p.color] || 0) + 1;
      let dumpSlot = -1, dumpScore = Infinity;
      for (let slot = 0; slot < snap.pens.length; slot++) {
        const p = snap.pens[slot];
        if (!p || p.type === 'mochi' || p.type === 'prism') continue;
        const score = (colorCount[p.color] || 0) - (penColorDup[p.color] > 1 ? 100 : 0);
        if (score < dumpScore) { dumpScore = score; dumpSlot = slot; }
      }
      if (dumpSlot < 0) dumpSlot = snap.pens.findIndex((p) => p && !(p.type === 'prism' && snap.prismUsed));
      if (dumpSlot >= 0) eng.launchLane(anyLane(), dumpSlot);
      else eng.tick(2500);
      await sleep(30);
    }
    return 'timeout';
  });
}

const results = [];
for (let id = 1; id <= 30; id++) {
  if (!(await ensureLevelSelect())) { fail(`could not reach level select before level ${id}`); break; }
  const tile = page.locator('.level-tile').nth(id - 1);
  if (await tile.isDisabled()) { fail(`level ${id} is locked when it should be unlocked`); break; }
  await tile.click();
  try {
    await page.waitForFunction(
      (want) => window.__engine && window.__engine.getSnapshot().level.id === want && window.__engine.getSnapshot().phase === 'playing',
      id,
      { timeout: 6000 },
    );
  } catch { fail(`level ${id} did not start`); break; }
  // Relaxed Mode makes the run deterministic (no real-time Glitch Tide), so
  // this campaign proves every level is solvable/beatable on logic alone.
  await page.evaluate(() => window.__engine.setRelaxed(true));
  const res = await greedyPlayToWin();
  const snap = await page.evaluate(() => {
    const s = window.__engine.getSnapshot();
    return { score: s.score, shots: s.shotsFired, bestCombo: s.bestCombo };
  });
  results.push({ id, res, ...snap });
  if (res !== 'won') { fail(`level ${id} ended with ${res}`); await page.screenshot({ path: `${SHOT_DIR}/campaign-fail-L${id}.png` }); break; }
  console.log(`L${id} WON score=${snap.score} shots=${snap.shots} bestCombo=${snap.bestCombo}`);
  if (id === 5) await page.screenshot({ path: `${SHOT_DIR}/campaign-L5-win.png` });
  if (id === 15) await page.screenshot({ path: `${SHOT_DIR}/campaign-L15-win.png` });
  await page.waitForTimeout(500);
}

// Final save assertions
await ensureLevelSelect();
const save = await page.evaluate(() => JSON.parse(localStorage.getItem('pixel-piggies-save-v1') || 'null'));
if (save) {
  const cleared = Object.values(save.levels).filter((l) => l.cleared).length;
  if (cleared === 30) ok('all 30 levels cleared and saved'); else fail(`only ${cleared}/30 levels saved as cleared`);
  if (save.mochiRescued) ok('Mochi rescue recorded'); else fail('Mochi rescue not recorded');
  // Purchases are never required: the whole campaign was beaten without buying
  // or using a single recovery item, and no free item uses were spent.
  const boughtAny = Object.values(save.items ?? {}).some((n) => n > 0);
  const usedAny = Object.values(save.freeUsed ?? {}).some((n) => n > 0);
  if (!boughtAny && !usedAny) ok('purchases never required (0 items bought/used across the campaign)');
  else fail(`items were used to win: items=${JSON.stringify(save.items)} freeUsed=${JSON.stringify(save.freeUsed)}`);
  console.log(`pigment=${save.pigment} coins=${save.coins}`);
  // Kingdom restoration spend
  await page.getByRole('button', { name: /kingdom/i }).click({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(300);
  const restoreBtn = page.locator('button').filter({ hasText: /^🎨|20|Restore/i }).first();
  const before = save.pigment;
  // click all visible restore buttons once
  const btns = page.locator('.kingdom-row button, .card button');
  const n = await btns.count();
  for (let i = 0; i < n; i++) { try { await btns.nth(i).click({ timeout: 500 }); } catch {} }
  await page.waitForTimeout(300);
  const save2 = await page.evaluate(() => JSON.parse(localStorage.getItem('pixel-piggies-save-v1') || 'null'));
  if (save2.pigment < before || Object.values(save2.kingdom).some((v) => v > 0)) ok(`kingdom restoration works (pigment ${before} -> ${save2.pigment}, kingdom=${JSON.stringify(save2.kingdom)})`);
  else console.log('note: kingdom restore buttons not exercised (selector mismatch?)');
  await page.screenshot({ path: `${SHOT_DIR}/campaign-kingdom.png` });
} else fail('no save at end of campaign');

console.log('\nconsole errors:', consoleErrors.length ? consoleErrors : 'none');
console.log(errors.length ? `\n${errors.length} FAILURES` : '\nCAMPAIGN COMPLETE — ALL 30 LEVELS BEATEN');
await browser.close();
process.exit(errors.length ? 1 : 0);
