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

if (!chainOk || !allSolvable || !dimOk || !dailyOk) throw new Error('devcheck failed');
