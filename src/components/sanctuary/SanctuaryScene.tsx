import { useEffect, useRef, useState } from 'react';
import { SANCTUARY, type CaptivePig } from '../../data/sanctuary';
import {
  PERIODS,
  PERIOD_ORDER,
  startPeriodIndex,
  pickAmbient,
  activeRelationships,
  currentRequest,
  type Activity,
  type SanctuaryPeriod,
} from '../../data/life';
import { telemetry } from '../../telemetry/telemetry';
import { PiggyAvatar } from '../ui/PiggyAvatar';
import { HeartTree } from './HeartTree';
import type { SaveData } from '../../save/save';
import type { Quest } from '../../data/life';

interface Props {
  save: SaveData;
  tier: number;
  onHeartTree: () => void;
  onOpenQuest: (quest: Quest) => void;
}

interface Deco {
  from: number;
  icon: string;
  cls: string;
  style: React.CSSProperties;
}

const DECOS: Deco[] = [
  { from: 1, icon: '🔥', cls: 'deco-fire', style: { left: '20%', bottom: '20%' } },
  { from: 1, icon: '🌸', cls: 'deco-flower', style: { left: '12%', bottom: '9%' } },
  { from: 1, icon: '🦋', cls: 'deco-butterfly', style: { left: '30%', top: '30%' } },
  { from: 2, icon: '🥖', cls: 'deco-bakery', style: { right: '14%', bottom: '19%' } },
  { from: 2, icon: '🌷', cls: 'deco-flower', style: { right: '24%', bottom: '9%' } },
  { from: 2, icon: '🪑', cls: 'deco-bench', style: { left: '40%', bottom: '11%' } },
  { from: 3, icon: '🏠', cls: 'deco-home', style: { left: '8%', bottom: '19%' } },
  { from: 3, icon: '🏮', cls: 'deco-lantern', style: { left: '54%', top: '16%' } },
  { from: 3, icon: '🏮', cls: 'deco-lantern', style: { right: '30%', top: '22%' } },
  { from: 3, icon: '🌾', cls: 'deco-garden', style: { right: '10%', bottom: '10%' } },
  { from: 3, icon: '🌼', cls: 'deco-flower', style: { left: '26%', bottom: '8%' } },
  { from: 4, icon: '🏫', cls: 'deco-school', style: { right: '6%', bottom: '30%' } },
  { from: 4, icon: '🎪', cls: 'deco-market', style: { left: '6%', bottom: '31%' } },
  { from: 4, icon: '🌉', cls: 'deco-bridge', style: { left: '46%', bottom: '6%' } },
  { from: 4, icon: '🐦', cls: 'deco-bird', style: { right: '38%', top: '12%' } },
  { from: 5, icon: '🏰', cls: 'deco-castle', style: { left: '50%', top: '6%' } },
  { from: 5, icon: '🎉', cls: 'deco-banner', style: { left: '18%', top: '10%' } },
  { from: 5, icon: '🎊', cls: 'deco-banner', style: { right: '18%', top: '10%' } },
  { from: 5, icon: '🌈', cls: 'deco-rainbow', style: { right: '8%', top: '4%' } },
];

/**
 * The living Sanctuary scene. Beyond the tier decorations and Heart Tree, the
 * rescued pigs now go about character-specific ambient behaviours on a gentle
 * day cycle (morning → afternoon → evening → celebration). A capped scheduler
 * animates at most a few pigs at once for performance; related pigs share small
 * interactions; and one pig may raise a request bubble linking to its quest.
 * All motion pauses when the tab is hidden and stills under reduced-motion.
 */
