import type { ColorId, PiggyType } from '../../engine/types';
import { BLOCK_COLORS } from '../../data/palette';

interface Props {
  type: PiggyType;
  color: ColorId;
  size?: number;
  expression?: 'idle' | 'happy' | 'launch' | 'wow';
  glow?: boolean;
  className?: string;
}

// Original piggy artwork drawn as inline SVG. Each type has a distinct
// accessory / face so it reads instantly.
export function PiggyAvatar({ type, color, size = 64, expression = 'idle', glow, className }: Props) {
  const c = BLOCK_COLORS[color];
  const eyeY = expression === 'happy' || expression === 'wow' ? 40 : 42;
  const mouth =
    expression === 'wow'
      ? { d: 'M44 56 a8 8 0 0 0 16 0 a8 8 0 0 0 -16 0', fill: '#7a2b3a' }
      : expression === 'happy' || expression === 'launch'
      ? { d: 'M42 54 q10 12 20 0', fill: 'none' }
      : { d: 'M46 55 q6 6 12 0', fill: 'none' };

  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 104 104"
      role="img"
      aria-label={`${type} piggy`}
      style={{ filter: glow ? `drop-shadow(0 0 10px ${c.light})` : undefined, overflow: 'visible' }}
    >
      {/* ears */}
      <path d="M28 26 L20 8 L44 22 Z" fill={c.dark} />
      <path d="M76 26 L84 8 L60 22 Z" fill={c.dark} />
      {/* head */}
      <circle cx="52" cy="52" r="34" fill={c.base} stroke={c.dark} strokeWidth="3" />
      {/* cheeks */}
      <circle cx="32" cy="58" r="7" fill={c.light} opacity="0.7" />
      <circle cx="72" cy="58" r="7" fill={c.light} opacity="0.7" />
      {/* snout */}
      <ellipse cx="52" cy="60" rx="16" ry="12" fill={c.light} stroke={c.dark} strokeWidth="2" />
      <ellipse cx="46" cy="60" rx="3" ry="5" fill={c.dark} />
      <ellipse cx="58" cy="60" rx="3" ry="5" fill={c.dark} />
      {/* eyes */}
      <circle cx="40" cy={eyeY} r="5" fill="#2b2144" />
      <circle cx="64" cy={eyeY} r="5" fill="#2b2144" />
      <circle cx="42" cy={eyeY - 2} r="1.6" fill="#fff" />
      <circle cx="66" cy={eyeY - 2} r="1.6" fill="#fff" />
      {/* mouth */}
      <path d={mouth.d} fill={mouth.fill} stroke="#7a2b3a" strokeWidth="2" strokeLinecap="round" />

      {/* type accessory */}
      {type === 'pip' && (
        // straight-line bolt crown
        <path d="M38 20 L52 6 L66 20 L58 24 L52 16 L46 24 Z" fill="#ffd45a" stroke="#c98b1a" strokeWidth="1.5" />
      )}
      {type === 'mochi' && (
        // round puff hat
        <g>
          <circle cx="52" cy="16" r="9" fill="#fff7ef" stroke={c.dark} strokeWidth="2" />
          <circle cx="52" cy="16" r="3" fill={c.base} />
        </g>
      )}
      {type === 'blaze' && (
        // flame tuft
        <path d="M52 4 C58 14 46 16 52 24 C60 18 62 10 52 4 Z" fill="#ff7a3d" stroke="#e0451f" strokeWidth="1.5" />
      )}
      {type === 'prism' && (
        // rainbow arc
        <g fill="none" strokeWidth="3" strokeLinecap="round">
          <path d="M36 20 a16 16 0 0 1 32 0" stroke="#ff6478" />
          <path d="M40 20 a12 12 0 0 1 24 0" stroke="#ffc83d" />
          <path d="M44 20 a8 8 0 0 1 16 0" stroke="#57d99a" />
        </g>
      )}
    </svg>
  );
}
