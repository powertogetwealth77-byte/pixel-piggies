import { useEffect, useState } from 'react';
import { audio } from '../../audio/audio';
import { telemetry } from '../../telemetry/telemetry';
import {
  restore,
  unlockedThemes,
  type BoardTheme,
  type KingdomState,
  type SaveData,
} from '../../save/save';
import { PiggyAvatar } from '../ui/PiggyAvatar';
import type { ColorId, PiggyType } from '../../engine/types';

interface Props {
  save: SaveData;
  onBack: () => void;
  onUpdate: (s: SaveData) => void;
  onToast: (msg: string) => void;
}

interface Building {
  key: keyof KingdomState;
  name: string;
  cost: number;
  step: number;
  theme: BoardTheme;
}

const BUILDINGS: Building[] = [
  { key: 'house', name: 'Piggy House', cost: 20, step: 25, theme: 'sunrise' },
  { key: 'bakery', name: 'Bakery', cost: 30, step: 25, theme: 'candy' },
  { key: 'fountain', name: 'Fountain', cost: 40, step: 25, theme: 'lagoon' },
];

const THEME_LABEL: Record<BoardTheme, string> = {
  classic: 'Classic',
  sunrise: 'Sunrise',
  candy: 'Candy',
  lagoon: 'Lagoon',
};
const THEME_SWATCH: Record<BoardTheme, string> = {
  classic: 'linear-gradient(160deg, #4a3776, #241a3a)',
  sunrise: 'linear-gradient(160deg, #ff9d4d, #5a2850)',
  candy: 'linear-gradient(160deg, #ff96a5, #782d5a)',
  lagoon: 'linear-gradient(160deg, #4bb8f0, #0c223e)',
};

/** A restoration-staged building: color and integrity follow progress. */
function BuildingArt({ b, v }: { b: Building; v: number }) {
  const f = v / 100;
  const broken = 1 - f;
  const grayscale = `grayscale(${broken}) brightness(${0.72 + 0.28 * f})`;

  return (
    <g style={{ filter: grayscale }}>
      {b.key === 'house' && (
        <g>
          <rect x="-26" y="-8" width="52" height="34" rx="4" fill="#fff0dc" stroke="#c9a27a" strokeWidth="2" />
          <path
            d="M-32 -6 L0 -34 L32 -6 Z"
            fill="#ff6478"
            stroke="#d43f56"
            strokeWidth="2"
            strokeLinejoin="round"
            transform={`rotate(${broken * -7} 0 -6)`}
          />
          <rect x="-7" y="6" width="14" height="20" rx="3" fill="#a5714a" />
          <circle cx="-15" cy="4" r="5.5" fill="#8fd6fa" stroke="#4bb8f0" strokeWidth="1.6" />
          <circle cx="15" cy="4" r="5.5" fill="#8fd6fa" stroke="#4bb8f0" strokeWidth="1.6" />
          {broken > 0.05 && (
            <g stroke="#6b5a4a" strokeWidth="1.6" opacity={broken} fill="none">
              <path d="M-20 12 l6 -7 l-3 -5" />
              <path d="M18 20 l-5 -6 l4 -5" />
            </g>
          )}
        </g>
      )}
      {b.key === 'bakery' && (
        <g>
          <rect x="-28" y="-12" width="56" height="38" rx="5" fill="#ffe0ea" stroke="#d48aa5" strokeWidth="2" />
          {/* awning */}
          <g transform={`rotate(${broken * 6} -28 -12)`}>
            {[-28, -14, 0, 14].map((x, i) => (
              <path
                key={x}
                d={`M${x} -12 h14 v7 a7 7 0 0 1 -14 0 Z`}
                fill={i % 2 ? '#ff6478' : '#fff7ef'}
                stroke="#d43f56"
                strokeWidth="1.2"
              />
            ))}
          </g>
          {/* cupcake sign */}
          <g transform="translate(0 -22)">
            <path d="M-8 0 a8 8 0 0 1 16 0 Z" fill="#ff96a5" stroke="#d43f56" strokeWidth="1.4" />
            <path d="M-7 0 h14 l-3 9 h-8 Z" fill="#ffd45a" stroke="#c98b1a" strokeWidth="1.4" />
            <circle cx="0" cy="-7" r="2" fill="#e8465e" />
          </g>
          <rect x="-9" y="8" width="18" height="18" rx="3" fill="#a5714a" />
          {broken > 0.05 && (
            <g stroke="#6b5a4a" strokeWidth="1.6" opacity={broken} fill="none">
              <path d="M-22 4 l5 6 l-4 6" />
              <path d="M22 0 l-6 5 l3 6" />
            </g>
          )}
        </g>
      )}
      {b.key === 'fountain' && (
        <g>
          <ellipse cx="0" cy="22" rx="30" ry="9" fill="#bff0ff" stroke="#4bb8f0" strokeWidth="2" />
          <rect x="-24" y="14" width="48" height="9" rx="4.5" fill="#d8e4f0" stroke="#9fb4cc" strokeWidth="1.6" />
          <rect x="-5" y="-12" width="10" height="28" rx="4" fill="#d8e4f0" stroke="#9fb4cc" strokeWidth="1.6" transform={`rotate(${broken * 8} 0 14)`} />
          <ellipse cx="0" cy="-13" rx="12" ry="4" fill="#d8e4f0" stroke="#9fb4cc" strokeWidth="1.6" />
          {/* water — appears as restoration progresses */}
          {f > 0.4 && (
            <g className="k-water" opacity={Math.min(1, (f - 0.4) / 0.5)}>
              <path d="M0 -14 q-12 -12 -18 4" fill="none" stroke="#4bb8f0" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M0 -14 q12 -12 18 4" fill="none" stroke="#4bb8f0" strokeWidth="2.4" strokeLinecap="round" />
              <path d="M0 -16 q0 -10 0 14" fill="none" stroke="#8fd6fa" strokeWidth="2.4" strokeLinecap="round" />
            </g>
          )}
          {broken > 0.05 && (
            <path d="M-14 18 l5 -5 l-3 -5" stroke="#6b7d8f" strokeWidth="1.6" opacity={broken} fill="none" />
          )}
        </g>
      )}
      {/* scaffold while under restoration */}
      {v > 0 && v < 100 && (
        <g stroke="#a5714a" strokeWidth="1.6" opacity="0.8">
          <line x1="-30" y1="26" x2="-30" y2="-26" />
          <line x1="30" y1="26" x2="30" y2="-26" />
          <line x1="-30" y1="-14" x2="30" y2="-14" />
        </g>
      )}
      {/* gleam when complete */}
      {v >= 100 && (
        <g className="k-gleam" fill="#fff">
          <path d="M-30 -30 l1.6 3.8 3.8 1.6 -3.8 1.6 -1.6 3.8 -1.6 -3.8 -3.8 -1.6 3.8 -1.6 Z" />
          <path d="M28 -22 l1.2 2.9 2.9 1.2 -2.9 1.2 -1.2 2.9 -1.2 -2.9 -2.9 -1.2 2.9 -1.2 Z" />
        </g>
      )}
    </g>
  );
}

