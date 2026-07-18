// End-to-end verification of the Pixel Piggies gameplay loop.
import { chromium } from 'playwright-core';

const SHOT_DIR = new URL('./shots', import.meta.url).pathname;
import { mkdirSync } from 'fs';
mkdirSync(SHOT_DIR, { recursive: true });

const errors = [];
const fail = (msg) => { errors.push(msg); console.log('FAIL:', msg); };
const ok = (msg) => console.log('ok  :', msg);

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const ctx = await browser.newContext({ viewport: { width: 420, height: 840 }, hasTouch: true });
const page = await ctx.newPage();
const consoleErrors = [];
page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
page.on('pageerror', (e) => consoleErrors.push('pageerror: ' + e.message));

await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
// A fresh save opens on the story cinematic — skip it to reach the menu.
const skip = page.locator('.cine-skip');
if (await skip.count()) { await skip.click(); await page.waitForTimeout(200); }
await page.screenshot({ path: `${SHOT_DIR}/01-menu.png` });

// --- Main menu ---
const playBtn = page.getByRole('button', { name: /play/i }).first();
if (await playBtn.count() === 0) fail('No Play button on menu');
await playBtn.click();
await page.waitForTimeout(300);
await page.screenshot({ path: `${SHOT_DIR}/02-levels.png` });

// --- Level select: open level 1 ---
const lvl1 = page.locator('.node').first();
await lvl1.click();
await page.waitForTimeout(600);
await page.screenshot({ path: `${SHOT_DIR}/03-game-start.png` });

// Wait for engine
await page.waitForFunction(() => window.__engine && window.__engine.getSnapshot().phase === 'playing', null, { timeout: 5000 });
ok('game engine running, phase=playing');

// --- Real-click smoke test: pick the first filled pen and its matching lane ---
const move = await page.evaluate(() => {
  const snap = window.__engine.getSnapshot();
  const width = snap.width, height = snap.height;
  // find bottom-most block color per lane
  const laneFront = (lane) => {
    const laneW = width / 3;
    for (let r = height - 1; r >= 0; r--)
      for (let c = Math.round(lane * laneW); c < Math.round((lane + 1) * laneW); c++)
        if (snap.board[r][c]) return snap.board[r][c].color;
    return null;
  };
  for (let slot = 0; slot < snap.pens.length; slot++) {
    const p = snap.pens[slot];
    if (!p) continue;
    for (let lane = 0; lane < 3; lane++) {
      if (laneFront(lane) === p.color || p.type === 'prism') return { slot, lane, before: snap.blocksRemaining };
    }
  }
  return null;
});
if (!move) fail('no matching pen/lane found for real-click test');
else {
  const pens = page.locator('.pen');
  await pens.nth(move.slot).click();
  await page.locator('.lane-hit').nth(move.lane).click();
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => window.__engine.getSnapshot().blocksRemaining);
  if (after < move.before) ok(`real click launch cleared blocks (${move.before} -> ${after})`);
  else fail(`real click launch did not clear blocks (${move.before} -> ${after})`);
  await page.screenshot({ path: `${SHOT_DIR}/04-after-first-launch.png` });
}

// --- Greedy-play level 1 to a win via the engine (validates win flow) ---
const result1 = await page.evaluate(async () => {
  const eng = window.__engine;
  const laneCount = 3;
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  for (let step = 0; step < 200; step++) {
    const snap = eng.getSnapshot();
    if (snap.phase !== 'playing') return snap.phase;
    const width = snap.width, height = snap.height;
    const laneW = width / 3;
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
    let best = null;
    for (let slot = 0; slot < snap.pens.length; slot++) {
      const p = snap.pens[slot];
      if (!p) continue;
      if (p.type === 'prism' && snap.prismUsed) continue;
      for (let lane = 0; lane < laneCount; lane++) {
        const imp = impact(lane);
        if (!imp) continue;
        let size = 0;
        const cell = snap.board[imp.r][imp.c];
        const matched = p.type === 'prism' || cell.color === p.color;
        if (matched) size = flood(imp.r, imp.c);
        if (p.type === 'pip') { for (let r = 0; r < height; r++) for (const c of colsFor(lane)) if (snap.board[r][c]) size++; }
        if (p.type === 'mochi' && size > 0) size += 2;
        if (!best || size > best.size) best = { slot, lane, size };
      }
    }
    if (!best || best.size === 0) { await sleep(300); continue; } // wait for spawn
    eng.launchLane(best.lane, best.slot);
    await sleep(60);
  }
  return 'timeout';
});
if (result1 === 'won') ok('level 1 played to a WIN');
else fail('level 1 play ended with: ' + result1);
await page.waitForTimeout(700);
await page.screenshot({ path: `${SHOT_DIR}/05-win-dialog.png` });

// Win dialog should show stars + picture + continue (heading varies by outcome).
const winVisible = await page.getByText(/Level Complete|Herd Saved|Piggies Home|Perfect Pasture|Kingdom Progress|Rescue Complete|Herd Moves Forward/i).count();
if (winVisible) ok('win dialog visible'); else fail('win dialog missing');

// --- Save persistence ---
await page.getByRole('button', { name: /continue/i }).click();
await page.waitForTimeout(400);
const save = await page.evaluate(() => JSON.parse(localStorage.getItem('pixel-piggies-save-v1') || 'null'));
if (save && save.levels && save.levels[1] && save.levels[1].cleared && save.unlockedLevel >= 2) ok('save persisted: level 1 cleared, level 2 unlocked, coins=' + save.coins);
else fail('save not persisted correctly: ' + JSON.stringify(save));
await page.screenshot({ path: `${SHOT_DIR}/06-after-win.png` });

