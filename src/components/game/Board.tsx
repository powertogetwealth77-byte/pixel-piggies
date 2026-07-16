import { useEffect, useRef, useState } from 'react';
import type { GameSnapshot, PiggyType, ColorId } from '../../engine/types';
import { BLOCK_COLORS, PICTURE_CHAR, COLOR_SYMBOLS } from '../../data/palette';
import { PiggyAvatar } from '../ui/PiggyAvatar';
import { FxEngine, type FxMode } from '../../fx/fx';

interface Props {
  snap: GameSnapshot;
  onLaunch: (lane: number) => void;
  launchColor: ColorId;
  launchType: PiggyType;
  fxMode: FxMode;
}

interface Floater {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
}
interface Flyer {
  id: number;
  lane: number;
  color: ColorId;
  type: PiggyType;
}

let fxId = 1;
const CONFETTI_COLORS = ['#ff6478', '#ffc83d', '#57d99a', '#4bb8f0', '#9d7bff', '#fff7ef'];

export function Board({ snap, onLaunch, launchColor, launchType, fxMode }: Props) {
  const { board, revealed, width, height, level, feverActive, selectedPen } = snap;
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [flyer, setFlyer] = useState<Flyer | null>(null);
  const lastLaunchId = useRef(-1);
  const lastChainId = useRef(-1);
  const wonRef = useRef(false);

  const boardRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fxRef = useRef<FxEngine | null>(null);
  if (!fxRef.current) fxRef.current = new FxEngine();
  const fx = fxRef.current;
  fx.mode = fxMode;

  const snapRef = useRef(snap);
  snapRef.current = snap;

  /** Center of a board cell in canvas (CSS pixel) coordinates. */
  const cellCenter = (row: number, col: number) => {
    const el = boardRef.current;
    if (!el) return { x: 0, y: 0, cell: 24 };
    const w = el.clientWidth;
    const h = el.clientHeight;
    const pad = 8;
    const innerW = w - pad * 2;
    const innerH = h - pad * 2;
    return {
      x: pad + ((col + 0.5) / width) * innerW,
      y: pad + ((row + 0.5) / height) * innerH,
      cell: innerW / width,
    };
  };

  const pushFloater = (f: Omit<Floater, 'id'>, ttl = 900) => {
    const id = fxId++;
    setFloaters((prev) => [...prev, { ...f, id }]);
    window.setTimeout(() => setFloaters((prev) => prev.filter((x) => x.id !== id)), ttl);
  };

  // Canvas render loop: DPR-aware sizing, particle update/draw, fever ambience.
  useEffect(() => {
    const canvas = canvasRef.current;
    const el = boardRef.current;
    if (!canvas || !el) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = el.clientWidth * dpr;
      canvas.height = el.clientHeight * dpr;
      canvas.style.width = `${el.clientWidth}px`;
      canvas.style.height = `${el.clientHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dtMs = Math.min(64, now - last);
      last = now;
      const engine = fxRef.current!;
      engine.noteFrame(dtMs);
      const dt = dtMs / 1000;
      const s = snapRef.current;
      if (s.feverActive) {
        engine.feverTick(el.clientWidth, el.clientHeight, CONFETTI_COLORS);
      }
      engine.update(dt);
      ctx.clearRect(0, 0, el.clientWidth, el.clientHeight);
      engine.draw(ctx);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  // Launch effects: flyer, trail, shards, impact ring, score floater.
  useEffect(() => {
    const l = snap.lastLaunch;
    if (!l || l.id === lastLaunchId.current) return;
    lastLaunchId.current = l.id;

    setFlyer({ id: l.id, lane: l.lane, color: launchColor, type: launchType });
    window.setTimeout(() => setFlyer((f) => (f && f.id === l.id ? null : f)), 380);

    const el = boardRef.current;
    if (el) {
      // Trail up the lane.
      const laneX = ((l.lane + 0.5) / 3) * el.clientWidth;
      for (let i = 0; i < 8; i++) {
        fx.trail(laneX, el.clientHeight - (i / 8) * el.clientHeight * 0.8, BLOCK_COLORS[launchColor].base);
      }
    }

    if (l.fizzle || l.cleared.length === 0) return;

    // Shards from every cleared cell (capped) + ring at the deepest impact.
    let impactCell = l.cleared[0];
    for (const c of l.cleared) if (c.row > impactCell.row) impactCell = c;
    const imp = cellCenter(impactCell.row, impactCell.col);
    fx.ring(imp.x, imp.y, BLOCK_COLORS[impactCell.color].light, l.cleared.length >= 6);
    for (const c of l.cleared.slice(0, 30)) {
      const p = cellCenter(c.row, c.col);
      fx.burst(p.x, p.y, BLOCK_COLORS[c.color].base, p.cell, l.fever ? 1.4 : 1);
    }

    const laneCenter = ((l.lane + 0.5) / 3) * 100;
    const big = l.cleared.length >= 5 || l.comboAfter >= 8;
    pushFloater({
      x: laneCenter,
      y: 45,
      text: `+${l.gained}${l.multiplier > 1 ? ` x${l.multiplier}` : ''}`,
      color: big ? '#ffc83d' : '#fff',
      size: big ? 1.5 : 1.1,
    });
    if (l.comboAfter >= 4) {
      pushFloater({ x: laneCenter, y: 30, text: `Combo ${l.comboAfter}!`, color: '#ff96a5', size: 1.2 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.lastLaunch, launchColor, launchType]);

  // Cascade chain effects: heavier shards, big ring, CHAIN banner floater.
  useEffect(() => {
    const ch = snap.lastChain;
    if (!ch || ch.id === lastChainId.current) return;
    lastChainId.current = ch.id;

    let mid = ch.cleared[0];
    for (const c of ch.cleared) if (c.row < mid.row) mid = c;
    const p0 = cellCenter(mid.row, mid.col);
    fx.ring(p0.x, p0.y, '#ffffff', true);
    for (const c of ch.cleared.slice(0, 30)) {
      const p = cellCenter(c.row, c.col);
      fx.burst(p.x, p.y, BLOCK_COLORS[c.color].base, p.cell, 1.2 + ch.stage * 0.3);
    }
    pushFloater(
      {
        x: ((mid.col + 0.5) / width) * 100,
        y: Math.max(12, ((mid.row + 0.5) / height) * 100 - 8),
        text: `CHAIN ×${ch.stage}!`,
        color: '#ffe08a',
        size: 1.3 + Math.min(ch.stage, 5) * 0.12,
      },
      1100,
    );
    pushFloater({
      x: ((mid.col + 0.5) / width) * 100,
      y: Math.min(88, ((mid.row + 0.5) / height) * 100 + 10),
      text: `+${ch.gained}`,
      color: '#fff',
      size: 1.15,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.lastChain, width, height]);

  // Victory confetti.
  useEffect(() => {
    if (snap.phase === 'won' && !wonRef.current) {
      wonRef.current = true;
      const el = boardRef.current;
      if (el) {
        fx.confetti(el.clientWidth, CONFETTI_COLORS);
        window.setTimeout(() => fx.confetti(el.clientWidth, CONFETTI_COLORS), 500);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.phase]);

  return (
    <div className="board-area">
      <div
        ref={boardRef}
        className={`board ${feverActive ? 'fever' : ''}`}
        style={{ gridTemplateColumns: `repeat(${width}, 1fr)`, position: 'relative' }}
      >
        {board.flatMap((row, r) =>
          row.map((cell, c) => {
            const pch = level.picture[r]?.[c] ?? '.';
            const picColor = PICTURE_CHAR[pch] ?? 'transparent';
            const isRevealed = revealed[r][c] && picColor !== 'transparent';
            const key = `${r},${c}`;
            return (
              <div className="cell" key={key}>
                <div
                  className={`pic-cell ${isRevealed ? 'shown' : ''}`}
                  style={{ background: picColor }}
                />
                {cell && (
                  <div
                    className={`block block--${cell.color}`}
                    style={{ background: BLOCK_COLORS[cell.color].base }}
                  >
                    <span className="block-symbol">{COLOR_SYMBOLS[cell.color]}</span>
                  </div>
                )}
              </div>
            );
          }),
        )}

        {/* Lane guides */}
        <div className="lane-guides">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`lane-guide ${snap.pens.some(Boolean) ? 'ready' : ''} ${
                selectedPen != null ? 'armed' : ''
              }`}
              style={{ color: BLOCK_COLORS[launchColor].base }}
            />
          ))}
        </div>

        {/* Lane tap areas */}
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="lane-hit"
            style={{ left: `calc(8px + ${i} * (100% - 16px) / 3)` }}
            onClick={() => onLaunch(i)}
            role="button"
            aria-label={`Launch into lane ${i + 1}`}
          />
        ))}

        {/* Effects canvas (shards, rings, trails, confetti) */}
        <canvas ref={canvasRef} className="fx-canvas" aria-hidden="true" />

        {/* Flyer */}
        {flyer && (
          <div
            className="flyer"
            style={{ left: `${((flyer.lane + 0.5) / 3) * 100}%`, bottom: 0, transform: 'translateX(-50%)' }}
          >
            <PiggyAvatar type={flyer.type} color={flyer.color} size={44} expression="launch" glow={feverActive} />
          </div>
        )}

        {/* Floaters */}
        {floaters.map((f) => (
          <div
            key={f.id}
            className="floater"
            style={{
              left: `${f.x}%`,
              top: `${f.y}%`,
              color: f.color,
              fontSize: `${f.size}rem`,
              transform: 'translateX(-50%)',
            }}
          >
            {f.text}
          </div>
        ))}
      </div>
    </div>
  );
}
