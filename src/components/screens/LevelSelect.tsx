import { useEffect } from 'react';
import { LEVELS } from '../../data/levels';
import { WORLDS, worldStats, LEVEL_TITLE, type WorldDef } from '../../data/worlds';
import { CHAPTER_OF } from '../../data/story';
import { claimWorldChest, type SaveData } from '../../save/save';
import { todayKey, DAILY_PIGMENT } from '../../daily/daily';
import { audio } from '../../audio/audio';
import { telemetry } from '../../telemetry/telemetry';
import { Stars } from '../ui/Stars';

interface Props {
  save: SaveData;
  onBack: () => void;
  onKingdom: () => void;
  onSanctuary: () => void;
  onSelect: (id: number) => void;
  onDaily: () => void;
  onUpdate: (s: SaveData) => void;
  onToast: (msg: string) => void;
}

const RESCUE_LEVELS = new Set(LEVELS.filter((l) => l.rescue).map((l) => l.id));

export function LevelSelect({ save, onBack, onKingdom, onSanctuary, onSelect, onDaily, onUpdate, onToast }: Props) {
  const unlocked = save.unlockedLevel;
  const dailyDone = save.dailyDone === todayKey();

  useEffect(() => {
    telemetry.log('world_viewed');
  }, []);

  const select = (id: number) => {
    telemetry.log('level_selected');
    onSelect(id);
  };

  const claimChest = (world: WorldDef) => {
    const next = claimWorldChest(save, world);
    if (!next) return;
    onUpdate(next);
    telemetry.log('world_chest_claimed');
    audio.chestOpen();
    onToast(`Chest! 🪙 ${world.chest.coins} + 🎟️ ${world.chest.tokens}`);
  };

  return (
    <div className="screen">
      <div className="row row--between">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h2 style={{ margin: 0 }}>Adventure Map</h2>
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

      <div className="world-map">
        {WORLDS.map((world) => {
          const st = worldStats(save, world);
          const chapter = CHAPTER_OF(world.index);
          // A world is reachable once its first level is unlocked.
          const worldLocked = world.first > unlocked;
          return (
            <section key={world.index} className={`world world--${world.theme} ${worldLocked ? 'world--locked' : ''}`}>
              <div className="world-head">
                <div className="world-title">
                  {chapter && <span className="chapter-eyebrow">Chapter {chapter.n} · {chapter.title}</span>}
                  <h3>{world.name}</h3>
                  <small>{worldLocked ? 'Complete the previous world to unlock' : world.subtitle}</small>
                </div>
                <span className="world-stars">⭐ {st.stars}/{st.maxStars}</span>
              </div>

              {chapter && !worldLocked && <p className="chapter-beat">{chapter.beat}</p>}

              <div className="world-progress">
                <div className="world-progress-fill" style={{ width: `${(st.cleared / st.total) * 100}%` }} />
              </div>

              <div className="world-nodes">
                {Array.from({ length: st.total }).map((_, i) => {
                  const id = world.first + i;
                  const prog = save.levels[id];
                  const locked = id > unlocked;
                  const cleared = !!prog?.cleared;
                  const perfect = (prog?.stars ?? 0) >= 3;
                  const isCurrent = id === unlocked && !cleared;
                  const cls = locked
                    ? 'locked'
                    : perfect
                    ? 'perfect'
                    : cleared
                    ? 'done'
                    : 'open';
                  return (
                    <div className="node-wrap" key={id}>
                      {i > 0 && <span className={`node-link ${id <= unlocked ? 'lit' : ''}`} />}
                      <button
                        className={`node node--${cls} ${isCurrent ? 'node--current' : ''} ${RESCUE_LEVELS.has(id) ? 'node--rescue' : ''}`}
                        disabled={locked}
                        onClick={() => !locked && select(id)}
                        title={LEVEL_TITLE(id)}
                        aria-label={`Level ${id}: ${LEVEL_TITLE(id)}${locked ? ' (locked)' : ''}`}
                      >
                        {locked ? <span className="lock">🔒</span> : <span className="node-num">{id}</span>}
                        {!locked && <Stars value={prog?.stars ?? 0} size={9} />}
                        {isCurrent && <span className="node-here">▲</span>}
                      </button>
                    </div>
                  );
                })}

                {/* World reward chest */}
                <div className="node-wrap">
                  <span className={`node-link ${st.complete ? 'lit' : ''}`} />
                  <button
                    className={`chest ${st.chestClaimed ? 'chest--claimed' : st.chestReady ? 'chest--ready' : 'chest--locked'}`}
                    disabled={!st.chestReady}
                    onClick={() => st.chestReady && claimChest(world)}
                    aria-label={`World reward chest: ${world.chest.coins} coins and ${world.chest.tokens} tokens`}
                  >
                    <span className="chest-icon">{st.chestClaimed ? '✅' : '🎁'}</span>
                    <small>
                      🪙{world.chest.coins}
                      <br />🎟️{world.chest.tokens}
                    </small>
                  </button>
                </div>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
