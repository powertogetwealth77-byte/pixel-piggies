import { LEVELS } from '../../data/levels';
import type { SaveData } from '../../save/save';
import { Stars } from '../ui/Stars';

interface Props {
  save: SaveData;
  onBack: () => void;
  onKingdom: () => void;
  onSelect: (id: number) => void;
}

export function LevelSelect({ save, onBack, onKingdom, onSelect }: Props) {
  const nextLocked = save.unlockedLevel;
  // Compute the current "reason to continue".
  const goal = nextGoal(save);

  return (
    <div className="screen">
      <div className="row row--between">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h2 style={{ margin: 0 }}>Select Level</h2>
        <button className="icon-btn" onClick={onKingdom} aria-label="Kingdom">
          🏰
        </button>
      </div>

      <div className="card" style={{ textAlign: 'center', fontWeight: 800 }}>
        🎯 {goal}
      </div>

      <div className="level-grid">
        {LEVELS.map((lvl) => {
          const prog = save.levels[lvl.id];
          const locked = lvl.id > nextLocked;
          return (
            <button
              key={lvl.id}
              className={`level-tile ${locked ? 'level-tile--locked' : ''} ${
                lvl.rescue ? 'level-tile--rescue' : ''
              }`}
              disabled={locked}
              onClick={() => !locked && onSelect(lvl.id)}
            >
              {locked ? (
                <span className="lock">🔒</span>
              ) : (
                <>
                  <span>{lvl.id}</span>
                  <Stars value={prog?.stars ?? 0} size={13} />
                  {lvl.rescue && <small>RESCUE</small>}
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function nextGoal(save: SaveData): string {
  if (!save.mochiRescued) {
    const toGo = Math.max(0, 5 - (save.unlockedLevel - 1));
    if (save.unlockedLevel <= 5) return `Reach Level 5 to rescue Mochi! (${toGo} to go)`;
  }
  if (save.kingdom.house < 100) return 'Earn Pigment to repair the Piggy House!';
  if (save.kingdom.bakery < 100) return 'Restore the Bakery for the Kingdom!';
  if (save.kingdom.fountain < 100) return 'Make the Fountain sparkle again!';
  const next = LEVELS.find((l) => l.id === save.unlockedLevel);
  return next ? `Next: ${next.name} — ${next.tagline}` : 'You have restored the whole Kingdom!';
}
