import { useEffect, useState } from 'react';
import { audio } from '../../audio/audio';
import { telemetry } from '../../telemetry/telemetry';
import { SANCTUARY, SANCTUARY_COUNT, type CaptivePig } from '../../data/sanctuary';
import { sanctuaryTier } from '../../data/story';
import { canAffordPig, freePig, freedPigCount, type SaveData } from '../../save/save';
import { PiggyAvatar } from '../ui/PiggyAvatar';

interface Props {
  save: SaveData;
  onBack: () => void;
  onUpdate: (s: SaveData) => void;
  onToast: (msg: string) => void;
}

/**
 * The Rescue Sanctuary — spend coins & Rescue Tokens to set captive piggies
 * free. Freed piggies join a happy wandering herd; there's always a next
 * piggy in reach, so the game keeps going long after the last level.
 */
export function SanctuaryScreen({ save, onBack, onUpdate, onToast }: Props) {
  const [celebrating, setCelebrating] = useState<CaptivePig | null>(null);
  const freed = freedPigCount(save);
  const tier = sanctuaryTier(freed);

  useEffect(() => {
    telemetry.sanctuaryVisit();
  }, []);

  const freedPigs = SANCTUARY.filter((p) => save.freedPigs[p.id]);

  const rescue = (pig: CaptivePig) => {
    const next = freePig(save, pig);
    if (!next) {
      const need = pig.cost.tokens != null ? `${pig.cost.tokens} tokens` : `${pig.cost.coins} coins`;
      onToast(`Need ${need} to free ${pig.name}`);
      audio.fizzle();
      return;
    }
    onUpdate(next);
    telemetry.pigFreed();
    audio.star();
    audio.squeal();
    if (pig.story) window.setTimeout(() => audio.storyChime(), 500); // memory beat
    setCelebrating(pig);
    window.setTimeout(() => setCelebrating((c) => (c === pig ? null : c)), 1700);
  };

  return (
    <div className="screen">
      <div className="row row--between">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h2 style={{ margin: 0 }}>Rescue Sanctuary</h2>
        <span style={{ width: 48 }} />
      </div>

      <div className="row" style={{ justifyContent: 'center', gap: 12 }}>
        <span className="pill">🐷 {freed}/{SANCTUARY_COUNT} freed</span>
        <span className="pill">🪙 {save.coins.toLocaleString()}</span>
        <span className="pill">🎟️ {save.rescueTokens}</span>
      </div>

      {/* Restoration narration — grows as the herd comes home. */}
      <div className="restore-banner">
        <b>🌳 {tier.title}</b>
        <p>{tier.line}</p>
      </div>

      {/* Happy meadow of freed piggies */}
      <div className="sanctuary-meadow">
        {freedPigs.length === 0 ? (
          <p className="meadow-empty">No piggies freed yet — rescue your first one below! 🐷</p>
        ) : (
          freedPigs.map((p, i) => (
            <div
              key={p.id}
              className="meadow-pig"
              style={{ animationDelay: `${(i % 8) * 0.2}s` }}
              title={p.name}
            >
              <PiggyAvatar type={p.type} color={p.color} size={40} expression="happy" pose="dance" />
            </div>
          ))
        )}
      </div>

      <div className="card" style={{ textAlign: 'center', fontWeight: 800, fontSize: '0.9rem' }}>
        {freed < SANCTUARY_COUNT
          ? '💛 Play levels & the daily to earn coins and tokens — then free more piggies!'
          : '🎉 You freed every piggy in the Sanctuary! You are a true Piggy Hero.'}
      </div>

      {/* Captive piggies to rescue */}
      <div className="captive-grid">
        {SANCTUARY.map((pig) => {
          const isFreed = !!save.freedPigs[pig.id];
          const afford = canAffordPig(save, pig);
          const token = pig.cost.tokens != null;
          return (
            <div key={pig.id} className={`captive ${isFreed ? 'freed' : ''} ${token ? 'golden' : ''}`}>
              <div className="captive-avatar">
                <PiggyAvatar
                  type={pig.type}
                  color={pig.color}
                  size={52}
                  expression={isFreed ? 'happy' : 'sad'}
                  pose={isFreed ? 'breathe' : 'none'}
                />
                {!isFreed && (
                  <svg className="captive-bars" viewBox="0 0 100 100" aria-hidden="true">
                    {[20, 40, 60, 80].map((x) => (
                      <rect key={x} x={x - 2.5} y="6" width="5" height="88" rx="2.5" fill="#7c8a9c" />
                    ))}
                  </svg>
                )}
              </div>
              <b>{pig.name}</b>
              {isFreed ? (
                <span className="captive-done">💚 Free!</span>
              ) : (
                <button
                  className={`btn ${token ? 'btn--primary' : 'btn--mint'}`}
                  style={{ padding: '7px 10px', minHeight: 36, fontSize: '0.78rem', width: '100%' }}
                  disabled={!afford}
                  onClick={() => rescue(pig)}
                >
                  {token ? `🎟️ ${pig.cost.tokens}` : `🪙 ${pig.cost.coins}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Free celebration */}
      {celebrating && (
        <div className="overlay" onClick={() => setCelebrating(null)}>
          <div className="dialog">
            <div className="dialog-piggy">
              <PiggyAvatar
                type={celebrating.type}
                color={celebrating.color}
                size={96}
                expression="happy"
                pose="dance"
                glow
              />
            </div>
            <h2>{celebrating.name} is free! 🎉</h2>
            <p style={{ fontWeight: 700, margin: 0, opacity: 0.9 }}>{celebrating.blurb}</p>
            {celebrating.story && <p className="rescue-memory">💛 {celebrating.story}</p>}
            <p style={{ margin: 0, opacity: 0.75, fontSize: '0.85rem' }}>
              {freed}/{SANCTUARY_COUNT} piggies rescued
            </p>
            <button className="btn btn--primary btn--block" onClick={() => setCelebrating(null)}>
              Yay!
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