// --- Pause / resume / restart on level 2 ---
const lvl2 = page.locator('.node').nth(1);
await lvl2.click();
await page.waitForFunction(() => window.__engine && window.__engine.getSnapshot().phase === 'playing', null, { timeout: 5000 });
// Fire one shot (any pen, lane 0) so shotsFired > 0, to prove restart resets state.
await page.evaluate(async () => {
  const eng = window.__engine;
  for (let i = 0; i < 40; i++) {
    const s = eng.getSnapshot();
    const slot = s.pens.findIndex(Boolean);
    if (slot >= 0) { eng.launchLane(0, slot); return; }
    await new Promise((r) => setTimeout(r, 150));
  }
});
const shotsBefore = await page.evaluate(() => window.__engine.getSnapshot().shotsFired);
if (shotsBefore > 0) ok('fired a shot before restart'); else fail('could not fire a shot before restart');
await page.getByRole('button', { name: /pause/i }).click();
await page.waitForTimeout(200);
const pausedShown = await page.getByText(/^Paused$/i).count();
if (pausedShown) ok('pause overlay shows'); else fail('pause overlay missing');
await page.screenshot({ path: `${SHOT_DIR}/07-pause.png` });
// Restart must remount the same level, fresh, still on the game screen.
await page.getByRole('button', { name: /restart/i }).click();
try {
  await page.waitForFunction(
    () => {
      const e = window.__engine;
      if (!e) return false;
      const s = e.getSnapshot();
      return s.level.id === 2 && s.phase === 'playing' && s.shotsFired === 0;
    },
    null,
    { timeout: 5000 },
  );
  const stillInGame = await page.locator('.board').count();
  if (stillInGame) ok('restart reloads level 2 in place (fresh engine, still on game screen)');
  else fail('restart left the game screen');
} catch {
  fail('restart did not produce a fresh playing engine for level 2');
}
await page.screenshot({ path: `${SHOT_DIR}/08-after-restart.png` });
// Score badge should be visible in the HUD.
if (await page.locator('.score-badge').count()) ok('score badge visible'); else fail('score badge missing');

// --- Lose path: launch mismatches until out of piggies (level 2) ---
{
  const lost = await page.evaluate(async () => {
    const eng = window.__engine;
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    for (let i = 0; i < 900; i++) {
      const snap = eng.getSnapshot();
      if (snap.phase !== 'playing') return snap.phase;
      // fire every available piggy into the lane that does NOT match
      const width = snap.width, height = snap.height, laneW = width / 3;
      const frontColor = (lane) => {
        for (let r = height - 1; r >= 0; r--)
          for (let c = Math.round(lane * laneW); c < Math.round((lane + 1) * laneW); c++)
            if (snap.board[r][c]) return snap.board[r][c].color;
        return null;
      };
      let fired = false;
      for (let slot = 0; slot < snap.pens.length; slot++) {
        const p = snap.pens[slot];
        if (!p || p.type === 'pip' || p.type === 'mochi' || p.type === 'prism') continue;
        for (let lane = 0; lane < 3; lane++) {
          const fc = frontColor(lane);
          if (fc && fc !== p.color) { eng.launchLane(lane, slot); fired = true; break; }
        }
        if (fired) break;
      }
      if (!fired) {
        // dump any piggy anywhere (even matching) to burn ammo
        for (let slot = 0; slot < snap.pens.length; slot++) {
          const p = snap.pens[slot];
          if (!p) continue;
          if (p.type === 'prism' && snap.prismUsed) continue;
          eng.launchLane(0, slot); fired = true; break;
        }
      }
      await sleep(120);
    }
    return 'timeout';
  });
  if (lost === 'lost') {
    ok('lose path reachable');
    await page.waitForTimeout(400);
    const loseText = await page.getByText(/Out of Piggies|Pens Overflowed/i).count();
    if (loseText) ok('loss dialog shows with reason'); else fail('loss dialog missing');
  } else console.log('note: lose attempt ended with: ' + lost + ' (burning ammo may still clear); not fatal');
  await page.screenshot({ path: `${SHOT_DIR}/09-lose.png` });
  // back out
  const retry = page.getByRole('button', { name: /levels|try again/i }).first();
  if (await retry.count()) await retry.click();
  else {
    // still mid-game: pause then quit
    const pauseBtn = page.getByRole('button', { name: /pause/i });
    if (await pauseBtn.count()) {
      await pauseBtn.click();
      await page.waitForTimeout(200);
      const quit = page.getByRole('button', { name: /quit/i });
      if (await quit.count()) await quit.click();
    }
  }
}

// --- Kingdom + settings screens ---
await page.waitForTimeout(400);
// navigate: if in game still, quit via pause
const kingdomBtn = page.getByRole('button', { name: /kingdom/i }).first();
if (await kingdomBtn.count()) {
  await kingdomBtn.click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${SHOT_DIR}/10-kingdom.png` });
  ok('kingdom screen opened');
  const back = page.getByRole('button', { name: /back|levels/i }).first();
  if (await back.count()) await back.click();
} else console.log('note: kingdom button not found from current screen');

// --- Desktop viewport sanity ---
await page.setViewportSize({ width: 1280, height: 800 });
await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
await page.waitForTimeout(400);
await page.screenshot({ path: `${SHOT_DIR}/11-desktop-menu.png` });

console.log('\nconsole errors:', consoleErrors.length ? consoleErrors : 'none');
console.log(errors.length ? `\n${errors.length} FAILURES` : '\nALL CHECKS PASSED');
await browser.close();
process.exit(errors.length ? 1 : 0);
