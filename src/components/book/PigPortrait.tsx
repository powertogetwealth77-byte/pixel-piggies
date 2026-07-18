import { PiggyAvatar } from '../ui/PiggyAvatar';
import type { PigCharacter } from '../../data/sanctuary';

interface Props {
  pig: PigCharacter;
  size?: number;
  /** 'rescued' full colour, 'discovered' dimmed, 'hidden' dark silhouette. */
  state?: 'rescued' | 'discovered' | 'hidden';
  glow?: boolean;
  showAccessory?: boolean;
}

/**
 * A pig portrait with a rarity ring and its little accessory marker. Reuses the
 * shared PiggyAvatar art; distinctness comes from the ring + accessory, not new
 * sprites. Hidden pigs render as a dark silhouette.
 */
export function PigPortrait({ pig, size = 56, state = 'rescued', glow, showAccessory = true }: Props) {
  return (
    <div className={`pig-portrait rarity-${pig.rarity} state-${state}`} style={{ width: size, height: size }}>
      <div className="pp-avatar">
        <PiggyAvatar
          type={pig.type}
          color={pig.color}
          size={size}
          expression={state === 'rescued' ? 'happy' : state === 'discovered' ? 'idle' : 'idle'}
          pose={state === 'rescued' ? 'breathe' : 'none'}
          glow={glow}
        />
      </div>
      {showAccessory && state !== 'hidden' && (
        <span className="pp-accessory" aria-hidden="true">{pig.accessory}</span>
      )}
    </div>
  );
}
