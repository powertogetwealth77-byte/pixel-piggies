import type {
  Block,
  ChainEvent,
  GameSnapshot,
  LaunchResult,
  LevelDef,
  LossReason,
  Piggy,
  QueueEntry,
} from './types';
import { BLOCK_CHAR } from '../data/palette';

export const LANES = 3;
export const FEVER_MS = 10000;
export const COMBO_TIMEOUT_MS = 3500;
/** Delay between cascade stages so each pop reads as its own beat. */
export const CHAIN_STAGE_MS = 420;

let uid = 1;
const nextId = () => uid++;

export function expandQueue(entries: QueueEntry[]): Piggy[] {
  const out: Piggy[] = [];
  for (const e of entries) {
    const count = e.count ?? 1;
    for (let i = 0; i < count; i++) {
      const ammo = e.ammo ?? 1;
      out.push({ id: nextId(), type: e.type, color: e.color, ammo, maxAmmo: ammo });
    }
  }
  return out;
}

export function parseBoard(rows: string[]): (Block | null)[][] {
  return rows.map((row) =>
    row.split('').map((ch) => {
      const color = BLOCK_CHAR[ch];
      return color ? { id: nextId(), color } : null;
    }),
  );
}

function countBlocks(board: (Block | null)[][]): number {
  let n = 0;
  for (const row of board) for (const c of row) if (c) n++;
  return n;
}

/** Mutable internal state, wrapped by the engine. */
interface InternalState {
  phase: GameSnapshot['phase'];
  board: (Block | null)[][];
  revealed: boolean[][];
  pens: (Piggy | null)[];
  queue: Piggy[];
  selectedPen: number | null;
  score: number;
  combo: number;
  bestCombo: number;
  fever: number;
  feverActive: boolean;
  feverMsLeft: number;
  prismUsed: boolean;
  shotsFired: number;
  spawnTimer: number;
  comboTimer: number;
  elapsedMs: number;
  blocksTotal: number;
  lastLaunch: LaunchResult | null;
  lossReason: LossReason | null;
  lastChain: ChainEvent | null;
  /** Scheduled cascade check: cluster ids per block before the last pop. */
  pendingChain: { stage: number; delayMs: number; prevClusterOf: Map<number, number> } | null;
}

export class GameEngine {
  readonly level: LevelDef;
  readonly width: number;
  readonly height: number;
  private s: InternalState;
  private listeners = new Set<() => void>();
  private snap: GameSnapshot;

  constructor(level: LevelDef) {
    this.level = level;
    const board = parseBoard(level.blocks);
    this.height = board.length;
    this.width = board[0].length;
    this.s = {
      phase: 'ready',
      board,
      revealed: board.map((row) => row.map(() => false)),
      pens: new Array(level.pens).fill(null),
      queue: expandQueue(level.queue),
      selectedPen: null,
      score: 0,
      combo: 0,
      bestCombo: 0,
      fever: 0,
      feverActive: false,
      feverMsLeft: 0,
      prismUsed: false,
      shotsFired: 0,
      spawnTimer: 700, // small grace before first spawn
      comboTimer: 0,
      elapsedMs: 0,
      blocksTotal: countBlocks(board),
      lastLaunch: null,
      lossReason: null,
      lastChain: null,
      pendingChain: null,
    };
    this.snap = this.build();
  }

  subscribe = (fn: () => void): (() => void) => {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  };

  getSnapshot = (): GameSnapshot => this.snap;

  private emit() {
    this.snap = this.build();
    for (const l of this.listeners) l();
  }

  private build(): GameSnapshot {
    const s = this.s;
    const remaining = countBlocks(s.board);
    const filledPens = s.pens.filter(Boolean).length;
    return {
      phase: s.phase,
      level: this.level,
      width: this.width,
      height: this.height,
      board: s.board,
      revealed: s.revealed,
      pens: s.pens,
      queue: s.queue,
      selectedPen: s.selectedPen,
      blocksRemaining: remaining,
      blocksTotal: s.blocksTotal,
      score: s.score,
      combo: s.combo,
      bestCombo: s.bestCombo,
      multiplier: this.multiplier(),
      fever: s.fever,
      feverActive: s.feverActive,
      feverMsLeft: s.feverMsLeft,
      prismUsed: s.prismUsed,
      shotsFired: s.shotsFired,
      nextSpawnMs: Math.max(0, s.spawnTimer),
      lastLaunch: s.lastLaunch,
      lastChain: s.lastChain,
      chainPending: s.pendingChain !== null,
      elapsedMs: s.elapsedMs,
      closeCall: filledPens >= this.level.pens - 1 && s.queue.length > 0,
      lossReason: s.lossReason,
    };
  }

