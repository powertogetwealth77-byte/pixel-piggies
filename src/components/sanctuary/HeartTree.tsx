interface Props {
  /** Restoration tier 0–5. Drives leaves, canopy, glow, and golden veins. */
  tier: number;
  size?: number;
  onClick?: () => void;
}

// Leaf cluster positions (relative to the 200×200 viewBox canopy area).
const LEAVES: Array<[number, number, number]> = [
  [100, 58, 20], [72, 74, 17], [128, 74, 17],
  [58, 98, 15], [142, 98, 15], [100, 92, 18],
  [80, 110, 13], [120, 110, 13], [100, 122, 14],
];

/**
 * The Great Heart Tree — the Sanctuary's central progress symbol. It grows
 * from a bare, cracked trunk (tier 0) to a full golden canopy (tier 5). Pure
 * inline SVG so it costs nothing to ship and scales crisply on any screen.
 *
 * How much shows by tier:
 *   0 bare & cracked · 1 one glowing leaf · 2 small clusters ·
 *   3 growing canopy · 4 golden veins · 5 full radiant canopy.
 */
export function HeartTree({ tier, size = 160, onClick }: Props) {
  // How many leaf clusters are visible at this tier.
  const leafCount = tier <= 0 ? 0 : tier === 1 ? 1 : Math.min(LEAVES.length, 1 + tier * 2);
  const golden = tier >= 4;
  const glowing = tier >= 3;
  const cracked = tier <= 1;
  const canopy = golden ? '#ffd76a' : '#8fd694';
  const canopyDark = golden ? '#f2b13d' : '#5fae69';

  return (
    <button
      className={`heart-tree tier-${tier} ${onClick ? 'tappable' : ''}`}
      style={{ width: size, height: size }}
      onClick={onClick}
      disabled={!onClick}
      aria-label="The Great Heart Tree"
    >
      <svg viewBox="0 0 200 210" width={size} height={size} aria-hidden="true">
        <defs>
          <radialGradient id="ht-glow" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor={golden ? '#fff2c4' : '#eafff0'} stopOpacity={glowing ? 0.9 : 0} />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="ht-canopy" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={canopy} />
            <stop offset="100%" stopColor={canopyDark} />
          </linearGradient>
        </defs>

        {/* Soft glow halo (tier 3+) */}
        {glowing && <circle cx="100" cy="92" r="88" fill="url(#ht-glow)" className="ht-halo" />}

        {/* Ground mound */}
        <ellipse cx="100" cy="196" rx="60" ry="12" fill="#7bbd82" opacity="0.5" />

        {/* Trunk */}
        <path
          d="M92 200 L90 130 Q100 120 110 130 L108 200 Z"
          fill={golden ? '#a9743f' : '#8a5a34'}
        />
        {/* Trunk crack (bare tiers) */}
        {cracked && <path d="M100 196 L97 160 L101 140 L99 128" stroke="#3d2818" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.7" />}

        {/* Bare branches (always) */}
        <g stroke={golden ? '#a9743f' : '#8a5a34'} strokeWidth="6" strokeLinecap="round" fill="none">
          <path d="M100 132 Q78 116 66 96" />
          <path d="M100 132 Q122 116 134 96" />
          <path d="M100 128 Q100 106 100 88" />
        </g>

        {/* Golden veins (tier 4+) */}
        {golden && (
          <g stroke="#ffe9a8" strokeWidth="1.6" strokeLinecap="round" fill="none" opacity="0.85" className="ht-vein">
            <path d="M100 196 L100 132" />
            <path d="M100 150 Q86 136 74 120" />
            <path d="M100 150 Q114 136 126 120" />
          </g>
        )}

        {/* Leaf clusters, revealed by tier */}
        {LEAVES.slice(0, leafCount).map(([cx, cy, r], i) => (
          <circle
            key={i}
            cx={cx}
            cy={cy}
            r={r}
            fill="url(#ht-canopy)"
            className="ht-leaf"
            style={{ animationDelay: `${i * 0.09}s` }}
          />
        ))}

        {/* The single first leaf at tier 1 gets a gentle shimmer */}
        {tier === 1 && <circle cx="100" cy="88" r="9" fill="#a6e6ac" className="ht-firstleaf" />}

        {/* Heart emblem in the canopy at higher tiers */}
        {tier >= 5 && (
          <path
            d="M100 70 c-6-10-22-8-22 4 c0 9 13 17 22 24 c9-7 22-15 22-24 c0-12-16-14-22-4 Z"
            fill="#ff8fb0"
            className="ht-heart"
          />
        )}
      </svg>
    </button>
  );
}
