import type { GameSnapshot } from '../../engine/types';

interface Props {
  snap: GameSnapshot;
}

const STAGE_LABEL: Record<GameSnapshot['tideStage'], string> = {
  calm: 'Calm',
  building: 'Building',
  critical: 'Critical',
};

/**
 * The Glitch Tide meter: a horizontal danger bar that fills as pressure
 * mounts, plus three strike pips. Hidden entirely in Relaxed Mode / tutorial.
 */
export function TideMeter({ snap }: Props) {
  if (!snap.tideEnabled) {
    return snap.relaxed ? (
      <div className="tide relaxed-badge" aria-label="Relaxed Mode">
        🌿 Relaxed
      </div>
    ) : null;
  }

  const pct = Math.max(0, Math.min(100, snap.tide));
  return (
    <div
      className={`tide tide--${snap.tideStage} ${snap.tideFrozen ? 'tide--frozen' : ''}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      aria-label={`Glitch Tide ${STAGE_LABEL[snap.tideStage]}`}
    >
      <div className="tide-track">
        <div className="tide-fill" style={{ width: `${pct}%` }} />
        {snap.tideFrozen && <div className="tide-frost" />}
      </div>
      <div className="tide-meta">
        <span className="tide-stage">
          {snap.tideFrozen ? '❄ Frozen' : `⚡ ${STAGE_LABEL[snap.tideStage]}`}
        </span>
        <span className="tide-strikes" aria-label={`${snap.strikes} of ${snap.maxStrikes} strikes`}>
          {Array.from({ length: snap.maxStrikes }).map((_, i) => (
            <span key={i} className={`strike-pip ${i < snap.strikes ? 'hit' : ''}`}>
              ✕
            </span>
          ))}
        </span>
      </div>
    </div>
  );
}
