import type { SaveData } from '../../save/save';
import { totalStars } from '../../save/save';
import { PIGGIES } from '../../data/piggies';
import { PiggyAvatar } from '../ui/PiggyAvatar';
import type { ColorId, PiggyType } from '../../engine/types';

interface Props {
  save: SaveData;
  onPlay: () => void;
  onLevels: () => void;
  onKingdom: () => void;
  onSettings: () => void;
}

const HERO_COLORS: Record<PiggyType, ColorId> = {
  pip: 'coral',
  mochi: 'sky',
  blaze: 'sunny',
  prism: 'grape',
};

export function MainMenu({ save, onPlay, onKingdom, onSettings }: Props) {
  const stars = totalStars(save);
  return (
    <div className="screen screen--menu">
      <div className="menu-hero">
        <h1 className="title">
          <span>Pixel</span> <span className="title-accent">Piggies</span>
        </h1>
        <p className="subtitle">Launch, match &amp; reveal!</p>
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

      <div className="menu-actions">
        <button className="btn btn--primary btn--block" onClick={onPlay}>
          ▶ Play
        </button>
        <div className="row">
          <button className="btn btn--mint btn--block" onClick={onKingdom}>
            🏰 Kingdom
          </button>
          <button className="btn btn--ghost btn--block" onClick={onSettings}>
            ⚙ Settings
          </button>
        </div>
      </div>
    </div>
  );
}
