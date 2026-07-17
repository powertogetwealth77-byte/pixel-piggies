import type { SaveData } from '../../save/save';
import { totalStars, freedPigCount } from '../../save/save';
import { SANCTUARY_COUNT } from '../../data/sanctuary';
import { sanctuaryTier, nextSanctuaryTier } from '../../data/story';
import { telemetry } from '../../telemetry/telemetry';
import { PIGGIES } from '../../data/piggies';
import { PiggyAvatar } from '../ui/PiggyAvatar';
import type { ColorId, PiggyType } from '../../engine/types';

interface Props {
  save: SaveData;
  onPlay: () => void;
  onLevels: () => void;
  onKingdom: () => void;
  onSanctuary: () => void;
  onSettings: () => void;
  onStory: () => void;
}

const HERO_COLORS: Record<PiggyType, ColorId> = {
  pip: 'coral',
  mochi: 'sky',
  blaze: 'sunny',
  prism: 'grape',
};

export function MainMenu({ save, onPlay, onKingdom, onSanctuary, onSettings, onStory }: Props) {
  const stars = totalStars(save);
  const freed = freedPigCount(save);
  const tier = sanctuaryTier(freed);
  const next = nextSanctuaryTier(freed);
  const tierPct = next
    ? Math.round(((freed - tier.min) / (next.tier.min - tier.min)) * 100)
    : 100;
  return (
    <div className="screen screen--menu">
      <div className="menu-hero">
        <h1 className="title">
          <span>Pixel</span> <span className="title-accent">Piggies</span>
        </h1>
        <p className="subtitle">Bring the lost herd home. 🐷💛</p>
      </div>

      <div className="char-cards">
        {(Object.keys(PIGGIES) as PiggyType[]).map((t, i) => (
          <div className="char-card" key={t} style={{ animationDelay: `${i * 0.08}s` }}>
            <PiggyAvatar
              type={t}
              color={HERO_COLORS[t]}
              size={74}
              expression="happy"
              pose="breathe"
            />
            <b>{PIGGIES[t].name}</b>
            <small>{PIGGIES[t].power}</small>
          </div>
        ))}
      </div>

      <div className="how">
        <div>
          <b>1</b>Choose Piggy
        </div>
        <div>
          <b>2</b>Choose Lane
        </div>
        <div>
          <b>3</b>Blast Match
        </div>
        <div>
          <b>4</b>Reveal Art
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'center', gap: 16 }}>
        <span className="pill">⭐ {stars}</span>
        <span className="pill">🪙 {save.coins}</span>
        <span className="pill">🎨 {save.pigment}</span>
      </div>

      <button
        className="sanctuary-status"
        onClick={() => {
          telemetry.log('sanctuary_status_clicked');
          onSanctuary();
        }}
      >
        <span className="ss-tree" aria-hidden="true">🌳</span>
        <span className="ss-body">
          <b>Sanctuary · {tier.title}</b>
          <span className="ss-bar"><span style={{ width: `${tierPct}%` }} /></span>
          <small>
            🐷 {freed}/{SANCTUARY_COUNT} home
            {next ? ` · ${next.need} more to “${next.tier.title}”` : ' · fully restored ✨'}
          </small>
        </span>
        <span className="ss-go" aria-hidden="true">›</span>
      </button>

      <div className="menu-actions">
        <button className="btn btn--primary btn--block" onClick={onPlay}>
          ▶ Play
        </button>
        <button className="btn btn--coral btn--block" onClick={onSanctuary}>
          🐷 Rescue Sanctuary
        </button>
        <div className="row">
          <button className="btn btn--mint btn--block" onClick={onKingdom}>
            🏰 Kingdom
          </button>
          <button className="btn btn--ghost btn--block" onClick={onStory}>
            📖 Story
          </button>
          <button className="btn btn--ghost btn--block" onClick={onSettings}>
            ⚙ Settings
          </button>
        </div>
      </div>
    </div>
  );
}
