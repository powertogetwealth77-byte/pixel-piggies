import { LEVELS } from './data/levels';
import { solveAll } from './engine/solver';

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
