import { useEffect, useRef, useState } from 'react';
import { audio } from '../../audio/audio';
import { telemetry } from '../../telemetry/telemetry';
import type { SanctuaryTier } from '../../data/story';
import { HeartTree } from './HeartTree';

interface Props {
  tier: SanctuaryTier;
  /** True when replayed from Restoration Memories (doesn't re-log "reached"). */
  replay?: boolean;
  onDone: () => void;
}

const AUTO_MS = 3600; // returns control in under four seconds

/**
 * A one-time restoration reveal: the scene dims, the Heart Tree at its new tier
 * blooms in with a warm flourish, the tier title + narration appear, petals
 * drift, and control returns in under 4s. Fully skippable.
 */
export function RestorationReveal({ tier, replay, onDone }: Props) {
  const [shown, setShown] = useState(false);
  const done = useRef(false);

  const finish = (skipped: boolean) => {
    if (done.current) return;
    done.current = true;
    telemetry.log(skipped ? 'sanctuary_reveal_skipped' : 'sanctuary_reveal_viewed');
    onDone();
  };

  useEffect(() => {
    if (!replay) telemetry.log('sanctuary_tier_reached');
    audio.resume();
    audio.restoreFlourish();
    const t1 = window.setTimeout(() => setShown(true), 260); // brief dim, then focus
    const t2 = window.setTimeout(() => finish(false), AUTO_MS);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="overlay reveal-overlay"
      onClick={() => finish(true)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') finish(true); }}
      aria-label={`${tier.title} — tap to continue`}
    >
      <div className={`reveal-card ${shown ? 'in' : ''}`} onClick={(e) => e.stopPropagation()}>
        <div className="reveal-petals" aria-hidden="true">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} style={{ left: `${5 + i * 9}%`, animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
        <div className="reveal-tree">
          <HeartTree tier={tier.n} size={168} />
        </div>
        <span className="reveal-eyebrow">Restoration · Tier {tier.n}</span>
        <h2>{tier.title}</h2>
        <p className="reveal-line">{tier.line}</p>
        <button className="btn btn--primary btn--block" onClick={() => finish(true)}>
          {replay ? 'Close' : 'Continue'}
        </button>
        <button className="reveal-skip" onClick={() => finish(true)}>Skip ›</button>
      </div>
    </div>
  );
}
