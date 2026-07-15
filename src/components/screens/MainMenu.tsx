import type { SaveData } from '../../save/save';
import { totalStars } from '../../save/save';
import { PiggyAvatar } from '../ui/PiggyAvatar';

interface Props {
  save: SaveData;
  onPlay: () => void;
  onLevels: () => void;
  onKingdom: () => void;
  onSettings: () => void;
}

export function MainMenu({ save, onPlay, onKingdom, onSettings }: Props) {
  const stars = totalStars(save);
  return (
    <div className="screen">
      <div className="menu-hero">
        <h1 className="title">Pixel Piggies</h1>
        <p className="subtitle">Launch, match &amp; reveal!</p>
        <div className="menu-piggies">
          <PiggyAvatar type="pip" color="coral" size={70} expression="happy" />
          <PiggyAvatar type="mochi" color="sky" size={70} expression="happy" />
          <PiggyAvatar type="blaze" color="sunny" size={70} expression="happy" />
          <PiggyAvatar type="prism" color="grape" size={70} expression="happy" />
        </div>
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
