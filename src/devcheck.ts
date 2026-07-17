import { LEVELS } from './data/levels';
import { solveAll } from './engine/solver';
import { GameEngine } from './engine/engine';
import { solveLevel } from './engine/solver';
import { generateDailyLevel, todayKey } from './daily/daily';
import type { LevelDef } from './engine/types';

// Validate board/picture dimensions.
let dimOk = true;
for (const lvl of LEVELS) {
  const w = lvl.blocks[0].length;
  for (const row of lvl.blocks) {
    if (row.length !== w) {
      console.log(`Level ${lvl.id} block row width mismatch: "${row}" (${row.length} vs ${w})`);
      dimOk = false;
    }
  }
  if (w % 3 !== 0) {
    console.log(`Level ${lvl.id} width ${w} not divisible by 3`);
    dimOk = false;
  }
  if (lvl.picture.length !== lvl.blocks.length) {
    console.log(`Level ${lvl.id} picture height ${lvl.picture.length} != board ${lvl.blocks.length}`);
    dimOk = false;
  }
  for (const row of lvl.picture) {
    if (row.length !== w) {
      console.log(`Level ${lvl.id} picture row width mismatch: "${row}" (${row.length} vs ${w})`);
      dimOk = false;
    }
  }
}
console.log(dimOk ? 'DIMENSIONS OK' : 'DIMENSION ERRORS FOUND');

const reports = solveAll(LEVELS);
let allSolvable = true;
for (const r of reports) {
  console.log(`L${r.levelId} ${r.solvable ? 'OK ' : 'FAIL'} ${r.name} — ${r.note}`);
  if (!r.solvable) allSolvable = false;
}
console.log(allSolvable ? 'ALL LEVELS SOLVABLE' : 'SOME LEVELS UNSOLVABLE');

// --- Chain reaction unit check -------------------------------------------
// Board (top to bottom):   . m .      Clearing the coral L drops the three
//                          m c m      mints into one row: three previously
//                          c c c      separate clusters merge and cascade.
const chainLevel: LevelDef = {
  id: 999,
  name: 'chain-test',
  tagline: '',
  pictureName: 'test',
  blocks: ['.m.', 'mcm', 'ccc'],
  picture: ['...', '...', '...'],
  pens: 3,
  spawnMs: 99999,
  queue: [{ type: 'blaze', color: 'coral' }],
  starScores: [1, 2, 3],
  pigment: 0,
};
const eng = new GameEngine(chainLevel);
eng.start();
eng.launchLane(0, 0);
let chainOk = false;
for (let t = 0; t < 20; t++) {
  eng.tick(100);
  const s = eng.getSnapshot();
  if (s.lastChain && s.phase === 'won') {
    chainOk = s.lastChain.stage === 2 && s.lastChain.cleared.length === 3;
    break;
  }
}
console.log(chainOk ? 'CHAIN CASCADE OK' : 'CHAIN CASCADE FAILED');

// --- Daily bonus board validation --------------------------------------
// Generate boards for a spread of dates and confirm each is solver-passing
// and deterministic for its date.
let dailyOk = true;
const dates: string[] = [];
const base = new Date('2026-07-01T12:00:00');
for (let i = 0; i < 30; i++) {
  const d = new Date(base);
  d.setDate(base.getDate() + i);
  dates.push(todayKey(d));
}
for (const date of dates) {
  const lvl = generateDailyLevel(date);
  const again = generateDailyLevel(date);
  const report = solveLevel(lvl);
  if (!report.solvable) {
    console.log(`DAILY ${date} UNSOLVABLE: ${report.note}`);
    dailyOk = false;
  }
  if (JSON.stringify(lvl.blocks) !== JSON.stringify(again.blocks)) {
    console.log(`DAILY ${date} NOT DETERMINISTIC`);
    dailyOk = false;
  }
}
console.log(dailyOk ? `DAILY BOARDS OK (${dates.length} dates validated)` : 'DAILY BOARD FAILURES');

// --- Glitch Tide deterministic unit checks -----------------------------
// Idle-able board (id 2 → early tier: ~45s idle-to-strike). Three separate
// coral columns (cols 0/2/4) never merge under gravity, so idling never
// auto-clears the board, and one 2-ammo coral blaze can match twice.
function tideLevel(id: number): LevelDef {
  return {
    id,
    name: 'tide-test',
    tagline: '',
    pictureName: 'test',
    blocks: ['c.c.c.', 'c.c.c.', 'c.c.c.', 'c.c.c.', 'c.c.c.'],
    picture: ['......', '......', '......', '......', '......'],
    pens: 3,
    spawnMs: 99999,
    queue: [{ type: 'blaze', color: 'coral', ammo: 4 }],
    starScores: [1, 2, 3],
    pigment: 0,
  };
}
const tideChecks: [string, boolean][] = [];

