import { useCallback, useEffect, useRef, useState } from 'react';
import { audio } from '../../audio/audio';
import { telemetry } from '../../telemetry/telemetry';
import { INTRO_PANELS } from '../../data/story';

interface Props {
  /** Called when the cinematic finishes or is skipped. */
  onDone: () => void;
  /** True when replayed from the menu (vs. the one-time first-run showing). */
  replay?: boolean;
}

const PANEL_MS = 4200; // auto-advance cadence; a tap advances sooner

/**
 * The opening cinematic — Pip's origin, told in short narration panels over
 * themed gradients (no image generation). Tap to advance, Skip to leave.
 * Fully keyboard/tap driven and reduced-motion friendly.
 */
export function StoryCinematic({ onDone, replay }: Props) {
  const [i, setI] = useState(0);
  const timer = useRef<number | undefined>(undefined);
  const finished = useRef(false);

  const finish = useCallback(
    (skipped: boolean) => {
      if (finished.current) return;
      finished.current = true;
      window.clearTimeout(timer.current);
      telemetry.log(skipped ? 'story_intro_skipped' : 'story_intro_viewed');
      onDone();
    },
    [onDone],
  );

  const next = useCallback(() => {
    setI((prev) => {
      if (prev >= INTRO_PANELS.length - 1) {
        finish(false);
        return prev;
      }
      return prev + 1;
    });
  }, [finish]);

  // Gentle chime + auto-advance per panel.
  useEffect(() => {
    audio.resume();
    audio.storyChime();
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(next, PANEL_MS);
    return () => window.clearTimeout(timer.current);
  }, [i, next]);

  const panel = INTRO_PANELS[i];

  return (
    <div
      className={`screen cine cine--${panel.bg}`}
      onClick={next}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') next();
        if (e.key === 'Escape') finish(true);
      }}
      aria-label="Story — tap to continue"
    >
      <button
        className="cine-skip"
        onClick={(e) => {
          e.stopPropagation();
          finish(true);
        }}
      >
        {replay ? 'Close' : 'Skip'} ›
      </button>

      <div className="cine-stage" key={i}>
        <div className="cine-emblem" aria-hidden="true">{panel.emblem}</div>
        <div className="cine-lines">
          {panel.lines.map((line, n) => (
            <p key={n} style={{ animationDelay: `${0.1 + n * 0.22}s` }}>
              {line}
            </p>
          ))}
        </div>
      </div>

      <div className="cine-dots" aria-hidden="true">
        {INTRO_PANELS.map((_, n) => (
          <span key={n} className={n === i ? 'on' : n < i ? 'done' : ''} />
        ))}
      </div>

      <p className="cine-hint">Tap to continue</p>
    </div>
  );
}
