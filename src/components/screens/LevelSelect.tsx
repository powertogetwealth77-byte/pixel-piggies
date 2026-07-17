import { LEVELS } from '../../data/levels';
import { PIGGIES } from '../../data/piggies';
import type { SaveData } from '../../save/save';
import { todayKey, DAILY_PIGMENT } from '../../daily/daily';
import { Stars } from '../ui/Stars';

interface Props {
  save: SaveData;
  onBack: () => void;
  onKingdom: () => void;
  onSanctuary: () => void;
  onSelect: (id: number) => void;
  onDaily: () => void;
}

export function LevelSelect({ save, onBack, onKingdom, onSanctuary, onSelect, onDaily }: Props) {
  const nextLocked = save.unlockedLevel;
  const goal = nextGoal(save);
  const dailyDone = save.dailyDone === todayKey();

  return (
    <div className="screen">
      <div className="row row--between">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h2 style={{ margin: 0 }}>Select Level</h2>
        <div className="row" style={{ gap: 6 }}>
          <button className="icon-btn" onClick={onSanctuary} aria-label="Rescue Sanctuary">
            🐷
          </button>
          <button className="icon-btn" onClick={onKingdom} aria-label="Kingdom">
            🏰
          </button>
        </div>
      </div>

      <button
        className={`daily-card ${dailyDone ? 'done' : ''}`}
        onClick={dailyDone ? undefined : onDaily}
        disabled={dailyDone}
      >
        <span className="daily-icon">{dailyDone ? '✅' : '🎁'}</span>
        <span className="daily-text">
          <b>Daily Bonus</b>
          <small>
            {dailyDone
              ? 'Done for today — a new board arrives tomorrow!'
              : `One fresh board · earn ${DAILY_PIGMENT} Pigment`}
          </small>
        </span>
        {!dailyDone && <span className="daily-go">Play ›</span>}
      </button>

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
                  {lvl.rescue && (
                    <small>{save.rescued[lvl.rescue] ? '💚' : 'RESCUE'}</small>
                  )}
                  {!lvl.rescue && prog?.bestScore ? (
                    <small className="tile-best">🏆 {prog.bestScore.toLocaleString()}</small>
                  ) : null}
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
  // The nearest hero still waiting in a cage drives the goal line.
  const nextRescue = LEVELS.find((l) => l.rescue && !save.rescued[l.rescue]);
  if (nextRescue && nextRescue.rescue) {
    const toGo = Math.max(0, nextRescue.id - (save.unlockedLevel - 1));
    const name = PIGGIES[nextRescue.rescue].name;
    return toGo > 0
      ? `Reach Level ${nextRescue.id} to rescue ${name}! (${toGo} to go)`
      : `Rescue ${name} in Level ${nextRescue.id}!`;
  }
  if (save.kingdom.house < 100) return 'Earn Pigment to repair the Piggy House!';
  if (save.kingdom.bakery < 100) return 'Restore the Bakery for the Kingdom!';
  if (save.kingdom.fountain < 100) return 'Make the Fountain sparkle again!';
  const next = LEVELS.find((l) => l.id === save.unlockedLevel);
  return next ? `Next: ${next.name} — ${next.tagline}` : 'You have restored the whole Kingdom!';
}
