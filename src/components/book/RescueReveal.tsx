import { useEffect, useRef, useState } from 'react';
import { audio } from '../../audio/audio';
import { telemetry } from '../../telemetry/telemetry';
import { RARITY_META, type PigCharacter } from '../../data/sanctuary';
import { PigPortrait } from './PigPortrait';

interface Props {
  pig: PigCharacter;
  /** Freed / total, shown as the collection updates. */
  rescued: number;
  total: number;
  onDone: () => void;
  onOpenBook: () => void;
}

/**
 * The character rescue reveal: the cage bursts, the pig steps forward, its name
 * and rarity appear, its voice line plays, the character card opens with the
 * Sanctuary role, and the collection ticks up. Longer/flashier for rarer pigs,
 * but always skippable once the name is showing, and quiet + still when the
 * player has muted audio or asked for reduced motion.
 */
export function RescueReveal({ pig, rescued, total, onDone, onOpenBook }: Props) {
  const meta = RARITY_META[pig.rarity];
  const reduced =
    typeof document !== 'undefined' && document.body.classList.contains('reduced-motion');
  // Reduced motion → skip straight to the full card.
  const [stage, setStage] = useState(reduced ? 2 : 0); // 0 cage · 1 name+rarity · 2 full card
  const done = useRef(false);

  const finish = (skipped: boolean) => {
    if (done.current) return;
    done.current = true;
    telemetry.log(skipped ? 'pig_reveal_skipped' : 'pig_rescue_completed');
    onDone();
  };

  useEffect(() => {
    audio.resume();
    if (reduced) return;
    // Pace the stages by rarity; the whole thing fits inside meta.revealMs.
    const toName = Math.min(700, meta.revealMs * 0.25);
    const toCard = meta.revealMs * 0.55;
    audio.pop(12, true); // cage burst
    const t1 = window.setTimeout(() => { setStage(1); audio.star(); }, toName);
    const t2 = window.setTimeout(() => {
      setStage(2);
      if (meta.rank >= 3) audio.chestOpen(); else audio.win();
    }, toCard);
    return () => { window.clearTimeout(t1); window.clearTimeout(t2); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canSkip = stage >= 1;

  return (
    <div className="overlay reveal-overlay" onClick={() => canSkip && finish(true)}>
      <div
        className={`dialog reveal-dialog rarity-${pig.rarity} rank-${meta.rank}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Rarity particles for flashier reveals */}
        {!reduced && meta.rank >= 2 && (
          <div className="reveal-sparks" aria-hidden="true">
            {Array.from({ length: Math.min(meta.particles, 22) }).map((_, i) => (
              <span key={i} style={{ left: `${(i * 37) % 100}%`, animationDelay: `${(i % 6) * 0.12}s` }} />
            ))}
          </div>
        )}

        <div className="reveal-portrait">
          <PigPortrait pig={pig} size={stage >= 1 ? 108 : 84} state="rescued" glow={stage >= 1} />
          {stage < 1 && (
            <svg className="rescue-cage" viewBox="0 0 100 100" aria-hidden="true">
              <rect x="8" y="4" width="84" height="10" rx="5" fill="#5d6b7d" />
              <rect x="8" y="86" width="84" height="10" rx="5" fill="#5d6b7d" />
              {[16, 33, 50, 67, 84].map((x) => (
                <rect key={x} x={x - 3} y="8" width="6" height="84" rx="3" fill="#7c8a9c" />
              ))}
            </svg>
          )}
        </div>

        {stage >= 1 && (
          <>
            <span className={`rarity-tag rarity-${pig.rarity}`}>{meta.label}</span>
            <h2 className="reveal-name">{pig.name}</h2>
            <p className="reveal-title">{pig.title}</p>
          </>
        )}

        {stage >= 2 && (
          <>
            <p className="reveal-voice">“{pig.rescueLine}”</p>
            <div className="reveal-role">
              <span>🏡 {pig.role}</span>
              <span>📍 {pig.sanctuaryLocation}</span>
            </div>
            <p className="reveal-progress">🐷 {rescued}/{total} rescued</p>
            <div className="row" style={{ gap: 8, width: '100%' }}>
              <button className="btn btn--ghost btn--block" onClick={() => { onOpenBook(); }}>
                📖 Piggy Book
              </button>
              <button className="btn btn--primary btn--block" onClick={() => finish(false)}>
                Continue
              </button>
            </div>
          </>
        )}

        {canSkip && stage < 2 && (
          <button className="reveal-skip" onClick={() => finish(true)}>Skip ›</button>
        )}
      </div>
    </div>
  );
}
