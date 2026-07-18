import { useEffect, useState } from 'react';
import { audio } from '../../audio/audio';
import { telemetry } from '../../telemetry/telemetry';
import {
  CHARACTERS,
  RARITY_META,
  RARITY_ORDER,
  PIG_BY_ID,
  type PigCharacter,
} from '../../data/sanctuary';
import {
  collectionStats,
  pigState,
  masteryEligible,
  masteryClaimedLevel,
  masteryConditionText,
} from '../../data/book';
import { claimMasteryReward, type SaveData } from '../../save/save';
import { SHOP_PREVIEW } from '../../data/shop';
import { PigPortrait } from './PigPortrait';
import { SupplyCart } from './SupplyCart';

interface Props {
  save: SaveData;
  onBack: () => void;
  onSanctuary: () => void;
  onUpdate: (s: SaveData) => void;
  onToast: (msg: string) => void;
}

const MASTERY_LABEL = ['', 'Rescued', 'Settled In', 'Kingdom Hero'];

/**
 * The Piggy Book — the collectible roster of all 22 rescued pigs. Each entry is
 * hidden (silhouette + clue), discovered (name, cost, clue), or rescued (a full
 * character card with cosmetic mastery). Reachable from the menu, the Sanctuary,
 * and the rescue reveal.
 */
export function PiggyBook({ save, onBack, onSanctuary, onUpdate, onToast }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const stats = collectionStats(save);

  useEffect(() => {
    telemetry.log('piggy_book_opened');
  }, []);

  const open = (pig: PigCharacter, state: string) => {
    if (state === 'hidden') return;
    telemetry.log('pig_card_opened');
    setSelected(pig.id);
  };

  const claim = (pigId: string) => {
    const res = claimMasteryReward(save, pigId);
    if (!res) return;
    onUpdate(res.next);
    telemetry.log('pig_mastery_level_reached');
    telemetry.log('pig_mastery_reward_claimed');
    audio.star();
    const bonus = res.coins || res.tokens
      ? ` · ${res.coins ? `🪙 ${res.coins}` : ''}${res.tokens ? ` 🎟️ ${res.tokens}` : ''}`
      : '';
    onToast(`${PIG_BY_ID[pigId].name} — ${MASTERY_LABEL[res.level]}!${bonus}`);
  };

  const sel = selected ? PIG_BY_ID[selected] : null;

  return (
    <div className="screen">
      <div className="row row--between">
        <button className="icon-btn" onClick={onBack} aria-label="Back">‹</button>
        <h2 style={{ margin: 0 }}>The Piggy Book</h2>
        <div className="row" style={{ gap: 6 }}>
          {SHOP_PREVIEW && (
            <button className="icon-btn" onClick={() => setCartOpen(true)} aria-label="Piggy Supply Cart">🛒</button>
          )}
          <button className="icon-btn" onClick={onSanctuary} aria-label="Rescue Sanctuary">🐷</button>
        </div>
      </div>

      {/* Collection progress */}
      <div className="book-progress">
        <div className="bp-top">
          <b>{stats.rescued}/{stats.total} rescued</b>
          <span>{stats.pct}% complete</span>
        </div>
        <div className="bp-bar"><span style={{ width: `${stats.pct}%` }} /></div>
        <div className="bp-counts">
          <span>💚 {stats.rescued} rescued</span>
          <span>🔎 {stats.discovered} found</span>
          <span>❔ {stats.hidden} hidden</span>
        </div>
        <div className="bp-rarity">
          {RARITY_ORDER.map((r) => (
            <span key={r} className={`rarity-chip rarity-${r}`} title={RARITY_META[r].label}>
              {RARITY_META[r].label} {stats.byRarity[r].rescued}/{stats.byRarity[r].total}
            </span>
          ))}
        </div>
      </div>

      {/* The 22 entries */}
      <div className="book-grid">
        {CHARACTERS.map((pig) => {
          const state = pigState(save, pig.id);
          return (
            <button
              key={pig.id}
              className={`book-card state-${state} rarity-${pig.rarity}`}
              onClick={() => open(pig, state)}
              disabled={state === 'hidden'}
            >
              {state === 'hidden' ? (
                <>
                  <div className="book-silhouette" aria-hidden="true">
                    <PigPortrait pig={pig} size={52} state="hidden" showAccessory={false} />
                  </div>
                  <b>???</b>
                  <small>{pig.discoveryClue}</small>
                </>
              ) : (
                <>
                  <PigPortrait pig={pig} size={52} state={state} />
                  <b>{state === 'discovered' ? pig.name : pig.name}</b>
                  {state === 'rescued' ? (
                    <small className={`rarity-text rarity-${pig.rarity}`}>{RARITY_META[pig.rarity].label}</small>
                  ) : (
                    <small className="book-cost">
                      {pig.cost.tokens != null ? `🎟️ ${pig.cost.tokens}` : `🪙 ${pig.cost.coins}`}
                    </small>
                  )}
                </>
              )}
            </button>
          );
        })}
      </div>

      {/* Character detail card */}
      {sel && (
        <div className="overlay" onClick={() => setSelected(null)}>
          <div className={`dialog pig-card rarity-${sel.rarity}`} onClick={(e) => e.stopPropagation()}>
            <PigCardBody
              pig={sel}
              save={save}
              rescued={!!save.freedPigs[sel.id]}
              onClaim={() => claim(sel.id)}
              onSanctuary={onSanctuary}
            />
            <button className="btn btn--primary btn--block" onClick={() => setSelected(null)}>Close</button>
          </div>
        </div>
      )}

      {cartOpen && <SupplyCart onClose={() => setCartOpen(false)} />}
    </div>
  );
}