  private multiplier(): number {
    const base = 1 + Math.floor(this.s.combo / 3);
    return Math.min(9, base) * (this.s.feverActive ? 2 : 1);
  }

  start() {
    if (this.s.phase === 'ready') {
      this.s.phase = 'playing';
      this.fillPensImmediate(1); // seed one piggy so the player can act at once
      this.emit();
    }
  }

  pause() {
    if (this.s.phase === 'playing') {
      this.s.phase = 'paused';
      this.emit();
    }
  }

  resume() {
    if (this.s.phase === 'paused') {
      this.s.phase = 'playing';
      this.emit();
    }
  }

  selectPen(slot: number) {
    if (this.s.phase !== 'playing') return;
    if (!this.s.pens[slot]) return;
    this.s.selectedPen = this.s.selectedPen === slot ? null : slot;
    this.emit();
  }

  private fillPensImmediate(max: number) {
    let placed = 0;
    while (placed < max && this.s.queue.length > 0) {
      const empty = this.s.pens.findIndex((p) => p === null);
      if (empty === -1) break;
      this.s.pens[empty] = this.s.queue.shift()!;
      placed++;
    }
  }

  /** Advance real-time systems. dtMs is elapsed since last tick. */
  tick(dtMs: number) {
    if (this.s.phase !== 'playing') return;
    const s = this.s;
    s.elapsedMs += dtMs;

    // Fever countdown.
    if (s.feverActive) {
      s.feverMsLeft -= dtMs;
      if (s.feverMsLeft <= 0) {
        s.feverActive = false;
        s.feverMsLeft = 0;
        s.fever = 0;
      }
    }

    // Combo decay.
    if (s.combo > 0) {
      s.comboTimer -= dtMs;
      if (s.comboTimer <= 0) {
        s.combo = 0;
      }
    }

    // Cascade stages: merged same-color clusters auto-pop on a timer.
    if (s.pendingChain) {
      s.pendingChain.delayMs -= dtMs;
      if (s.pendingChain.delayMs <= 0) this.processChainStage();
    }

    // Spawning (paused during fever for a satisfying breather).
    if (!s.feverActive && s.queue.length > 0) {
      s.spawnTimer -= dtMs;
      if (s.spawnTimer <= 0) {
        const empty = s.pens.findIndex((p) => p === null);
        if (empty === -1) {
          // Holding pens overflow -> loss.
          s.phase = 'lost';
          s.lossReason = 'overflow';
          this.emit();
          return;
        }
        s.pens[empty] = s.queue.shift()!;
        s.spawnTimer = this.level.spawnMs;
      }
    }

    this.checkEnd();
    this.emit();
  }

  private checkEnd() {
    const s = this.s;
    if (s.phase !== 'playing') return;
    if (countBlocks(s.board) === 0) {
      s.phase = 'won';
      return;
    }
    // Out of ammo: no piggies in pens and nothing left to spawn.
    // A pending cascade may still clear the rest — never lose mid-chain.
    const anyPen = s.pens.some(Boolean);
    if (!anyPen && s.queue.length === 0 && !s.pendingChain) {
      s.phase = 'lost';
      s.lossReason = 'ammo';
    }
  }

  /** Launch the selected (or given) piggy into a lane. */
  launchLane(lane: number, slotOverride?: number) {
    if (this.s.phase !== 'playing') return;
    const slot = slotOverride ?? this.s.selectedPen;
    if (slot == null || !this.s.pens[slot]) return;
    const piggy = this.s.pens[slot]!;

    // Prism is limited to one use per level.
    if (piggy.type === 'prism' && this.s.prismUsed) return;

    const result = this.resolveLaunch(piggy, lane);

    // Consume ammo / free the pen slot.
    piggy.ammo -= 1;
    this.s.shotsFired += 1;
    if (piggy.type === 'prism') this.s.prismUsed = true;
    if (piggy.ammo <= 0) {
      this.s.pens[slot] = null;
      if (this.s.selectedPen === slot) this.s.selectedPen = null;
    }

    this.s.lastLaunch = result;
    this.checkEnd();
    this.emit();
  }

  private colsForLane(lane: number): number[] {
    const laneW = this.width / LANES;
    const start = Math.round(lane * laneW);
    const end = Math.round((lane + 1) * laneW);
    const cols: number[] = [];
    for (let c = start; c < end; c++) cols.push(c);
    return cols;
  }

