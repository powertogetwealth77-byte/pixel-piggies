import { useEffect, useState } from 'react';
import { audio } from '../../audio/audio';
import { PiggyAvatar } from '../ui/PiggyAvatar';

interface Props {
  onDone: () => void;
}

// The first-piggy rescue sequence, shown after clearing level 5.
export function RescueScreen({ onDone }: Props) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    audio.star();
    const t1 = window.setTimeout(() => setStep(1), 900);
    const t2 = window.setTimeout(() => {
      audio.win();
      setStep(2);
    }, 1900);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="overlay" onClick={step >= 2 ? onDone : undefined}>
      <div className="dialog">
        <h2>🎉 Piggy Rescued!</h2>
        <div style={{ display: 'grid', placeItems: 'center', minHeight: 120 }}>
          <PiggyAvatar
            type="mochi"
            color="sky"
            size={step >= 1 ? 120 : 80}
            expression={step >= 1 ? 'wow' : 'idle'}
            glow={step >= 2}
          />
        </div>
        <p style={{ fontWeight: 800, margin: 0 }}>
          You freed <b>Mochi</b> from the pixel cage!
        </p>
        <p style={{ opacity: 0.85, margin: 0 }}>
          Mochi joins your team and can now help restore the Piggy Kingdom.
        </p>
        {step >= 2 && (
          <button className="btn btn--primary btn--block" onClick={onDone}>
            Continue
          </button>
        )}
      </div>
    </div>
  );
}
