import type { Block, LevelDef, Piggy } from './types';
import { LANES } from './engine';
import { expandQueue, parseBoard } from './engine';

// A lightweight greedy solver used by the developer verification tool.
// It ignores real-time timing / holding-pen pressure (those are execution
// skill, not solvability) and checks whether the level's total clearing
// power is enough to remove every block.

type Grid = (Block | null)[][];

function clone(board: Grid): Grid {
  return board.map((row) => row.map((c) => (c ? { ...c } : null)));
}

function count(board: Grid): number {
  let n = 0;
  for (const row of board) for (const c of row) if (c) n++;
  return n;
}

function colsForLane(lane: number, width: number): number[] {
  const laneW = width / LANES;
  const start = Math.round(lane * laneW);
  const end = Math.round((lane + 1) * laneW);
  const out: number[] = [];
  for (let c = start; c < end; c++) out.push(c);
  return out;
}

function impactCell(board: Grid, lane: number, width: number, height: number) {
  const cols = colsForLane(lane, width);
  for (let r = height - 1; r >= 0; r--) {
    for (const c of cols) if (board[r][c]) return { row: r, col: c };
  }
  return null;
}

function flood(board: Grid, sr: number, sc: number): Set<string> {
  const target = board[sr][sc];
  const out = new Set<string>();
  if (!target) return out;
  const stack = [[sr, sc]];
  while (stack.length) {
    const [r, c] = stack.pop()!;
    const key = `${r},${c}`;
    if (out.has(key)) continue;
    const cell = board[r]?.[c];
    if (!cell || cell.color !== target.color) continue;
    out.add(key);
    stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
  }
  return out;
}

function computeClear(board: Grid, piggy: Piggy, lane: number, width: number, height: number): Set<string> {
  const impact = impactCell(board, lane, width, height);
  const keys = new Set<string>();
  if (!impact) return keys;
  const cell = board[impact.row][impact.col]!;
  const isWild = piggy.type === 'prism';
  const matched = isWild || cell.color === piggy.color;
  if (matched) for (const k of flood(board, impact.row, impact.col)) keys.add(k);
  if (piggy.type === 'pip') {
    for (let r = 0; r < height; r++)
      for (const c of colsForLane(lane, width)) {
        const b = board[r][c];
        if (b && b.color === piggy.color) keys.add(`${r},${c}`);
      }
  } else if (piggy.type === 'mochi') {
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        const r = impact.row + dr;
        const c = impact.col + dc;
        if (board[r]?.[c]) keys.add(`${r},${c}`);
      }
  }
  return keys;
}

function applyClear(board: Grid, keys: Set<string>, width: number, height: number) {
  for (const k of keys) {
    const [r, c] = k.split(',').map(Number);
    board[r][c] = null;
  }
  for (let c = 0; c < width; c++) {
    const stack: Block[] = [];
    for (let r = height - 1; r >= 0; r--) if (board[r][c]) stack.push(board[r][c]!);
    let idx = 0;
    for (let r = height - 1; r >= 0; r--) board[r][c] = idx < stack.length ? stack[idx++] : null;
  }
}

export interface SolveReport {
  levelId: number;
  name: string;
  solvable: boolean;
  blocks: number;
  shotsUsed: number;
  piggiesAvailable: number;
  note: string;
}

export function solveLevel(level: LevelDef): SolveReport {
  const board = clone(parseBoard(level.blocks));
  const height = board.length;
  const width = board[0].length;
  const queue = expandQueue(level.queue);
  const total = count(board);

  let prismUsed = false;
  let shots = 0;
  const piggiesAvailable = queue.length;

  // Greedy: each step, use whichever remaining piggy + lane clears the most.
  while (count(board) > 0 && queue.length > 0) {
    let best: { qi: number; lane: number; size: number } | null = null;
    for (let qi = 0; qi < queue.length; qi++) {
      const p = queue[qi];
      if (p.type === 'prism' && prismUsed) continue;
      for (let lane = 0; lane < LANES; lane++) {
        const keys = computeClear(board, p, lane, width, height);
        if (!best || keys.size > best.size) best = { qi, lane, size: keys.size };
      }
    }
    if (!best || best.size === 0) break; // no progress possible
    const p = queue[best.qi];
    const keys = computeClear(board, p, best.lane, width, height);
    applyClear(board, keys, width, height);
    if (p.type === 'prism') prismUsed = true;
    p.ammo -= 1;
    if (p.ammo <= 0) queue.splice(best.qi, 1);
    shots++;
    if (shots > 500) break; // safety
  }

  const remaining = count(board);
  const solvable = remaining === 0;
  return {
    levelId: level.id,
    name: level.name,
    solvable,
    blocks: total,
    shotsUsed: shots,
    piggiesAvailable,
    note: solvable
      ? `Cleared with ${shots} shots (of ${piggiesAvailable} available).`
      : `Stuck with ${remaining}/${total} blocks left after ${shots} shots.`,
  };
}

export function solveAll(levels: LevelDef[]): SolveReport[] {
  return levels.map(solveLevel);
}
