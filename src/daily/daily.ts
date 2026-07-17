// Daily bonus board — one fresh, fair puzzle per calendar day.
//
// Boards are assembled from controlled templates with a date-seeded RNG, so
// everyone playing on the same day gets the same board. Every candidate is
// validated with the same greedy solver that guards the campaign levels
// before it is offered to the player; if a candidate fails, the seed is
// nudged and another is tried, with a hand-checked static fallback as the
// final safety net.

import type { ColorId, LevelDef } from '../engine/types';
import { COLOR_IDS } from '../engine/types';
import { solveLevel } from '../engine/solver';

export const DAILY_LEVEL_ID = 1000;
export const DAILY_PIGMENT = 25;

/** Local calendar date key, e.g. "2026-07-17". */
export function todayKey(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** mulberry32 — tiny deterministic PRNG. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const CHAR: Record<ColorId, string> = {
  coral: 'c',
  sunny: 's',
  mint: 'm',
  sky: 'b',
  grape: 'g',
};

type Template = (colors: ColorId[]) => string[];

/** Board templates: 6 wide × 5 tall, built from 3 picked colors. */
const TEMPLATES: Template[] = [
  // Horizontal bands.
  ([a, b, c]) => {
    const A = CHAR[a].repeat(6);
    const B = CHAR[b].repeat(6);
    const C = CHAR[c].repeat(6);
    return [A, A, B, B, C];
  },
  // 2x2 checker of two colors over a base band.
  ([a, b, c]) => {
    const ab = (CHAR[a] + CHAR[a] + CHAR[b] + CHAR[b]).repeat(2).slice(0, 6);
    const ba = (CHAR[b] + CHAR[b] + CHAR[a] + CHAR[a]).repeat(2).slice(0, 6);
    return [ab, ab, ba, ba, CHAR[c].repeat(6)];
  },
  // Frame around a core.
  ([a, b, c]) => {
    const A = CHAR[a];
    const B = CHAR[b];
    const C = CHAR[c];
    return [
      A + A + A + A + A + A,
      A + B + B + B + B + A,
      A + B + C + C + B + A,
      A + B + B + B + B + A,
      A + A + A + A + A + A,
    ];
  },
  // Column pairs (one color per lane).
  ([a, b, c]) => {
    const row = CHAR[a] + CHAR[a] + CHAR[b] + CHAR[b] + CHAR[c] + CHAR[c];
    const rowTop = CHAR[c] + CHAR[c] + CHAR[a] + CHAR[a] + CHAR[b] + CHAR[b];
    return [rowTop, rowTop, row, row, row];
  },
];

const PICTURES: { name: string; art: string[] }[] = [
  { name: 'Lucky Star', art: ['..s...', '.sss..', 'ssssss', '.ssss.', 's.ss.s'] },
  { name: 'Gift Box', art: ['.oyyo.', 'oooooo', 'orrrro', 'orrrro', 'oooooo'] },
  { name: 'Big Heart', art: ['.r..r.', 'rrrrrr', 'rrrrrr', '.rrrr.', '..rr..'] },
  { name: 'Gold Coin', art: ['.yyyy.', 'yyooyy', 'yoyyoy', 'yyooyy', '.yyyy.'] },
];

/** Count same-color clusters so the queue can cover every group generously. */
function clusterCounts(rows: string[]): Map<string, number> {
  const h = rows.length;
  const w = rows[0].length;
  const seen = new Set<string>();
  const counts = new Map<string, number>();
  for (let r = 0; r < h; r++) {
    for (let c = 0; c < w; c++) {
      const ch = rows[r][c];
      if (ch === '.' || seen.has(`${r},${c}`)) continue;
      counts.set(ch, (counts.get(ch) ?? 0) + 1);
      const stack = [[r, c]];
      while (stack.length) {
        const [rr, cc] = stack.pop()!;
        const key = `${rr},${cc}`;
        if (seen.has(key)) continue;
        if (rows[rr]?.[cc] !== ch) continue;
        seen.add(key);
        stack.push([rr - 1, cc], [rr + 1, cc], [rr, cc - 1], [rr, cc + 1]);
      }
    }
  }
  return counts;
}

const CHAR_TO_COLOR: Record<string, ColorId> = {
  c: 'coral',
  s: 'sunny',
  m: 'mint',
  b: 'sky',
  g: 'grape',
};

function buildCandidate(dateKey: string, attempt: number): LevelDef {
  const rand = rng(hashString(`${dateKey}#${attempt}`));
  const colors = [...COLOR_IDS].sort(() => rand() - 0.5).slice(0, 3) as ColorId[];
  const template = TEMPLATES[Math.floor(rand() * TEMPLATES.length)];
  const blocks = template(colors);
  const picture = PICTURES[Math.floor(rand() * PICTURES.length)];

  // Generous queue: a matcher per cluster, plus flexible cleanup piggies.
  const queue: LevelDef['queue'] = [];
  const counts = clusterCounts(blocks);
  for (const [ch, n] of counts) {
    queue.push({ type: 'blaze', color: CHAR_TO_COLOR[ch], count: n });
  }
  queue.sort(() => rand() - 0.5);
  queue.push({ type: 'mochi', color: colors[0] });
  queue.push({ type: 'mochi', color: colors[1] });
  queue.push({ type: 'pip', color: colors[2] });
  queue.push({ type: 'prism', color: colors[0] });

  return {
    id: DAILY_LEVEL_ID,
    name: 'Daily Bonus',
    tagline: 'A fresh board every day — come back tomorrow!',
    pictureName: picture.name,
    blocks,
    picture: picture.art,
    pens: 5,
    spawnMs: 4200,
    queue,
    starScores: [450, 1000, 1800],
    pigment: DAILY_PIGMENT,
  };
}

/** Hand-verified fallback if every generated candidate fails validation. */
const FALLBACK: LevelDef = {
  id: DAILY_LEVEL_ID,
  name: 'Daily Bonus',
  tagline: 'A fresh board every day — come back tomorrow!',
  pictureName: 'Lucky Star',
  blocks: ['ssssss', 'ssssss', 'cccccc', 'cccccc', 'bbbbbb'],
  picture: PICTURES[0].art,
  pens: 5,
  spawnMs: 4200,
  queue: [
    { type: 'blaze', color: 'sunny' },
    { type: 'blaze', color: 'coral' },
    { type: 'blaze', color: 'sky' },
    { type: 'mochi', color: 'sunny' },
    { type: 'prism', color: 'coral' },
  ],
  starScores: [450, 1000, 1800],
  pigment: DAILY_PIGMENT,
};

export function generateDailyLevel(dateKey: string): LevelDef {
  for (let attempt = 0; attempt < 12; attempt++) {
    const candidate = buildCandidate(dateKey, attempt);
    if (solveLevel(candidate).solvable) return candidate;
  }
  return FALLBACK;
}
