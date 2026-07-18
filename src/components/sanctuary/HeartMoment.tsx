import { useEffect, useRef, useState } from 'react';
import { audio } from '../../audio/audio';
import { telemetry } from '../../telemetry/telemetry';
import { PIG_BY_ID } from '../../data/sanctuary';
import type { HeartMoment as HeartMomentDef } from '../../data/life';
import { PigPortrait } from '../book/PigPortrait';

interface Props {
  moment: HeartMomentDef;
  replay?: boolean;
  onDone: () => void;
}

const AUTO_MS = 4500;

/**
 * A short emotional scene between rescued pigs: their portraits lean together,
 * a single line appears, hearts drift up, and control returns in a few seconds.
 * Skippable after the first second; quiet + still under mute / reduced-motion.
 */
export function HeartMoment({ moment, replay, onDone }: Props) {
  const [canSkip, setCanSkip] = useState(false);
  const done = useRef(false);
  const pigs = moment.pigs.map((id) => PIG_BY_ID[id]).filter(Boolean);

  const finish = (skipped: boolean) => {
    if (done.current) return;
    done.current = true;
    telemetry.log(skipped ? 'heart_moment_skipped' : 'heart_moment_replayed');
    onDone();
  };

  useEffect(() => {
    telemetry.log(replay ? 'heart_moment_replayed' : 'heart_moment_triggered');
    audio.resume();
    audio.storyChime();
    const s = window.setTimeout(() => setCanSkip(true), 1000);
    const t = window.setTimeout(() => finish(false), AUTO_MS);
    return () => { window.clearTimeout(s); window.clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="overlay heart-overlay" onClick={() => canSkip && finish(true)}>
      <div className="dialog heart-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="heart-drift" aria-hidden="true">
          {Array.from({ length: 6 }).map((_, i) => (
            <span key={i} style={{ left: `${12 + i * 14}%`, animationDelay: `${i * 0.24}s` }}>💛</span>
          ))}
        </div>
        <span className="heart-eyebrow">💛 Heart Moment</span>
        <h2 className="heart-title">{moment.title}</h2>
        <div className="heart-pigs">
          {pigs.map((p) => (
            <div key={p.id} className="heart-pig">
              <PigPortrait pig={p} size={72} state="rescued" glow />
              <b>{p.name}</b>
            </div>
          ))}
        </div>
        {moment.line && <p className="heart-line">“{moment.line}”</p>}
        {canSkip ? (
          <button className="btn btn--primary btn--block" onClick={() => finish(true)}>
            {replay ? 'Close' : 'Continue'}
          </button>
        ) : (
          <p className="heart-hint">…</p>
        )}
      </div>
    </div>
  );
}
