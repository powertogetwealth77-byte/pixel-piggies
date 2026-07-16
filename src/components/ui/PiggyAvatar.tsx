import { useId } from 'react';
import type { ColorId, PiggyType } from '../../engine/types';
import { BLOCK_COLORS } from '../../data/palette';

export type PiggyExpression = 'idle' | 'happy' | 'launch' | 'wow';
export type PiggyPose = 'breathe' | 'anticipate' | 'dance' | 'none';

interface Props {
  type: PiggyType;
  color: ColorId;
  size?: number;
  expression?: PiggyExpression;
  pose?: PiggyPose;
  glow?: boolean;
  className?: string;
}

/**
 * Original 3D-toy piggy characters, rendered as layered SVG.
 *
 * Every piggy is built from the same anatomy — dimensional body with
 * radial-gradient shading, rim light, gloss highlight, inner-shaded ears,
 * trotters, a sculpted snout, blush cheeks and big glossy eyes — while each
 * of the four heroes keeps a distinct silhouette:
 *   Pip    — stocky build with a safety helmet and drill bit (Lane Drill)
 *   Mochi  — extra-wide marshmallow squish with a cream tuft (Area Pop)
 *   Blaze  — tall athletic build with a flame mohawk (Combo Fire)
 *   Prism  — crystal-horned dreamer with sparkles (Wildcard)
 *
 * Idle breathing, blinking, anticipation and victory-dance motion are CSS
 * classes (see .pa-* rules); reduced-motion disables them globally.
 */
