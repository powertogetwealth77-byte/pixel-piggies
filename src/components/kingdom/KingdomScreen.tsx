import { audio } from '../../audio/audio';
import { restore, type KingdomState, type SaveData } from '../../save/save';
import { PiggyAvatar } from '../ui/PiggyAvatar';

interface Props {
  save: SaveData;
  onBack: () => void;
  onUpdate: (s: SaveData) => void;
  onToast: (msg: string) => void;
}

interface Building {
  key: keyof KingdomState;
  name: string;
  emoji: string;
  cost: number;
  step: number;
  x: number;
}

const BUILDINGS: Building[] = [
  { key: 'house', name: 'Piggy House', emoji: '🏠', cost: 20, step: 25, x: 12 },
  { key: 'bakery', name: 'Bakery', emoji: '🧁', cost: 30, step: 25, x: 44 },
  { key: 'fountain', name: 'Fountain', emoji: '⛲', cost: 40, step: 25, x: 74 },
];

export function KingdomScreen({ save, onBack, onUpdate, onToast }: Props) {
  const doRestore = (b: Building) => {
    const next = restore(save, b.key, b.cost, b.step);
    if (!next) {
      onToast(save.kingdom[b.key] >= 100 ? 'Already fully restored!' : 'Not enough Pigment');
      audio.fizzle();
      return;
    }
    onUpdate(next);
    audio.coin();
    if (next.kingdom[b.key] >= 100) audio.star();
    onToast(`${b.name} +${b.step}%`);
  };

  const totalResto = Math.round(
    (save.kingdom.house + save.kingdom.bakery + save.kingdom.fountain) / 3,
  );

  return (
    <div className="screen">
      <div className="row row--between">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h2 style={{ margin: 0 }}>Piggy Kingdom</h2>
        <span className="pill">🎨 {save.pigment}</span>
      </div>

      <div className="kingdom-scene">
        {BUILDINGS.map((b) => {
          const v = save.kingdom[b.key];
          return (
            <div
              key={b.key}
              className={`build ${v < 100 ? 'broken' : ''}`}
              style={{ left: `${b.x}%`, fontSize: 54 }}
            >
              {b.emoji}
            </div>
          );
        })}
        <div style={{ position: 'absolute', right: 10, bottom: 10 }}>
          <PiggyAvatar type="mochi" color="sky" size={50} expression="happy" glow={save.mochiRescued} />
        </div>
        <div
          style={{
            position: 'absolute',
            top: 8,
            left: 12,
            fontWeight: 900,
            color: '#2b2144',
            fontSize: '0.9rem',
          }}
        >
          Restored: {totalResto}%
        </div>
      </div>

      <div className="card" style={{ textAlign: 'center' }}>
        {save.mochiRescued ? (
          <span style={{ fontWeight: 800 }}>🐷 Mochi is safe and helping rebuild!</span>
        ) : (
          <span style={{ fontWeight: 800 }}>
            🔒 Clear Level 5 to rescue Mochi the piggy!
          </span>
        )}
      </div>

      {BUILDINGS.map((b) => (
        <div className="card" key={b.key}>
          <div className="resto-item">
            <span style={{ fontSize: 30 }}>{b.emoji}</span>
            <div style={{ flex: 1 }}>
              <div className="row row--between" style={{ marginBottom: 6 }}>
                <b>{b.name}</b>
                <span style={{ opacity: 0.8 }}>{save.kingdom[b.key]}%</span>
              </div>
              <div className="resto-bar">
                <div style={{ width: `${save.kingdom[b.key]}%` }} />
              </div>
            </div>
            <button
              className="btn btn--mint"
              style={{ padding: '10px 14px', minHeight: 44 }}
              disabled={save.kingdom[b.key] >= 100 || save.pigment < b.cost}
              onClick={() => doRestore(b)}
            >
              🎨 {b.cost}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
