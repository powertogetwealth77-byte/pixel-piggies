import { useEffect, useRef, useState } from 'react';
import type { GameSnapshot, PiggyType, ColorId } from '../../engine/types';
import { BLOCK_COLORS, PICTURE_CHAR } from '../../data/palette';
import { PiggyAvatar } from '../ui/PiggyAvatar';

interface Props {
  snap: GameSnapshot;
  onLaunch: (lane: number) => void;
  launchColor: ColorId;
  launchType: PiggyType;
}

interface Floater {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
}
interface Particle {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  color: string;
}
interface Flyer {
  id: number;
  lane: number;
  color: ColorId;
  type: PiggyType;
}

let fx = 1;

export function Board({ snap, onLaunch, launchColor, launchType }: Props) {
  const { board, revealed, width, height, level, feverActive, selectedPen } = snap;
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [flyer, setFlyer] = useState<Flyer | null>(null);
  const [clearing, setClearing] = useState<Set<string>>(new Set());
  const lastId = useRef<number>(-1);

  // React to the latest launch by spawning juice.
  useEffect(() => {
    const l = snap.lastLaunch;
    if (!l || l.id === lastId.current) return;
    lastId.current = l.id;

    setFlyer({ id: l.id, lane: l.lane, color: launchColor, type: launchType });
    window.setTimeout(() => setFlyer((f) => (f && f.id === l.id ? null : f)), 340);

    if (l.fizzle || l.cleared.length === 0) return;

    // Cell-burst markers.
    const keys = new Set(l.cleared.map((c) => `${c.row},${c.col}`));
    setClearing(keys);
    window.setTimeout(() => setClearing(new Set()), 300);

    // Particles from each cleared cell.
    const newParticles: Particle[] = [];
    for (const c of l.cleared.slice(0, 26)) {
      const cx = ((c.col + 0.5) / width) * 100;
      const cy = ((c.row + 0.5) / height) * 100;
      const n = 2;
      for (let i = 0; i < n; i++) {
        newParticles.push({
          id: fx++,
          x: cx,
          y: cy,
          dx: (Math.random() - 0.5) * 90,
          dy: (Math.random() - 0.7) * 90,
          color: BLOCK_COLORS[c.color].base,
        });
      }
    }
    setParticles((p) => [...p, ...newParticles]);
    window.setTimeout(() => {
      const ids = new Set(newParticles.map((p) => p.id));
      setParticles((p) => p.filter((x) => !ids.has(x.id)));
    }, 600);

    // Floating score / combo number near the impact lane.
    const laneCenter = ((l.lane + 0.5) / 3) * 100;
    const big = l.cleared.length >= 5 || l.comboAfter >= 8;
    const fl: Floater = {
      id: fx++,
      x: laneCenter,
      y: 45,
      text: `+${l.gained}${l.multiplier > 1 ? ` x${l.multiplier}` : ''}`,
      color: big ? '#ffc83d' : '#fff',
      size: big ? 1.5 : 1.1,
    };
    setFloaters((f) => [...f, fl]);
    if (l.comboAfter >= 4) {
      setFloaters((f) => [
        ...f,
        { id: fx++, x: laneCenter, y: 30, text: `Combo ${l.comboAfter}!`, color: '#ff96a5', size: 1.2 },
      ]);
    }
    window.setTimeout(() => {
      setFloaters((f) => f.filter((x) => x.id !== fl.id && x.text !== `Combo ${l.comboAfter}!`));
    }, 900);
  }, [snap.lastLaunch, width, height, launchColor, launchType]);

  return (
    <div className="board-area">
      <div
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
                    className={`block ${clearing.has(key) ? 'clearing' : ''}`}
                    style={{ background: BLOCK_COLORS[cell.color].base }}
                  />
                )}
              </div>
            );
          }),
        )}

        {/* Lane guides */}
        <div className="lane-guides">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`lane-guide ${selectedPen != null ? 'armed' : ''}`} />
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

        {/* Flyer */}
        {flyer && (
          <div
            className="flyer"
            style={{ left: `${((flyer.lane + 0.5) / 3) * 100}%`, bottom: 0, transform: 'translateX(-50%)' }}
          >
            <PiggyAvatar type={flyer.type} color={flyer.color} size={44} expression="launch" glow={feverActive} />
          </div>
        )}

        {/* Particles */}
        {particles.map((p) => (
          <div
            key={p.id}
            className="particle"
            style={
              {
                left: `${p.x}%`,
                top: `${p.y}%`,
                background: p.color,
                '--dx': `${p.dx}px`,
                '--dy': `${p.dy}px`,
              } as React.CSSProperties
            }
          />
        ))}

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
