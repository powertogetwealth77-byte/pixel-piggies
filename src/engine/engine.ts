import type {
  Block,
  ChainEvent,
  GameSnapshot,
  ItemId,
  LaunchResult,
  LevelDef,
  LossReason,
  Piggy,
  QueueEntry,
} from './types';
import { BLOCK_CHAR } from '../data/palette';
import {
  MAX_STRIKES,
  TIDE_MAX,
  tideConfigFor,
  tideStage,
  type TideConfig,
} from './tide';

export const LANES = 3;
export const FEVER_MS = 10000;
export const COMBO_TIMEOUT_MS = 3500;
/** Delay between cascade stages so each pop reads as its own beat. */
export const CHAIN_STAGE_MS = 420;

// Active recovery: correct matches shorten the piggy return cooldown. These
// only ever make piggies arrive *sooner*, so they never affect solvability.
const COOLDOWN_REDUCE_PER_CLEAR = 180; // ms shaved per cleared block
const COOLDOWN_REDUCE_CAP = 1200; // ms shaved per launch
/** A chain of at least this many cleared blocks instantly recalls one piggy. */
const CHAIN_RECALL_MIN = 3;

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
  // --- The Glitch Tide ---
  tide: number;
  strikes: number;
  tideFreezeMs: number; // remaining freeze (chain / freeze pop / grace)
  lastStrikeId: number;
  lastTimeRestored: number;
}

export interface EngineOptions {
  /** Relaxed Mode: no Glitch Tide, no strikes (reduced bonus rewards). */
  relaxed?: boolean;
}

export class GameEngine {
  readonly level: LevelDef;
  readonly width: number;
  readonly height: number;
  private s: InternalState;
  private listeners = new Set<() => void>();
  private snap: GameSnapshot;
  private relaxed: boolean;
  private tideCfg: TideConfig;

