import { useEffect, useState } from 'react';
import { audio } from '../../audio/audio';
import { telemetry } from '../../telemetry/telemetry';
import { SANCTUARY, SANCTUARY_COUNT, PIG_BY_ID, type CaptivePig } from '../../data/sanctuary';
import {
  sanctuaryTier,
  nextSanctuaryTier,
  earnedRevealTiers,
  SANCTUARY_TIERS,
} from '../../data/story';
import { canAffordPig, freePig, freedPigCount, markPigRevealViewed, type SaveData } from '../../save/save';
import { PiggyAvatar } from '../ui/PiggyAvatar';
import { SanctuaryScene } from './SanctuaryScene';
import { RestorationReveal } from './RestorationReveal';
import { RescueReveal } from '../book/RescueReveal';

interface Props {
  save: SaveData;
  onBack: () => void;
  onBook: () => void;
  onUpdate: (s: SaveData) => void;
  onToast: (msg: string) => void;
}

/**
 * The Rescue Sanctuary — spend coins & Rescue Tokens to set captive piggies
 * free. The scene visibly heals across six restoration tiers as the herd comes
 * home, each crossing marked by a one-time reveal (replayable from Restoration
 * Memories). The Heart Tree at the centre is the running progress symbol.
 */
export function SanctuaryScreen({ save, onBack, onBook, onUpdate, onToast }: Props) {
  const [revealId, setRevealId] = useState<string | null>(null); // rescued pig awaiting reveal
  const [memoryTier, setMemoryTier] = useState<number | null>(null); // replayed reveal
  const [treePanel, setTreePanel] = useState(false);
  const [showMemories, setShowMemories] = useState(false);

  const freed = freedPigCount(save);
  const tier = sanctuaryTier(freed);
  const next = nextSanctuaryTier(freed);

  useEffect(() => {
    telemetry.sanctuaryVisit();
  }, []);

  // The lowest restoration tier the player has earned but not yet seen revealed.
  const pendingRevealN = earnedRevealTiers(freed).find((n) => !save.story.sanctuaryReveals[n]);
  const pendingReveal = pendingRevealN != null ? SANCTUARY_TIERS[pendingRevealN] : undefined;

  const markRevealViewed = (n: number) => {
    onUpdate({
      ...save,
      story: { ...save.story, sanctuaryReveals: { ...save.story.sanctuaryReveals, [n]: true } },
    });
  };

  const rescue = (pig: CaptivePig) => {
    const nextSave = freePig(save, pig);
    if (!nextSave) {
      const need = pig.cost.tokens != null ? `${pig.cost.tokens} tokens` : `${pig.cost.coins} coins`;
      onToast(`Need ${need} to free ${pig.name}`);
      audio.fizzle();
      return;
    }
    telemetry.log('pig_rescue_started');
    onUpdate(nextSave);
    telemetry.pigFreed();
    audio.squeal();
    setRevealId(pig.id); // the character reveal handles its own sounds
  };

  // When a rescue reveal closes: mark it viewed, then surface any rescue-chain
  // clue this pig gives about another (never auto-rescuing them).
  const finishReveal = (pigId: string) => {
    onUpdate(markPigRevealViewed(save, pigId));
    setRevealId(null);
    const meta = PIG_BY_ID[pigId];
    if (meta?.revealsId && meta.chainClue && !save.freedPigs[meta.revealsId]) {
      telemetry.log('rescue_clue_unlocked');
      telemetry.log('pig_discovered');
      window.setTimeout(() => onToast(`🔎 ${meta.chainClue}`), 300);
    }
  };

  const openTree = () => {
    telemetry.log('heart_tree_opened');
    setTreePanel(true);
  };

  // Tiers whose reveal has been claimed, for the Restoration Memories list.
  const claimedTiers = SANCTUARY_TIERS.filter((t) => t.n >= 1 && save.story.sanctuaryReveals[t.n]);

  // A queued restoration reveal only shows once any character reveal has
  // cleared, so the two moments never overlap.
  const revealTier =
    memoryTier != null ? SANCTUARY_TIERS[memoryTier] : !revealId ? pendingReveal : undefined;
  const revealIsReplay = memoryTier != null;
  const revealPig = revealId ? PIG_BY_ID[revealId] : null;

  return (
    <div className="screen">
      <div className="row row--between">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h2 style={{ margin: 0 }}>Rescue Sanctuary</h2>
        <button className="icon-btn" onClick={onBook} aria-label="The Piggy Book">📖</button>
      </div>

      <div className="row" style={{ justifyContent: 'center', gap: 12 }}>
        <span className="pill">🐷 {freed}/{SANCTUARY_COUNT} freed</span>
        <span className="pill">🪙 {save.coins.toLocaleString()}</span>
        <span className="pill">🎟️ {save.rescueTokens}</span>
      </div>

      {/* Restoration narration — grows as the herd comes home. */}
      <div className="restore-banner">
        <b>🌳 {tier.title}</b>
        <p>{tier.line}</p>
      </div>

      {/* The living, healing Sanctuary. */}
      <SanctuaryScene save={save} tier={tier.n} onHeartTree={openTree} />

      {/* Progress + Restoration Memories */}
      <div className="row row--between sanctuary-tools">
        <span className="tier-progress">
          {next ? `${next.need} more to reach “${next.tier.title}”` : '✨ Fully restored'}
        </span>
        {claimedTiers.length > 0 && (
          <button className="btn btn--ghost btn--sm" onClick={() => setShowMemories(true)}>
            📖 Memories
          </button>
        )}
      </div>

      {/* Captive piggies to rescue */}
      <div className="captive-grid">
        {SANCTUARY.map((pig) => {
          const isFreed = !!save.freedPigs[pig.id];
          const afford = canAffordPig(save, pig);
          const token = pig.cost.tokens != null;
          return (
            <div key={pig.id} className={`captive ${isFreed ? 'freed' : ''} ${token ? 'golden' : ''}`}>
              <div className="captive-avatar">
                <PiggyAvatar
                  type={pig.type}
                  color={pig.color}
                  size={52}
                  expression={isFreed ? 'happy' : 'sad'}
                  pose={isFreed ? 'breathe' : 'none'}
                />
                {!isFreed && (
                  <svg className="captive-bars" viewBox="0 0 100 100" aria-hidden="true">
                    {[20, 40, 60, 80].map((x) => (
                      <rect key={x} x={x - 2.5} y="6" width="5" height="88" rx="2.5" fill="#7c8a9c" />
                    ))}
                  </svg>
                )}
              </div>
              <b>{pig.name}</b>
              {isFreed ? (
                <span className="captive-done">💚 Free!</span>
              ) : (
                <button
                  className={`btn ${token ? 'btn--primary' : 'btn--mint'}`}
                  style={{ padding: '7px 10px', minHeight: 36, fontSize: '0.78rem', width: '100%' }}
                  disabled={!afford}
                  onClick={() => rescue(pig)}
                >
                  {token ? `🎟️ ${pig.cost.tokens}` : `🪙 ${pig.cost.coins}`}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Character rescue reveal */}
      {revealPig && (
        <RescueReveal
          key={revealPig.id}
          pig={revealPig}
          rescued={freed}
          total={SANCTUARY_COUNT}
          onDone={() => finishReveal(revealPig.id)}
          onOpenBook={() => { finishReveal(revealPig.id); onBook(); }}
        />
      )}

      {/* Heart Tree info panel */}
      {treePanel && (
        <div className="overlay" onClick={() => setTreePanel(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginBottom: 4 }}>🌳 The Great Heart Tree</h2>
            <p className="tree-tier-name">Tier {tier.n} · {tier.title}</p>
            <div className="tree-stats">
              <div><b>{freed}</b><small>rescued</small></div>
              <div><b>{SANCTUARY_COUNT - freed}</b><small>remaining</small></div>
              <div><b>{tier.n}/5</b><small>tier</small></div>
            </div>
            <p style={{ margin: '6px 0 0', fontWeight: 700, opacity: 0.9 }}>{tier.line}</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', opacity: 0.8 }}>
              {next ? `${next.need} more ${next.need === 1 ? 'piggy' : 'piggies'} to reach “${next.tier.title}.”` : 'Every piggy is home. The Heart Tree blazes gold. 💛'}
            </p>
            <button className="btn btn--primary btn--block" onClick={() => setTreePanel(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Restoration Memories — replay any claimed reveal */}
      {showMemories && (
        <div className="overlay" onClick={() => setShowMemories(false)}>
          <div className="dialog" onClick={(e) => e.stopPropagation()}>
            <h2>📖 Restoration Memories</h2>
            <p style={{ margin: 0, opacity: 0.8, fontSize: '0.85rem' }}>Relive how the Sanctuary healed.</p>
            <div className="memories-list">
              {claimedTiers.map((t) => (
                <button
                  key={t.n}
                  className="memory-row"
                  onClick={() => {
                    setShowMemories(false);
                    setMemoryTier(t.n);
                  }}
                >
                  <span className="memory-n">Tier {t.n}</span>
                  <span className="memory-title">{t.title}</span>
                  <span className="memory-go">▶</span>
                </button>
              ))}
            </div>
            <button className="btn btn--ghost btn--block" onClick={() => setShowMemories(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      {/* Restoration reveal (new tier, or a replayed memory) */}
      {revealTier && (
        <RestorationReveal
          key={`${revealTier.n}:${revealIsReplay ? 'replay' : 'new'}`}
          tier={revealTier}
          replay={revealIsReplay}
          onDone={() => {
            if (revealIsReplay) setMemoryTier(null);
            else markRevealViewed(revealTier.n);
          }}
        />
      )}
    </div>
  );
}
