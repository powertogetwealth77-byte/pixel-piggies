import type { GameSnapshot } from '../../engine/types';
import { BLOCK_COLORS } from '../../data/palette';
import { PIGGIES } from '../../data/piggies';
import { PiggyAvatar } from '../ui/PiggyAvatar';

interface Props {
  snap: GameSnapshot;
  mood?: 'idle' | 'sad' | 'happy' | 'wow';
  onSelect: (slot: number) => void;
}

export function Pens({ snap, mood = 'idle', onSelect }: Props) {
  const { pens, queue, selectedPen, closeCall, feverActive, prismUsed, penRecharge } = snap;
  const filled = pens.filter(Boolean).length;
  const selected = selectedPen != null ? pens[selectedPen] : null;

  return (
    <div className="tray">
      <div className="tray-label">
        <span>HOLDING PENS {filled}/{pens.length}</span>
        <span>NEXT UP →</span>
      </div>
      <div className="pens">
        {pens.map((p, slot) => {
          const isPrismLocked = p?.type === 'prism' && prismUsed;
          return (
            <div
              key={slot}
              className={`pen ${p ? 'filled' : ''} ${selectedPen === slot ? 'selected' : ''} ${
                closeCall && p ? 'danger' : ''
              } ${feverActive && p ? 'glow' : ''}`}
              onClick={() => p && !isPrismLocked && onSelect(slot)}
              role={p ? 'button' : undefined}
              aria-label={p ? `${PIGGIES[p.type].name} piggy` : 'Empty pen'}
            >
              {p ? (
                <>
                  <PiggyAvatar
                    type={p.type}
                    color={p.color}
                    size={46}
                    expression={selectedPen === slot ? 'launch' : mood}
                    pose={selectedPen === slot ? 'anticipate' : 'breathe'}
                    glow={feverActive || selectedPen === slot}
                  />
                  {p.maxAmmo > 1 && <span className="ammo">×{p.ammo}</span>}
                </>
              ) : (
                penRecharge[slot] >= 0 && <RechargeRing progress={penRecharge[slot]} />
              )}
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="pen-tag">
          {PIGGIES[selected.type].name} · {PIGGIES[selected.type].power}
        </div>
      )}

      <div className="queue" aria-hidden="true">
        {queue.length === 0 ? (
          <span style={{ fontSize: '0.72rem', opacity: 0.6 }}>Last piggies — finish strong!</span>
        ) : (
          queue.slice(0, 8).map((p) => (
            <span
              key={p.id}
              className="queue-chip"
              style={{ background: BLOCK_COLORS[p.color].base }}
              title={PIGGIES[p.type].name}
            />
          ))
        )}
      </div>
    </div>
  );
}

/** Animated recharge ring shown on an empty pen while a piggy is on cooldown. */
function RechargeRing({ progress }: { progress: number }) {
  const r = 17;
  const circ = 2 * Math.PI * r;
  const dash = circ * Math.max(0, Math.min(1, progress));
  return (
    <svg className="recharge-ring" viewBox="0 0 40 40" aria-label="Piggy recharging">
      <circle cx="20" cy="20" r={r} className="recharge-track" />
      <circle
        cx="20"
        cy="20"
        r={r}
        className="recharge-progress"
        strokeDasharray={`${dash} ${circ}`}
        transform="rotate(-90 20 20)"
      />
      <text x="20" y="25" className="recharge-glyph">
        🐷
      </text>
    </svg>
  );
}