function PigCardBody({
  pig,
  save,
  rescued,
  onClaim,
  onSanctuary,
}: {
  pig: PigCharacter;
  save: SaveData;
  rescued: boolean;
  onClaim: () => void;
  onSanctuary: () => void;
}) {
  const no = CHARACTERS.findIndex((c) => c.id === pig.id) + 1;

  if (!rescued) {
    // Discovered but not yet rescued.
    return (
      <>
        <PigPortrait pig={pig} size={96} state="discovered" />
        <span className={`rarity-tag rarity-${pig.rarity}`}>{RARITY_META[pig.rarity].label}</span>
        <h2 style={{ margin: '2px 0' }}>{pig.name}</h2>
        <p className="pig-title">{pig.title}</p>
        <p className="pig-clue">🔎 {pig.discoveryClue}</p>
        <p className="pig-cost-line">
          Rescue cost: {pig.cost.tokens != null ? `🎟️ ${pig.cost.tokens} tokens` : `🪙 ${pig.cost.coins} coins`}
        </p>
        <button className="btn btn--mint btn--block" onClick={onSanctuary}>🐷 Visit the Sanctuary</button>
      </>
    );
  }

  const claimed = masteryClaimedLevel(save, pig.id);
  const eligible = masteryEligible(save, pig.id);
  const canClaim = eligible > claimed;
  const rels = pig.relationshipIds.map((id) => PIG_BY_ID[id]?.name).filter(Boolean);

  return (
    <>
      <PigPortrait pig={pig} size={96} state="rescued" glow />
      <span className={`rarity-tag rarity-${pig.rarity}`}>{RARITY_META[pig.rarity].label}</span>
      <h2 style={{ margin: '2px 0' }}>{pig.name}</h2>
      <p className="pig-title">{pig.title} · No. {no}/{CHARACTERS.length}</p>

      <div className="pig-facts">
        <div><b>Role</b><span>{pig.role}</span></div>
        <div><b>Personality</b><span>{pig.personality}</span></div>
        <div><b>Favorite food</b><span>{pig.favoriteFood}</span></div>
        <div><b>Home</b><span>{pig.sanctuaryLocation}</span></div>
      </div>

      <p className="pig-bio">{pig.biography}</p>
      {pig.story && <p className="pig-memory">💛 {pig.story}</p>}
      <p className="pig-voice">“{pig.rescueLine}”</p>
      {rels.length > 0 && <p className="pig-rels">🤝 Close to {rels.join(', ')}</p>}

      {/* Cosmetic mastery */}
      <div className="mastery">
        <div className="mastery-track">
          {[1, 2, 3].map((lvl) => (
            <span key={lvl} className={`mastery-dot ${claimed >= lvl ? 'on' : ''} ${eligible >= lvl && claimed < lvl ? 'ready' : ''}`}>
              {lvl}
            </span>
          ))}
        </div>
        <small className="mastery-label">
          {MASTERY_LABEL[claimed]}
          {claimed < 3 && ` · Next: ${masteryConditionText(claimed + 1)}`}
        </small>
        {canClaim && (
          <button className="btn btn--primary btn--sm" onClick={onClaim}>
            ✨ Claim {MASTERY_LABEL[eligible]}
          </button>
        )}
      </div>
    </>
  );
}