// 1. Tutorial (level 1) has no Tide even after moves + long idle.
{
  const e = new GameEngine({ ...tideLevel(1) });
  e.start();
  e.launchLane(0, 0);
  for (let t = 0; t < 200; t++) e.tick(1000);
  const s = e.getSnapshot();
  tideChecks.push(['tutorial has no tide', !s.tideEnabled && s.tide === 0 && s.strikes === 0]);
}

// 2. Tide is idle before the first move, then rises after it.
{
  const e = new GameEngine(tideLevel(2));
  e.start();
  for (let t = 0; t < 10; t++) e.tick(1000);
  const beforeMove = e.getSnapshot().tide;
  e.launchLane(0, 0);
  for (let t = 0; t < 5; t++) e.tick(200); // let cascades settle
  const afterClear = e.getSnapshot().tide;
  for (let t = 0; t < 8; t++) e.tick(1000); // idle
  const afterIdle = e.getSnapshot().tide;
  tideChecks.push([
    'tide idle before move, rises after',
    beforeMove === 0 && afterIdle > afterClear,
  ]);
}

// 3. Pause stops the clock.
{
  const e = new GameEngine(tideLevel(2));
  e.start();
  e.launchLane(0, 0);
  for (let t = 0; t < 4; t++) e.tick(200);
  const before = e.getSnapshot().tide;
  e.pause();
  for (let t = 0; t < 30; t++) e.tick(1000);
  const during = e.getSnapshot().tide;
  e.resume();
  tideChecks.push(['pause stops the tide clock', before === during]);
}

// 4. Strike on expiry: meter resets, board is untouched, no instant loss.
{
  const e = new GameEngine(tideLevel(2));
  e.start();
  e.launchLane(0, 0);
  for (let t = 0; t < 3; t++) e.tick(200);
  const blocksBefore = e.getSnapshot().blocksRemaining;
  // Idle ~55s to guarantee one strike (early ≈ 45s to fill).
  for (let t = 0; t < 60; t++) e.tick(1000);
  const s = e.getSnapshot();
  const blocksAfter = s.blocksRemaining;
  tideChecks.push([
    'strike resets meter, keeps board',
    s.strikes >= 1 && s.phase === 'playing' && s.tide < 100 && blocksAfter === blocksBefore,
  ]);
}

// 5. Three strikes lose the level with reason 'tide'.
{
  const e = new GameEngine(tideLevel(2));
  e.start();
  e.launchLane(0, 0);
  for (let t = 0; t < 400 && e.getSnapshot().phase === 'playing'; t++) e.tick(1000);
  const s = e.getSnapshot();
  tideChecks.push(['three strikes = loss (tide)', s.phase === 'lost' && s.lossReason === 'tide' && s.strikes === 3]);
}

// 6. Relaxed Mode: the Tide never rises.
{
  const e = new GameEngine(tideLevel(2), { relaxed: true });
  e.start();
  e.launchLane(0, 0);
  for (let t = 0; t < 200; t++) e.tick(1000);
  const s = e.getSnapshot();
  tideChecks.push(['relaxed mode disables tide', !s.tideEnabled && s.tide === 0 && s.strikes === 0]);
}

// 7. A match restores time (lowers the meter).
{
  const e = new GameEngine(tideLevel(2));
  e.start();
  e.launchLane(0, 0); // clears the col-0 coral cluster; sets shotsFired
  for (let t = 0; t < 10; t++) e.tick(1000); // raise the tide (~22)
  const raised = e.getSnapshot().tide;
  e.launchLane(1, 0); // same 4-ammo coral blaze clears the col-2 cluster
  const restored = e.getSnapshot().tide;
  tideChecks.push(['match restores tide', raised > 5 && restored < raised]);
}

// 8. Second Wind revives a tide loss without touching the board.
{
  const e = new GameEngine(tideLevel(2));
  e.start();
  e.launchLane(0, 0);
  for (let t = 0; t < 400 && e.getSnapshot().phase === 'playing'; t++) e.tick(1000);
  const lost = e.getSnapshot();
  const blocks = lost.blocksRemaining;
  const revived = e.secondWind();
  const s = e.getSnapshot();
  tideChecks.push([
    'second wind revives tide loss',
    lost.phase === 'lost' && revived && s.phase === 'playing' && s.strikes === 1 && s.blocksRemaining === blocks,
  ]);
}

let tideOk = true;
for (const [name, pass] of tideChecks) {
  if (!pass) {
    console.log(`TIDE CHECK FAILED: ${name}`);
    tideOk = false;
  }
}
console.log(tideOk ? `GLITCH TIDE OK (${tideChecks.length} checks)` : 'GLITCH TIDE FAILURES');

if (!chainOk || !allSolvable || !dimOk || !dailyOk || !tideOk) throw new Error('devcheck failed');