  private impactCell(lane: number): { row: number; col: number } | null {
    const cols = this.colsForLane(lane);
    // Bottom-most block within the lane columns.
    for (let r = this.height - 1; r >= 0; r--) {
      for (const c of cols) {
        if (this.s.board[r][c]) return { row: r, col: c };
      }
    }
    return null;
  }

  private floodSameColor(sr: number, sc: number): Set<string> {
    const target = this.s.board[sr][sc];
    const out = new Set<string>();
    if (!target) return out;
    const stack = [[sr, sc]];
    while (stack.length) {
      const [r, c] = stack.pop()!;
      const key = `${r},${c}`;
      if (out.has(key)) continue;
      const cell = this.s.board[r]?.[c];
      if (!cell || cell.color !== target.color) continue;
      out.add(key);
      stack.push([r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]);
    }
    return out;
  }

  /**
   * Label every same-color cluster on the board. Returns a map from block id
   * to cluster id, so merges can be detected after gravity moves blocks.
   */
  private labelClusters(): Map<number, number> {
    const s = this.s;
    const out = new Map<number, number>();
    const seen = new Set<string>();
    let nextCluster = 0;
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        const start = s.board[r][c];
        if (!start || seen.has(`${r},${c}`)) continue;
        const cluster = nextCluster++;
        const stack = [[r, c]];
        while (stack.length) {
          const [rr, cc] = stack.pop()!;
          const key = `${rr},${cc}`;
          if (seen.has(key)) continue;
          const cell = s.board[rr]?.[cc];
          if (!cell || cell.color !== start.color) continue;
          seen.add(key);
          out.set(cell.id, cluster);
          stack.push([rr - 1, cc], [rr + 1, cc], [rr, cc - 1], [rr, cc + 1]);
        }
      }
    }
    return out;
  }

  /**
   * Pop every cluster that was formed by merging two or more previously
   * separate clusters of the same color. Each firing is one cascade stage
   * with escalating rewards; another stage is scheduled if anything popped.
   */
  private processChainStage() {
    const s = this.s;
    const pending = s.pendingChain!;
    const prev = pending.prevClusterOf;
    const nowClusters = this.labelClusters();

    // Group current blocks by cluster id.
    const members = new Map<number, { row: number; col: number; block: Block }[]>();
    for (let r = 0; r < this.height; r++) {
      for (let c = 0; c < this.width; c++) {
        const cell = s.board[r][c];
        if (!cell) continue;
        const cid = nowClusters.get(cell.id)!;
        if (!members.has(cid)) members.set(cid, []);
        members.get(cid)!.push({ row: r, col: c, block: cell });
      }
    }

    const cleared: ChainEvent['cleared'] = [];
    for (const cells of members.values()) {
      const prevIds = new Set<number>();
      for (const { block } of cells) {
        const pid = prev.get(block.id);
        if (pid !== undefined) prevIds.add(pid);
      }
      if (prevIds.size < 2) continue; // not a merge — leave it to the player
      for (const { row, col, block } of cells) {
        cleared.push({ row, col, color: block.color });
        s.board[row][col] = null;
        s.revealed[row][col] = true;
      }
    }

    if (cleared.length === 0) {
      s.pendingChain = null;
      return;
    }

    // Snapshot clusters before gravity so the NEXT stage can detect merges.
    const beforeGravity = this.labelClusters();
    this.applyGravity();

    const stage = pending.stage;
    s.combo += cleared.length;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    s.comboTimer = COMBO_TIMEOUT_MS;
    const mult = this.multiplier();
    const gained = cleared.length * 12 * stage * mult;
    s.score += gained;
    if (!s.feverActive) {
      s.fever = Math.min(100, s.fever + cleared.length * 5 * stage);
      if (s.fever >= 100) {
        s.feverActive = true;
        s.feverMsLeft = FEVER_MS;
      }
    }

    s.lastChain = {
      id: nextId(),
      stage,
      cleared,
      gained,
      comboAfter: s.combo,
      multiplier: mult,
    };
    s.pendingChain = {
      stage: stage + 1,
      delayMs: CHAIN_STAGE_MS,
      prevClusterOf: beforeGravity,
    };
  }

  private resolveLaunch(piggy: Piggy, lane: number): LaunchResult {
    const s = this.s;
    const impact = this.impactCell(lane);
    const cols = this.colsForLane(lane);

    const clearKeys = new Set<string>();
    let matched = false;

    if (impact) {
      const impCell = s.board[impact.row][impact.col]!;
      const isWild = piggy.type === 'prism';
      matched = isWild || impCell.color === piggy.color;

      if (matched) {
        for (const k of this.floodSameColor(impact.row, impact.col)) clearKeys.add(k);
      }

      // Type bonuses.
      if (piggy.type === 'pip') {
        // Drill the lane: pop every block of Pip's own color, however deep.
        for (let r = 0; r < this.height; r++) {
          for (const c of cols) {
            const cell = s.board[r][c];
            if (cell && cell.color === piggy.color) clearKeys.add(`${r},${c}`);
          }
        }
      } else if (piggy.type === 'mochi') {
        // 3x3 area centered on impact.
        for (let dr = -1; dr <= 1; dr++) {
          for (let dc = -1; dc <= 1; dc++) {
            const r = impact.row + dr;
            const c = impact.col + dc;
            if (s.board[r]?.[c]) clearKeys.add(`${r},${c}`);
          }
        }
      }
    }

    // Fever: every clear also pops immediate orthogonal neighbors for juicier chains.
    if (s.feverActive && clearKeys.size > 0) {
      const extra: string[] = [];
      for (const k of clearKeys) {
        const [r, c] = k.split(',').map(Number);
        for (const [nr, nc] of [
          [r - 1, c],
          [r + 1, c],
          [r, c - 1],
          [r, c + 1],
        ]) {
          if (s.board[nr]?.[nc]) extra.push(`${nr},${nc}`);
        }
      }
      for (const k of extra) clearKeys.add(k);
    }

    const fizzle = clearKeys.size === 0;
    const cleared: LaunchResult['cleared'] = [];

    if (!fizzle) {
      // Remember the cluster layout so gravity-made merges cascade.
      const prevClusterOf = this.labelClusters();
      for (const k of clearKeys) {
        const [r, c] = k.split(',').map(Number);
        const cell = s.board[r][c];
        if (cell) {
          cleared.push({ row: r, col: c, color: cell.color });
          s.board[r][c] = null;
          s.revealed[r][c] = true;
        }
      }
      this.applyGravity();
      this.s.pendingChain = {
        stage: 2,
        delayMs: CHAIN_STAGE_MS,
        prevClusterOf,
      };

      // Scoring & combo.
      let comboGain = cleared.length;
      if (piggy.type === 'blaze') comboGain *= 2;
      s.combo += comboGain;
      s.bestCombo = Math.max(s.bestCombo, s.combo);
      s.comboTimer = COMBO_TIMEOUT_MS;

      const mult = this.multiplier();
      const chainBonus = cleared.length > 4 ? cleared.length * 5 : 0;
      const gainedBase = cleared.length * 10 + chainBonus;
      const gained = gainedBase * mult;
      s.score += gained;

      // Fever meter.
      let feverGain = cleared.length * 6;
      if (piggy.type === 'blaze') feverGain *= 2;
      if (!s.feverActive) {
        s.fever = Math.min(100, s.fever + feverGain);
        if (s.fever >= 100) {
          s.feverActive = true;
          s.feverMsLeft = FEVER_MS;
        }
      }

      const shake = Math.min(1, cleared.length / 8) * (s.feverActive ? 1 : 0.8);
      return {
        id: nextId(),
        lane,
        cleared,
        comboAfter: s.combo,
        multiplier: mult,
        gained,
        fizzle: false,
        fever: s.feverActive,
        shake,
        piggyType: piggy.type,
      };
    }

    // Fizzle: break the combo.
    s.combo = 0;
    return {
      id: nextId(),
      lane,
      cleared: [],
      comboAfter: 0,
      multiplier: this.multiplier(),
      gained: 0,
      fizzle: true,
      fever: s.feverActive,
      shake: 0,
      piggyType: piggy.type,
    };
  }

  /** Blocks fall down within their column to fill cleared gaps. */
  private applyGravity() {
    const s = this.s;
    for (let c = 0; c < this.width; c++) {
      const stack: Block[] = [];
      for (let r = this.height - 1; r >= 0; r--) {
        const cell = s.board[r][c];
        if (cell) stack.push(cell);
      }
      // Refill from bottom.
      let idx = 0;
      for (let r = this.height - 1; r >= 0; r--) {
        s.board[r][c] = idx < stack.length ? stack[idx++] : null;
      }
    }
  }

  /** Compute stars (1-3) for a completed level. */
  stars(): number {
    const [s1, s2, s3] = this.level.starScores;
    if (this.s.score >= s3) return 3;
    if (this.s.score >= s2) return 2;
    if (this.s.score >= s1) return 1;
    return 1; // winning always earns at least one star
  }

  coins(): number {
    return Math.round(this.s.score / 25) + this.stars() * 20 + this.s.bestCombo * 2;
  }
}