export function PiggyAvatar({
  type,
  color,
  size = 64,
  expression = 'idle',
  pose = 'breathe',
  glow,
  className,
}: Props) {
  const c = BLOCK_COLORS[color];
  const uid = useId().replace(/[:]/g, '');
  const bodyGrad = `pa-body-${uid}`;
  const snoutGrad = `pa-snout-${uid}`;
  const shadowGrad = `pa-shadow-${uid}`;
  const hornGrad = `pa-horn-${uid}`;

  // Silhouette per hero.
  const bodyRx = type === 'mochi' ? 37 : type === 'blaze' ? 31 : type === 'pip' ? 34 : 33;
  const bodyRy = type === 'mochi' ? 30 : type === 'blaze' ? 35 : type === 'pip' ? 32 : 32;
  const bodyCy = 64;

  const eyeY = expression === 'wow' ? 52 : 54;
  const eyeR = expression === 'wow' ? 6.5 : 5.4;

  return (
    <svg
      className={`pa pa--${pose} ${glow ? 'pa--fever' : ''} ${className ?? ''}`}
      width={size}
      height={size}
      viewBox="0 0 120 120"
      role="img"
      aria-label={`${type} piggy`}
      style={{
        overflow: 'visible',
        filter: glow ? `drop-shadow(0 0 12px ${c.light})` : undefined,
      }}
    >
      <defs>
        <radialGradient id={bodyGrad} cx="0.36" cy="0.3" r="0.95">
          <stop offset="0%" stopColor={c.light} />
          <stop offset="52%" stopColor={c.base} />
          <stop offset="100%" stopColor={c.dark} />
        </radialGradient>
        <radialGradient id={snoutGrad} cx="0.4" cy="0.32" r="0.9">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="45%" stopColor={c.light} />
          <stop offset="100%" stopColor={c.base} />
        </radialGradient>
        <radialGradient id={shadowGrad} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#1a1130" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#1a1130" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={hornGrad} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff7ef" />
          <stop offset="35%" stopColor="#c4b0ff" />
          <stop offset="70%" stopColor="#8fd6fa" />
          <stop offset="100%" stopColor="#ff96a5" />
        </linearGradient>
      </defs>

      {/* soft ground shadow */}
      <ellipse cx="60" cy="103" rx={bodyRx * 0.86} ry="7" fill={`url(#${shadowGrad})`} />

      <g className="pa-body">
        {/* ears (behind body) with inner shading */}
        <g className="pa-ears">
          <path
            d={`M${60 - bodyRx * 0.72} ${bodyCy - bodyRy * 0.72} L${60 - bodyRx * 0.95} ${bodyCy - bodyRy - 12} Q${60 - bodyRx * 0.4} ${bodyCy - bodyRy - 4} ${60 - bodyRx * 0.3} ${bodyCy - bodyRy * 0.86} Z`}
            fill={c.base}
            stroke={c.dark}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d={`M${60 + bodyRx * 0.72} ${bodyCy - bodyRy * 0.72} L${60 + bodyRx * 0.95} ${bodyCy - bodyRy - 12} Q${60 + bodyRx * 0.4} ${bodyCy - bodyRy - 4} ${60 + bodyRx * 0.3} ${bodyCy - bodyRy * 0.86} Z`}
            fill={c.base}
            stroke={c.dark}
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <path
            d={`M${60 - bodyRx * 0.66} ${bodyCy - bodyRy * 0.78} L${60 - bodyRx * 0.82} ${bodyCy - bodyRy - 7} Q${60 - bodyRx * 0.46} ${bodyCy - bodyRy - 2} ${60 - bodyRx * 0.42} ${bodyCy - bodyRy * 0.9} Z`}
            fill={c.dark}
            opacity="0.55"
          />
          <path
            d={`M${60 + bodyRx * 0.66} ${bodyCy - bodyRy * 0.78} L${60 + bodyRx * 0.82} ${bodyCy - bodyRy - 7} Q${60 + bodyRx * 0.46} ${bodyCy - bodyRy - 2} ${60 + bodyRx * 0.42} ${bodyCy - bodyRy * 0.9} Z`}
            fill={c.dark}
            opacity="0.55"
          />
        </g>

        {/* trotters */}
        <g className="pa-hooves">
          <rect x={60 - bodyRx * 0.62} y={bodyCy + bodyRy - 8} width="13" height="14" rx="6" fill={c.dark} />
          <rect x={60 + bodyRx * 0.62 - 13} y={bodyCy + bodyRy - 8} width="13" height="14" rx="6" fill={c.dark} />
          <rect x={60 - bodyRx * 0.62} y={bodyCy + bodyRy - 8} width="13" height="7" rx="3.5" fill={c.base} opacity="0.5" />
          <rect x={60 + bodyRx * 0.62 - 13} y={bodyCy + bodyRy - 8} width="13" height="7" rx="3.5" fill={c.base} opacity="0.5" />
        </g>

        {/* body */}
        <ellipse cx="60" cy={bodyCy} rx={bodyRx} ry={bodyRy} fill={`url(#${bodyGrad})`} />
        {/* rim light (lower-left cool bounce) */}
        <path
          d={`M${60 - bodyRx * 0.92} ${bodyCy + bodyRy * 0.3} A ${bodyRx} ${bodyRy} 0 0 0 ${60 - bodyRx * 0.1} ${bodyCy + bodyRy * 0.97}`}
          fill="none"
          stroke="#bff0ff"
          strokeOpacity="0.5"
          strokeWidth="3"
          strokeLinecap="round"
        />
        {/* gloss highlight */}
        <ellipse
          cx={60 - bodyRx * 0.38}
          cy={bodyCy - bodyRy * 0.5}
          rx={bodyRx * 0.34}
          ry={bodyRy * 0.22}
          fill="#ffffff"
          opacity="0.4"
          transform={`rotate(-24 ${60 - bodyRx * 0.38} ${bodyCy - bodyRy * 0.5})`}
        />
        <circle cx={60 + bodyRx * 0.34} cy={bodyCy - bodyRy * 0.62} r="3" fill="#ffffff" opacity="0.35" />

        {/* cheeks */}
        <ellipse cx={60 - bodyRx * 0.58} cy={bodyCy + 4} rx="7.5" ry="5.5" fill="#ff96a5" opacity="0.75" />
        <ellipse cx={60 + bodyRx * 0.58} cy={bodyCy + 4} rx="7.5" ry="5.5" fill="#ff96a5" opacity="0.75" />

        {/* eyes with sparkle + blinking lids */}
        <g className="pa-eyes" style={{ transformOrigin: '60px 54px' }}>
          <circle cx="46" cy={eyeY} r={eyeR} fill="#2b2144" />
          <circle cx="74" cy={eyeY} r={eyeR} fill="#2b2144" />
          <circle cx="48" cy={eyeY - 2} r="2" fill="#fff" />
          <circle cx="76" cy={eyeY - 2} r="2" fill="#fff" />
          <circle cx="44.6" cy={eyeY + 1.6} r="0.9" fill="#fff" opacity="0.8" />
          <circle cx="72.6" cy={eyeY + 1.6} r="0.9" fill="#fff" opacity="0.8" />
          {expression === 'launch' && (
            <g stroke={c.dark} strokeWidth="2.6" strokeLinecap="round">
              <path d="M40 45 L52 48" />
              <path d="M80 45 L68 48" />
            </g>
          )}
          {expression === 'happy' && (
            <g stroke="#2b2144" strokeWidth="2" fill={c.base}>
              <path d={`M40.5 ${eyeY} a5.5 5.5 0 0 0 11 0 Z`} stroke="none" />
              <path d={`M68.5 ${eyeY} a5.5 5.5 0 0 0 11 0 Z`} stroke="none" />
            </g>
          )}
        </g>

        {/* sculpted snout */}
        <g className="pa-snout">
          <ellipse cx="60" cy="68" rx="15" ry="11" fill={`url(#${snoutGrad})`} stroke={c.dark} strokeWidth="2" />
          <ellipse cx="54.5" cy="68" rx="2.6" ry="4.4" fill={c.dark} />
          <ellipse cx="65.5" cy="68" rx="2.6" ry="4.4" fill={c.dark} />
          <ellipse cx="55.2" cy="66.4" rx="1" ry="1.6" fill="#fff" opacity="0.45" />
          <ellipse cx="66.2" cy="66.4" rx="1" ry="1.6" fill="#fff" opacity="0.45" />
        </g>

        {/* mouth */}
        {expression === 'wow' ? (
          <g>
            <ellipse cx="60" cy="84" rx="7" ry="8" fill="#7a2b3a" />
            <ellipse cx="60" cy="87" rx="4.5" ry="4" fill="#ff96a5" />
          </g>
        ) : expression === 'happy' || expression === 'launch' ? (
          <path d="M50 82 q10 10 20 0" fill="none" stroke="#7a2b3a" strokeWidth="2.6" strokeLinecap="round" />
        ) : (
          <path d="M54 83 q6 5 12 0" fill="none" stroke="#7a2b3a" strokeWidth="2.4" strokeLinecap="round" />
        )}

        {/* ---- hero accessories ---- */}
        {type === 'pip' && (
          <g className="pa-hat">
            {/* safety helmet with drill bit */}
            <path d={`M${60 - 24} ${bodyCy - bodyRy + 4} a24 17 0 0 1 48 0 Z`} fill="#ffd45a" stroke="#c98b1a" strokeWidth="2" />
            <path d={`M${60 - 24} ${bodyCy - bodyRy + 4} a24 17 0 0 1 24 -16.6 l0 5 a19 13 0 0 0 -18.5 11.6 Z`} fill="#fff" opacity="0.35" />
            <rect x={60 - 27} y={bodyCy - bodyRy + 2} width="54" height="6" rx="3" fill="#e0a01f" stroke="#c98b1a" strokeWidth="1.5" />
            <path d={`M60 ${bodyCy - bodyRy - 26} L66 ${bodyCy - bodyRy - 12} L54 ${bodyCy - bodyRy - 12} Z`} fill="#9aa7b8" stroke="#5d6b7d" strokeWidth="1.5" />
            <rect x="53" y={bodyCy - bodyRy - 13} width="14" height="4" rx="2" fill="#c3ccd8" stroke="#5d6b7d" strokeWidth="1" />
          </g>
        )}
        {type === 'mochi' && (
          <g className="pa-hat">
            {/* whipped-cream tuft */}
            <path
              d={`M60 ${bodyCy - bodyRy - 18} q10 2 8 10 q10 1 4 9 q-6 6 -12 2 q-8 4 -12 -2 q-6 -8 4 -9 q-2 -8 8 -10 Z`}
              fill="#fff7ef"
              stroke="#e8d8c8"
              strokeWidth="2"
            />
            <circle cx="60" cy={bodyCy - bodyRy - 12} r="3.4" fill={c.base} />
          </g>
        )}
        {type === 'blaze' && (
          <g className="pa-hat">
            {/* flame mohawk */}
            <path
              d={`M48 ${bodyCy - bodyRy + 2} C50 ${bodyCy - bodyRy - 16} 56 ${bodyCy - bodyRy - 10} 57 ${bodyCy - bodyRy - 24} C64 ${bodyCy - bodyRy - 14} 62 ${bodyCy - bodyRy - 12} 68 ${bodyCy - bodyRy - 18} C72 ${bodyCy - bodyRy - 6} 68 ${bodyCy - bodyRy + 2} 60 ${bodyCy - bodyRy + 4} Z`}
              fill="#ff7a3d"
              stroke="#e0451f"
              strokeWidth="2"
              strokeLinejoin="round"
            />
            <path
              d={`M55 ${bodyCy - bodyRy} C56 ${bodyCy - bodyRy - 10} 60 ${bodyCy - bodyRy - 8} 60 ${bodyCy - bodyRy - 14} C64 ${bodyCy - bodyRy - 6} 63 ${bodyCy - bodyRy - 2} 60 ${bodyCy - bodyRy + 2} Z`}
              fill="#ffd45a"
            />
            {/* headband */}
            <rect x={60 - bodyRx * 0.8} y={bodyCy - bodyRy + 6} width={bodyRx * 1.6} height="5.5" rx="2.75" fill="#e8465e" opacity="0.9" />
          </g>
        )}
        {type === 'prism' && (
          <g className="pa-hat">
            {/* faceted crystal horn */}
            <path d={`M60 ${bodyCy - bodyRy - 24} L67 ${bodyCy - bodyRy + 2} L53 ${bodyCy - bodyRy + 2} Z`} fill={`url(#${hornGrad})`} stroke="#8f79d4" strokeWidth="1.6" strokeLinejoin="round" />
            <path d={`M60 ${bodyCy - bodyRy - 24} L60 ${bodyCy - bodyRy + 2}`} stroke="#ffffff" strokeOpacity="0.7" strokeWidth="1.2" />
            <g className="pa-sparkle" fill="#fff">
              <path d="M31 30 l1.7 4.1 4.1 1.7 -4.1 1.7 -1.7 4.1 -1.7 -4.1 -4.1 -1.7 4.1 -1.7 Z" opacity="0.9" />
              <path d="M89 38 l1.3 3 3 1.3 -3 1.3 -1.3 3 -1.3 -3 -3 -1.3 3 -1.3 Z" opacity="0.75" />
            </g>
          </g>
        )}
      </g>
    </svg>
  );
}
