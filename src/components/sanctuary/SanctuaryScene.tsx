import { useEffect, useRef } from 'react';
import { SANCTUARY, type CaptivePig } from '../../data/sanctuary';
import { telemetry } from '../../telemetry/telemetry';
import { PiggyAvatar } from '../ui/PiggyAvatar';
import { HeartTree } from './HeartTree';
import type { SaveData } from '../../save/save';

interface Props {
  save: SaveData;
  tier: number;
  onHeartTree: () => void;
}

// A decoration that appears at a given tier. Positioned with CSS percentages so
// it scales with the scene on any screen. Emoji + CSS only — no new assets.
interface Deco {
  from: number; // tier at which it first appears
  icon: string;
  cls: string;
  style: React.CSSProperties;
}

const DECOS: Deco[] = [
  // Tier 1 — first light
  { from: 1, icon: '🔥', cls: 'deco-fire', style: { left: '20%', bottom: '20%' } },
  { from: 1, icon: '🌸', cls: 'deco-flower', style: { left: '12%', bottom: '9%' } },
  { from: 1, icon: '🦋', cls: 'deco-butterfly', style: { left: '30%', top: '30%' } },
  // Tier 2 — home begins
  { from: 2, icon: '🥖', cls: 'deco-bakery', style: { right: '14%', bottom: '19%' } },
  { from: 2, icon: '🌷', cls: 'deco-flower', style: { right: '24%', bottom: '9%' } },
  { from: 2, icon: '🪑', cls: 'deco-bench', style: { left: '40%', bottom: '11%' } },
  // Tier 3 — the herd returns
  { from: 3, icon: '🏠', cls: 'deco-home', style: { left: '8%', bottom: '19%' } },
  { from: 3, icon: '🏮', cls: 'deco-lantern', style: { left: '54%', top: '16%' } },
  { from: 3, icon: '🏮', cls: 'deco-lantern', style: { right: '30%', top: '22%' } },
  { from: 3, icon: '🌾', cls: 'deco-garden', style: { right: '10%', bottom: '10%' } },
  { from: 3, icon: '🌼', cls: 'deco-flower', style: { left: '26%', bottom: '8%' } },
  // Tier 4 — a kingdom awakens
  { from: 4, icon: '🏫', cls: 'deco-school', style: { right: '6%', bottom: '30%' } },
  { from: 4, icon: '🎪', cls: 'deco-market', style: { left: '6%', bottom: '31%' } },
  { from: 4, icon: '🌉', cls: 'deco-bridge', style: { left: '46%', bottom: '6%' } },
  { from: 4, icon: '🐦', cls: 'deco-bird', style: { right: '38%', top: '12%' } },
  // Tier 5 — piggy kingdom reborn
  { from: 5, icon: '🏰', cls: 'deco-castle', style: { left: '50%', top: '6%' } },
  { from: 5, icon: '🎉', cls: 'deco-banner', style: { left: '18%', top: '10%' } },
  { from: 5, icon: '🎊', cls: 'deco-banner', style: { right: '18%', top: '10%' } },
  { from: 5, icon: '🌈', cls: 'deco-rainbow', style: { right: '8%', top: '4%' } },
];

/**
 * The living Sanctuary scene: a warm meadow that visibly heals as more pigs
 * come home. Decorations layer in by tier, the Heart Tree grows at the centre,
 * and the freed pigs wander, rest, and occasionally cheer together. Everything
 * is CSS/emoji/inline-SVG, guarded for reduced-motion and low-effects.
 */
export function SanctuaryScene({ save, tier, onHeartTree }: Props) {
  const freed: CaptivePig[] = SANCTUARY.filter((p) => save.freedPigs[p.id]);
  const cheerLogged = useRef(false);

  // Occasional ambient "group cheer": add a class that bounces the herd, then
  // remove it. Non-blocking; logs at most once per visit.
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (freed.length < 3 || document.body.classList.contains('reduced-motion')) return;
    const id = window.setInterval(() => {
      const el = rootRef.current;
      if (!el) return;
      el.classList.add('cheering');
      if (!cheerLogged.current) {
        telemetry.log('sanctuary_ambient_interaction');
        cheerLogged.current = true;
      }
      window.setTimeout(() => el.classList.remove('cheering'), 1200);
    }, 9000);
    return () => window.clearInterval(id);
  }, [freed.length]);

  // A few pigs get "stationed" ambient roles (by the fire, under the tree).
  const stationed = (i: number): string => {
    if (tier >= 1 && i === 0) return 'meadow-pig--fireside';
    if (tier >= 1 && i === 1) return 'meadow-pig--treeside';
    if (tier >= 2 && i === 2) return 'meadow-pig--flowers';
    return '';
  };

  return (
    <div ref={rootRef} className={`sanctuary-scene scene--t${tier}`}>
      {/* Sky glow / warmth grows with tier via CSS. */}
      <div className="scene-sky" aria-hidden="true" />

      {/* Fireflies at the top tier (skipped under low-effects). */}
      {tier >= 5 && (
        <div className="scene-fireflies" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} style={{ left: `${8 + i * 11}%`, animationDelay: `${i * 0.6}s` }} />
          ))}
        </div>
      )}

      {/* Fence line — broken at tier 0, mended from tier 1. */}
      <div className={`scene-fence ${tier >= 1 ? 'mended' : 'broken'}`} aria-hidden="true">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} className={tier === 0 && (i === 2 || i === 5) ? 'gap' : ''} />
        ))}
      </div>

      {/* Tier decorations. */}
      {DECOS.filter((d) => d.from <= tier).map((d, i) => (
        <span key={i} className={`scene-deco ${d.cls}`} style={d.style} aria-hidden="true">
          {d.icon}
        </span>
      ))}

      {/* The Heart Tree at the heart of it all. */}
      <div className="scene-tree">
        <HeartTree tier={tier} size={150} onClick={onHeartTree} />
      </div>

      {/* The freed herd. */}
      <div className="scene-herd">
        {freed.length === 0 ? (
          <p className="meadow-empty">The meadow is quiet. Rescue your first piggy to bring it home. 🐷</p>
        ) : (
          freed.map((p, i) => (
            <div
              key={p.id}
              className={`meadow-pig ${stationed(i)}`}
              style={{ animationDelay: `${(i % 8) * 0.2}s` }}
              title={p.name}
            >
              <PiggyAvatar type={p.type} color={p.color} size={38} expression="happy" pose="dance" />
            </div>
          ))
        )}
      </div>
    </div>
  );
}