interface Wanderer {
  type: PiggyType;
  color: ColorId;
  name: string;
  unlocked: boolean;
  hint: string;
  dur: number;
  delay: number;
}

export function KingdomScreen({ save, onBack, onUpdate, onToast }: Props) {
  const [reacting, setReacting] = useState<string | null>(null);
  const themes = unlockedThemes(save);

  // Local playtest stat: kingdom visits (stored on-device only).
  useEffect(() => {
    telemetry.kingdomVisit();
  }, []);

  const wanderers: Wanderer[] = [
    { type: 'mochi', color: 'sky', name: 'Mochi', unlocked: !!save.rescued.mochi, hint: 'Clear Level 5 to rescue Mochi!', dur: 9, delay: 0 },
    { type: 'pip', color: 'coral', name: 'Pip', unlocked: !!save.rescued.pip, hint: 'Clear Level 8 to rescue Pip!', dur: 11, delay: 1.2 },
    { type: 'blaze', color: 'sunny', name: 'Blaze', unlocked: !!save.rescued.blaze, hint: 'Clear Level 11 to rescue Blaze!', dur: 8, delay: 2.1 },
    { type: 'prism', color: 'grape', name: 'Prism', unlocked: !!save.rescued.prism, hint: 'Clear Level 14 to rescue Prism!', dur: 13, delay: 0.6 },
  ];

  const doRestore = (b: Building) => {
    const next = restore(save, b.key, b.cost, b.step);
    if (!next) {
      onToast(save.kingdom[b.key] >= 100 ? 'Already fully restored!' : 'Not enough Pigment');
      audio.fizzle();
      return;
    }
    onUpdate(next);
    audio.coin();
    if (next.kingdom[b.key] >= 100) {
      audio.star();
      onToast(`${b.name} restored! "${THEME_LABEL[b.theme]}" board theme unlocked 🎉`);
    } else {
      onToast(`${b.name} +${b.step}%`);
    }
  };

  const pickTheme = (t: BoardTheme) => {
    if (!themes.includes(t)) {
      const b = BUILDINGS.find((x) => x.theme === t);
      onToast(b ? `Fully restore the ${b.name} to unlock` : 'Locked');
      audio.fizzle();
      return;
    }
    onUpdate({ ...save, settings: { ...save.settings, theme: t } });
    audio.select();
    onToast(`${THEME_LABEL[t]} theme equipped`);
  };

  const poke = (w: Wanderer) => {
    setReacting(w.name);
    audio.squeal(w.type);
    window.setTimeout(() => setReacting((r) => (r === w.name ? null : r)), 700);
  };

  const totalResto = Math.round(
    (save.kingdom.house + save.kingdom.bakery + save.kingdom.fountain) / 3,
  );

  return (
    <div className="screen">
      <div className="row row--between">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h2 style={{ margin: 0 }}>Piggy Kingdom</h2>
        <span className="pill">🎨 {save.pigment}</span>
      </div>

      {/* Layered scene */}
      <div className="kingdom-scene">
        <svg viewBox="0 0 360 190" className="k-svg" role="img" aria-label="Piggy Kingdom scene">
          <defs>
            <linearGradient id="k-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8fd6fa" />
              <stop offset="70%" stopColor="#dff4ff" />
              <stop offset="100%" stopColor="#bff0d8" />
            </linearGradient>
          </defs>
          <rect width="360" height="190" fill="url(#k-sky)" rx="14" />
          <circle cx="312" cy="34" r="18" fill="#ffe08a" />
          <circle cx="312" cy="34" r="24" fill="#ffe08a" opacity="0.35" />
          <ellipse cx="60" cy="196" rx="180" ry="52" fill="#8fe0b4" />
          <ellipse cx="310" cy="204" rx="200" ry="60" fill="#6fd39e" />
          <path d="M0 176 q90 -14 180 0 t180 0 v14 h-360 Z" fill="#f5e3c2" opacity="0.9" />
          <g transform="translate(64 128)">
            <BuildingArt b={BUILDINGS[0]} v={save.kingdom.house} />
          </g>
          <g transform="translate(180 124)">
            <BuildingArt b={BUILDINGS[1]} v={save.kingdom.bakery} />
          </g>
          <g transform="translate(292 126)">
            <BuildingArt b={BUILDINGS[2]} v={save.kingdom.fountain} />
          </g>
        </svg>

        {/* wandering rescued piggies */}
        {wanderers
          .filter((w) => w.unlocked)
          .map((w) => (
            <button
              key={w.name}
              className={`k-wanderer ${reacting === w.name ? 'react' : ''}`}
              style={{ animationDuration: `${w.dur}s`, animationDelay: `-${w.delay}s` }}
              onClick={() => poke(w)}
              aria-label={`${w.name} the piggy`}
            >
              <PiggyAvatar type={w.type} color={w.color} size={46} expression={reacting === w.name ? 'wow' : 'happy'} pose="breathe" />
            </button>
          ))}
        <div className="k-progress">Restored: {totalResto}%</div>
      </div>

      {/* Piggy roster */}
      <div className="card k-roster">
        {wanderers.map((w) => (
          <div key={w.name} className={`k-roster-item ${w.unlocked ? '' : 'locked'}`}>
            <PiggyAvatar type={w.type} color={w.color} size={40} expression={w.unlocked ? 'happy' : 'idle'} pose="none" />
            <small>{w.unlocked ? w.name : w.hint}</small>
          </div>
        ))}
      </div>

      {/* Restoration items */}
      {BUILDINGS.map((b) => (
        <div className="card" key={b.key}>
          <div className="resto-item">
            <div style={{ flex: 1 }}>
              <div className="row row--between" style={{ marginBottom: 6 }}>
                <b>{b.name}</b>
                <span style={{ opacity: 0.8 }}>{save.kingdom[b.key]}%</span>
              </div>
              <div className="resto-bar">
                <div style={{ width: `${save.kingdom[b.key]}%` }} />
              </div>
              <small style={{ opacity: 0.7 }}>
                Unlocks the {THEME_LABEL[b.theme]} board theme
              </small>
            </div>
            <button
              className="btn btn--mint"
              style={{ padding: '10px 14px', minHeight: 44 }}
              disabled={save.kingdom[b.key] >= 100 || save.pigment < b.cost}
              onClick={() => doRestore(b)}
            >
              🎨 {b.cost}
            </button>
          </div>
        </div>
      ))}

      {/* Theme picker */}
      <div className="card">
        <b style={{ display: 'block', marginBottom: 10 }}>Board Themes</b>
        <div className="theme-row">
          {(Object.keys(THEME_LABEL) as BoardTheme[]).map((t) => {
            const unlocked = themes.includes(t);
            const active = save.settings.theme === t;
            return (
              <button
                key={t}
                className={`theme-chip ${active ? 'active' : ''} ${unlocked ? '' : 'locked'}`}
                onClick={() => pickTheme(t)}
                aria-label={`${THEME_LABEL[t]} theme${unlocked ? '' : ' (locked)'}`}
              >
                <span className="theme-swatch" style={{ background: THEME_SWATCH[t] }}>
                  {!unlocked && '🔒'}
                  {active && '✓'}
                </span>
                <small>{THEME_LABEL[t]}</small>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
