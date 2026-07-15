import type { GameSnapshot } from '../../engine/types';
import { BLOCK_COLORS } from '../../data/palette';
import { PIGGIES } from '../../data/piggies';
import { PiggyAvatar } from '../ui/PiggyAvatar';

interface Props {
  snap: GameSnapshot;
  onSelect: (slot: number) => void;
}

export function Pens({ snap, onSelect }: Props) {
  const { pens, queue, selectedPen, closeCall, feverActive, prismUsed } = snap;
  const filled = pens.filter(Boolean).length;

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
              {p && (
                <>
                  <PiggyAvatar
                    type={p.type}
                    color={p.color}
                    size={44}
                    expression={selectedPen === slot ? 'happy' : 'idle'}
                    glow={feverActive || selectedPen === slot}
                  />
                  {p.maxAmmo > 1 && <span className="ammo">×{p.ammo}</span>}
                </>
              )}
            </div>
          );
        })}
      </div>

      <div className="queue">
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