  constructor(level: LevelDef, opts: EngineOptions = {}) {
    this.level = level;
    this.relaxed = opts.relaxed ?? false;
    this.tideCfg = tideConfigFor(level.id, this.relaxed);
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
      tide: 0,
      strikes: 0,
      tideFreezeMs: 0,
      lastStrikeId: 0,
      lastTimeRestored: 0,
    };
    this.snap = this.build();
  }

  /** Toggle Relaxed Mode (test hook + in-level toggle). Recomputes Tide config. */
  setRelaxed(relaxed: boolean) {
    this.relaxed = relaxed;
    this.tideCfg = tideConfigFor(this.level.id, relaxed);
    if (relaxed) {
      this.s.tide = 0;
      this.s.tideFreezeMs = 0;
    }
    this.emit();
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
      tideEnabled: this.tideCfg.enabled,
      tide: s.tide,
      tideStage: tideStage(s.tide),
      tideFrozen: s.tideFreezeMs > 0 || s.feverActive,
      strikes: s.strikes,
      maxStrikes: MAX_STRIKES,
      lastStrikeId: s.lastStrikeId,
      relaxed: this.relaxed,
      penRecharge: this.penRecharge(),
      lastTimeRestored: s.lastTimeRestored,
    };
  }

  /** Per-pen recharge progress for the recharge rings (see types.penRecharge). */
  private penRecharge(): number[] {
    const s = this.s;
    const firstEmpty = s.pens.findIndex((p) => p === null);
    return s.pens.map((p, slot) => {
      if (p) return 1; // occupied → ready
      if (s.queue.length === 0) return -1; // nothing coming → no ring
      if (slot === firstEmpty) {
        return Math.max(0, Math.min(1, 1 - s.spawnTimer / this.level.spawnMs));
      }
      return 0; // queued behind, waiting its turn
    });
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

    // The Glitch Tide. Only rises after the first move, when enabled, and
    // never while frozen (chain / freeze pop / fever / post-strike grace).
    this.advanceTide(dtMs);

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

  /** Advance the Glitch Tide meter for a tick (called from tick()). */
  private advanceTide(dtMs: number) {
    const s = this.s;
    const cfg = this.tideCfg;

    // Freeze countdown always ticks down (chain / freeze pop / grace).
    if (s.tideFreezeMs > 0) s.tideFreezeMs = Math.max(0, s.tideFreezeMs - dtMs);

    if (!cfg.enabled) return;
    if (s.shotsFired === 0) return; // no pressure until the first move
    if (s.feverActive) {
      // Fever stops the Tide completely — gently drain it for relief.
      s.tide = Math.max(0, s.tide - (dtMs / 1000) * cfg.risePerSec * 2);
      return;
    }
    if (s.tideFreezeMs > 0) return; // frozen: no rise

    const stageMult = s.tide >= 75 ? cfg.criticalMultiplier : 1;
    s.tide += (dtMs / 1000) * cfg.risePerSec * stageMult;
    if (s.tide >= TIDE_MAX) this.glitchStrike();
  }

  /** Issue a Glitch Strike: reset the meter, grant grace, lose on the third. */
  private glitchStrike() {
    const s = this.s;
    s.strikes += 1;
    s.lastStrikeId += 1;
    s.tide = this.tideCfg.strikeResetLevel;
    s.tideFreezeMs = Math.max(s.tideFreezeMs, this.tideCfg.strikeGraceMs);
    if (s.strikes >= MAX_STRIKES) {
      // The board and piggies are untouched — a solvable puzzle stays solvable.
      s.phase = 'lost';
      s.lossReason = 'tide';
    }
  }

  /**
   * Test-only seam: force a Glitch Strike immediately (used by the browser
   * E2E to reach the loss/Second-Wind UI without a 45-second real-time idle).
   * The organic strike path is covered by the deterministic devcheck tests.
   */
  debugForceStrike() {
    if (this.tideCfg.enabled && this.s.phase === 'playing') {
      this.glitchStrike();
      this.checkEnd();
      this.emit();
    }
  }

  /** Reduce the Tide (matches restore time; big clears push it back). */
  private restoreTide(clearedCount: number) {
    const cfg = this.tideCfg;
    if (!cfg.enabled) {
      this.s.lastTimeRestored = 0;
      return;
    }
    let restore = Math.min(cfg.restoreCap, clearedCount * cfg.restorePerClear);
    if (clearedCount >= cfg.bigClearThreshold) restore += cfg.bigClearPushback;
    this.s.tide = Math.max(0, this.s.tide - restore);
    this.s.lastTimeRestored = restore;
  }

  /** Active recovery: shorten the piggy return cooldown after a match. */
  private shortenCooldown(clearedCount: number) {
    const cut = Math.min(COOLDOWN_REDUCE_CAP, clearedCount * COOLDOWN_REDUCE_PER_CLEAR);
    this.s.spawnTimer = Math.max(0, this.s.spawnTimer - cut);
  }

  /** Recall one piggy immediately if there's an empty pen (chains trigger this). */
  private recallOne(): boolean {
    const s = this.s;
    if (s.queue.length === 0) return false;
    const empty = s.pens.findIndex((p) => p === null);
    if (empty === -1) return false;
    s.pens[empty] = s.queue.shift()!;
    s.spawnTimer = this.level.spawnMs;
    return true;
  }

  /** Recall the whole team into every empty pen (Fever trigger). */
  private recallTeam() {
    const s = this.s;
    for (let slot = 0; slot < s.pens.length; slot++) {
      if (s.pens[slot] == null && s.queue.length > 0) s.pens[slot] = s.queue.shift()!;
    }
    s.spawnTimer = this.level.spawnMs;
  }

  /**
   * Apply a recovery item mid-level. Items never touch the board, queue order,
   * odds, or solvability — they only relieve time pressure or recall piggies.
   * Returns false if the item can't act (e.g. no empty pen), so the caller can
   * refund a free/paid use.
   */
  applyItem(id: ItemId): boolean {
    if (this.s.phase !== 'playing') return false;
    const s = this.s;
    switch (id) {
      case 'timeTreat':
        if (!this.tideCfg.enabled) return false;
        s.tide = Math.max(0, s.tide - 45);
        s.lastTimeRestored = 45;
        this.emit();
        return true;
      case 'freezePop':
        if (!this.tideCfg.enabled) return false;
        s.tideFreezeMs = Math.max(s.tideFreezeMs, 6000);
        this.emit();
        return true;
      case 'piggyWhistle': {
        const ok = this.recallOne();
        if (ok) this.emit();
        return ok;
      }
      case 'goldenPen': {
        // Grant one wild prism launch by dropping a fresh prism into a pen.
        const empty = s.pens.findIndex((p) => p === null);
        if (empty === -1) return false;
        s.pens[empty] = { id: nextId(), type: 'prism', color: 'coral', ammo: 1, maxAmmo: 1 };
        s.prismUsed = false; // this golden prism is usable even if the level's was spent
        this.emit();
        return true;
      }
      case 'secondWind':
        return this.secondWind();
    }
  }

  /** Post-loss continue: revive with strikes wound back and the Tide calmed. */
  secondWind(): boolean {
    const s = this.s;
    if (s.phase !== 'lost' || s.lossReason !== 'tide') return false;
    s.phase = 'playing';
    s.lossReason = null;
    s.strikes = Math.max(0, s.strikes - 2); // give back two strikes
    s.tide = 20;
    s.tideFreezeMs = 1500;
    this.emit();
    return true;
  }

  /** Launch the selected (or given) piggy into a lane. */
  launchLane(lane: number, slotOverride?: number) {
    if (this.s.phase !== 'playing') return;
    const slot = slotOverride ?? this.s.selectedPen;
    if (slot == null || !this.s.pens[slot]) return;
    const piggy = this.s.pens[slot]!;

    // Prism is limited to one use per level.
    if (piggy.type === 'prism' && this.s.prismUsed) return;

    const wasFever = this.s.feverActive;
    const result = this.resolveLaunch(piggy, lane);

    // Consume ammo / free the pen slot.
    piggy.ammo -= 1;
    this.s.shotsFired += 1;
    if (piggy.type === 'prism') this.s.prismUsed = true;
    if (piggy.ammo <= 0) {
      this.s.pens[slot] = null;
      if (this.s.selectedPen === slot) this.s.selectedPen = null;
    }

    // Correct match: restore Tide time & shorten the return cooldown.
    if (!result.fizzle && result.cleared.length > 0) {
      this.restoreTide(result.cleared.length);
      this.shortenCooldown(result.cleared.length);
    } else {
      this.s.lastTimeRestored = 0;
    }
    // Fever just ignited: recall the whole team and the Tide stops.
    if (!wasFever && this.s.feverActive) this.recallTeam();

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

    // A meaningful chain briefly freezes the Tide and recalls one piggy.
    if (this.tideCfg.enabled) s.tideFreezeMs = Math.max(s.tideFreezeMs, this.tideCfg.chainFreezeMs);
    if (cleared.length >= CHAIN_RECALL_MIN) this.recallOne();

    const wasFever = s.feverActive;
    if (!s.feverActive) {
      s.fever = Math.min(100, s.fever + cleared.length * 5 * stage);
      if (s.fever >= 100) {
        s.feverActive = true;
        s.feverMsLeft = FEVER_MS;
      }
    }
    if (!wasFever && s.feverActive) this.recallTeam();

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
    const base = Math.round(this.s.score / 25) + this.stars() * 20 + this.s.bestCombo * 2;
    // Relaxed Mode trades the Tide's tension for a reduced coin payout.
    return this.relaxed ? Math.round(base * 0.6) : base;
  }

  /** Whether this run earns reduced (Relaxed) rewards, surfaced to the UI. */
  isRelaxed(): boolean {
    return this.relaxed;
  }
}