export function SanctuaryScene({ save, tier, onHeartTree, onOpenQuest }: Props) {
  const freed: CaptivePig[] = SANCTUARY.filter((p) => save.freedPigs[p.id]);
  const freedIds = freed.map((p) => p.id);
  const reduced = typeof document !== 'undefined' && document.body.classList.contains('reduced-motion');

  const [periodIdx, setPeriodIdx] = useState(() => startPeriodIndex(save));
  const [tick, setTick] = useState(0);
  const period: SanctuaryPeriod = PERIOD_ORDER[periodIdx % PERIOD_ORDER.length];

  const relLogged = useRef(false);

  // Gentle timers drive the day cycle and the ambient rotation. They pause when
  // the tab is hidden and don't run at all under reduced motion.
  useEffect(() => {
    if (reduced || freedIds.length === 0) return;
    const ambient = window.setInterval(() => {
      if (document.hidden) return;
      setTick((t) => t + 1);
    }, 3600);
    const cycle = window.setInterval(() => {
      if (document.hidden) return;
      setPeriodIdx((p) => (p + 1) % PERIOD_ORDER.length);
    }, 16000);
    return () => {
      window.clearInterval(ambient);
      window.clearInterval(cycle);
    };
  }, [reduced, freedIds.length]);

  // The capped set of pigs performing a behaviour this tick (≤4).
  const ambient = pickAmbient(freedIds, period, tick, 4);
  const activeMap = new Map<string, Activity>(ambient.map((a) => [a.pigId, a.activity]));

  // A rotating relationship caption (both pigs rescued).
  const rels = activeRelationships(save);
  const rel = rels.length ? rels[tick % rels.length] : null;
  useEffect(() => {
    if (rel && !relLogged.current) {
      telemetry.log('relationship_interaction_viewed');
      relLogged.current = true;
    }
  }, [rel]);

  // One optional request bubble (never more than one at a time).
  const request = currentRequest(save);
  const requestPig = request ? freed.find((p) => p.id === request.pigId) : null;

  return (
    <div className={`sanctuary-scene scene--t${tier} period-${period}`}>
      <div className="scene-sky" aria-hidden="true" />

      {/* Day-cycle chip */}
      {freed.length > 0 && (
        <span className="scene-period" aria-label={`${PERIODS[period].label} in the Sanctuary`}>
          {PERIODS[period].icon} {PERIODS[period].label}
        </span>
      )}

      {tier >= 5 && (
        <div className="scene-fireflies" aria-hidden="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <span key={i} style={{ left: `${8 + i * 11}%`, animationDelay: `${i * 0.6}s` }} />
          ))}
        </div>
      )}

      <div className={`scene-fence ${tier >= 1 ? 'mended' : 'broken'}`} aria-hidden="true">
        {Array.from({ length: 7 }).map((_, i) => (
          <span key={i} className={tier === 0 && (i === 2 || i === 5) ? 'gap' : ''} />
        ))}
      </div>

      {DECOS.filter((d) => d.from <= tier).map((d, i) => (
        <span key={i} className={`scene-deco ${d.cls}`} style={d.style} aria-hidden="true">
          {d.icon}
        </span>
      ))}

      <div className="scene-tree">
        <HeartTree tier={tier} size={150} onClick={onHeartTree} />
      </div>

      {/* Rotating relationship caption */}
      {rel && (
        <div className="scene-rel" key={`${rel.a}-${rel.b}-${tick}`}>
          🤝 {rel.a[0].toUpperCase() + rel.a.slice(1)} &amp; {rel.b[0].toUpperCase() + rel.b.slice(1)} {rel.interaction}
        </div>
      )}

      {/* The freed herd, each doing a little something */}
      <div className="scene-herd">
        {freed.length === 0 ? (
          <p className="meadow-empty">The meadow is quiet. Rescue your first piggy to bring it home. 🐷</p>
        ) : (
          freed.map((p, i) => {
            const act = activeMap.get(p.id);
            const isRequest = requestPig?.id === p.id;
            return (
              <div
                key={p.id}
                className={`meadow-pig ${act ? 'busy' : ''}`}
                style={{ animationDelay: `${(i % 8) * 0.2}s` }}
                title={p.name}
              >
                {isRequest && request ? (
                  <button
                    className="request-bubble"
                    onClick={() => { telemetry.log('sanctuary_request_opened'); onOpenQuest(request); }}
                  >
                    💬
                  </button>
                ) : act ? (
                  <span className="pig-bubble" aria-hidden="true">{act.icon}</span>
                ) : null}
                <PiggyAvatar type={p.type} color={p.color} size={38} expression="happy" pose={act ? 'dance' : 'breathe'} />
                {act && <span className="pig-action">{act.label}</span>}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
