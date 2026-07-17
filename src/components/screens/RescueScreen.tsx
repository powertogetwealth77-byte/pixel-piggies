import { useEffect, useState } from 'react';
import { audio } from '../../audio/audio';
import { PIGGIES, RESCUE_ARCS } from '../../data/piggies';
import type { PiggyType } from '../../engine/types';
import { PiggyAvatar } from '../ui/PiggyAvatar';

interface Props {
  piggy: PiggyType;
  onDone: () => void;
}

/**
 * Rescue story beat, shown after first clearing a hero's rescue level:
 * caged & sad → the cage bursts open → celebration with their reward.
 */
export function RescueScreen({ piggy, onDone }: Props) {
  const [step, setStep] = useState(0);
  const arc = RESCUE_ARCS[piggy];
  const def = PIGGIES[piggy];

  useEffect(() => {
    audio.star();
    const t1 = window.setTimeout(() => {
      audio.pop(12, true); // cage burst
      setStep(1);
    }, 1100);
    const t2 = window.setTimeout(() => {
      audio.win();
      audio.squeal();
      setStep(2);
    }, 2100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  const rewardText = [
    arc.reward.coins ? `🪙 +${arc.reward.coins} coins` : null,
    arc.reward.pigment ? `🎨 +${arc.reward.pigment} Pigment` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="overlay" onClick={step >= 2 ? onDone : undefined}>
      <div className="dialog">
        <h2>🎉 Piggy Rescued!</h2>
        <div className="rescue-stage">
          <PiggyAvatar
            type={piggy}
            color={arc.color}
            size={step >= 1 ? 120 : 88}
            expression={step >= 2 ? 'happy' : step >= 1 ? 'wow' : 'sad'}
            pose={step >= 2 ? 'dance' : 'breathe'}
            glow={step >= 2}
          />
          {step < 1 && (
            <svg className="rescue-cage" viewBox="0 0 100 100" aria-hidden="true">
              <rect x="8" y="4" width="84" height="10" rx="5" fill="#5d6b7d" />
              <rect x="8" y="86" width="84" height="10" rx="5" fill="#5d6b7d" />
              {[16, 33, 50, 67, 84].map((x) => (
                <rect key={x} x={x - 3} y="8" width="6" height="84" rx="3" fill="#7c8a9c" />
              ))}
            </svg>
          )}
        </div>
        <p style={{ fontWeight: 800, margin: 0 }}>
          <b>{def.name}</b> was {arc.caged}!
        </p>
        {step >= 1 && (
          <p style={{ opacity: 0.85, margin: 0 }}>{arc.joins}</p>
        )}
        {step >= 2 && (
          <>
            {rewardText && <p className="rescue-teaser">{rewardText}</p>}
            <p style={{ opacity: 0.75, margin: 0, fontSize: '0.82rem' }}>
              {def.name} now wanders the Piggy Kingdom — go say hi!
            </p>
            <button className="btn btn--primary btn--block" onClick={onDone}>
              Continue
            </button>
          </>
        )}
      </div>
    </div>
  );
}
