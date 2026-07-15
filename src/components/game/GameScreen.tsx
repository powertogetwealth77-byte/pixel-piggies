import { useCallback, useEffect, useRef, useState } from 'react';
import { useEngine } from '../../hooks/useEngine';
import type { LevelDef } from '../../engine/types';
import type { LevelReward, SaveData } from '../../save/save';
import { audio, vibrate } from '../../audio/audio';
import { PICTURE_CHAR } from '../../data/palette';
import { Board } from './Board';
import { Pens } from './Pens';
import { Stars } from '../ui/Stars';

interface Props {
  level: LevelDef;
  save: SaveData;
  onComplete: (reward: LevelReward) => void;
  onExit: (levelId: number) => void;
  onQuit: () => void;
  onToast: (msg: string) => void;
}

export function GameScreen({ level, onComplete, onExit, onQuit, onToast }: Props) {
  const { engine, snapshot: snap } = useEngine(level);
  const [shakeClass, setShakeClass] = useState('');
  const [comboBump, setComboBump] = useState(false);
  const [showFeverBanner, setShowFeverBanner] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(audio.muted);

  const lastLaunchId = useRef(-1);
  const prevFever = useRef(false);
  const completedRef = useRef(false);
  const [result, setResult] = useState<null | { won: boolean; reward: LevelReward }>(null);

  // Start engine + music.
  useEffect(() => {
    engine.start();
    audio.startMusic();
    return () => audio.stopMusic();
  }, [engine]);

  // React to launches: sounds, haptics, screen shake, combo bump.
  useEffect(() => {
    const l = snap.lastLaunch;
    if (!l || l.id === lastLaunchId.current) return;
    lastLaunchId.current = l.id;

    if (l.fizzle) {
      audio.fizzle();
      vibrate(30);
      return;
    }
    const big = l.cleared.length >= 5 || l.comboAfter >= 8;
    audio.pop(l.comboAfter, big);
    if (l.shake > 0.55) {
      setShakeClass('shake-big');
      vibrate([20, 30, 40]);
    } else {
      setShakeClass('shake');
      vibrate(l.cleared.length > 2 ? 25 : 12);
    }
    window.setTimeout(() => setShakeClass(''), 440);
    setComboBump(true);
    window.setTimeout(() => setComboBump(false), 250);
  }, [snap.lastLaunch]);

  // Fever start / end feedback.
  useEffect(() => {
    if (snap.feverActive && !prevFever.current) {
      audio.feverStart();
      setShowFeverBanner(true);
      vibrate([40, 40, 40, 40]);
      window.setTimeout(() => setShowFeverBanner(false), 1400);
    } else if (!snap.feverActive && prevFever.current) {
      audio.feverEnd();
    }
    prevFever.current = snap.feverActive;
  }, [snap.feverActive]);

  // Win / loss resolution.
  useEffect(() => {
    if (completedRef.current) return;
    if (snap.phase === 'won') {
      completedRef.current = true;
      const stars = engine.stars();
      const coins = engine.coins();
      const reward: LevelReward = {
        levelId: level.id,
        stars,
        score: snap.score,
        coins,
        pigment: level.pigment,
      };
      onComplete(reward);
      audio.win();
      vibrate([60, 40, 80]);
      setResult({ won: true, reward });
    } else if (snap.phase === 'lost') {
      completedRef.current = true;
      audio.lose();
      vibrate(200);
      setResult({ won: false, reward: { levelId: level.id, stars: 0, score: snap.score, coins: 0, pigment: 0 } });
    }
  }, [snap.phase, engine, level, snap.score, onComplete]);

  const launch = useCallback(
    (lane: number) => {
      if (snap.phase !== 'playing') return;
      let slot = snap.selectedPen;
      if (slot == null || !snap.pens[slot]) {
        slot = snap.pens.findIndex((p) => p && !(p.type === 'prism' && snap.prismUsed));
        if (slot < 0) {
          onToast('No piggy ready!');
          return;
        }
      }
      audio.launch();
      engine.launchLane(lane, slot);
    },
    [engine, snap.phase, snap.selectedPen, snap.pens, snap.prismUsed, onToast],
  );

  const doPause = () => {
    engine.pause();
    setPaused(true);
  };
  const doResume = () => {
    engine.resume();
    setPaused(false);
  };
  const restart = () => {
    onToast('Restarting…');
    // Re-mount via key handled by parent; here we simply reload the level.
    completedRef.current = false;
    setResult(null);
    setPaused(false);
    onExitToRestart();
  };
  // Parent supplies a fresh key on level change; to restart we bounce out & in.
  const onExitToRestart = () => {
    window.setTimeout(() => onQuit(), 0);
  };

  const selectedPiggy =
    snap.selectedPen != null ? snap.pens[snap.selectedPen] : snap.pens.find((p) => p) ?? null;

  const toggleMute = () => setMuted(audio.toggleMute());

  return (
    <div className={`game ${shakeClass}`}>
      {/* HUD */}
      <div className="hud">
        <div className="hud-top">
          <button className="icon-btn" onClick={doPause} aria-label="Pause">
            ⏸
          </button>
          <div className="objective">
            {level.name}
            <small>
              Clear {snap.blocksRemaining} / {snap.blocksTotal} pixels · Reveal the {level.pictureName}
            </small>
          </div>
          <button className="icon-btn" onClick={toggleMute} aria-label="Toggle sound">
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        <div className="meters">
          <div className={`fever-wrap ${snap.feverActive ? 'active' : ''}`}>
            <div
              className="fever-fill"
              style={{ width: `${snap.feverActive ? 100 : snap.fever}%` }}
            />
            <span className="fever-label">
              {snap.feverActive ? `FEVER ${Math.ceil(snap.feverMsLeft / 1000)}s` : 'FEVER'}
            </span>
          </div>
          <div className={`combo-badge ${comboBump ? 'bump' : ''}`}>
            {snap.combo > 0 ? `${snap.combo} · x${snap.multiplier}` : `x${snap.multiplier}`}
          </div>
        </div>
      </div>

      {/* Board */}
      <Board
        snap={snap}
        onLaunch={launch}
        launchColor={selectedPiggy?.color ?? 'coral'}
        launchType={selectedPiggy?.type ?? 'pip'}
      />

      {/* Pens + queue */}
      <Pens snap={snap} onSelect={(slot) => { audio.select(); engine.selectPen(slot); }} />

      {/* Banners */}
      {showFeverBanner && <div className="fever-banner">PIGGY FEVER!</div>}
      {snap.closeCall && snap.phase === 'playing' && !snap.feverActive && (
        <div className="close-call">Pens almost full!</div>
      )}

      {/* Pause overlay */}
      {paused && !result && (
        <div className="overlay">
          <div className="dialog">
            <h2>Paused</h2>
            <button className="btn btn--primary btn--block" onClick={doResume}>
              ▶ Resume
            </button>
            <button className="btn btn--ghost btn--block" onClick={restart}>
              ↻ Restart
            </button>
            <div className="settings-row" style={{ borderBottom: 'none' }}>
              <span>🔊 Sound</span>
              <button className={`toggle ${!muted ? 'on' : ''}`} onClick={toggleMute}>
                <span className="knob" />
              </button>
            </div>
            <button className="btn btn--coral btn--block" onClick={onQuit}>
              ✕ Quit to Levels
            </button>
          </div>
        </div>
      )}

      {/* Result overlay */}
      {result && (
        <ResultDialog
          level={level}
          result={result}
          onNext={() => onExit(level.id)}
          onRetry={restart}
        />
      )}
    </div>
  );
}

function ResultDialog({
  level,
  result,
  onNext,
  onRetry,
}: {
  level: LevelDef;
  result: { won: boolean; reward: LevelReward };
  onNext: () => void;
  onRetry: () => void;
}) {
  const { won, reward } = result;
  const width = level.picture[0].length;

  if (!won) {
    return (
      <div className="overlay">
        <div className="dialog">
          <h2>Pens Overflowed!</h2>
          <p className="big">😅</p>
          <p style={{ fontWeight: 800, margin: 0 }}>So close! Launch faster next time.</p>
          <button className="btn btn--primary btn--block" onClick={onRetry}>
            ↻ Try Again
          </button>
          <button className="btn btn--ghost btn--block" onClick={onNext}>
            Levels
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="overlay">
      <div className="dialog">
        <h2>Level Complete!</h2>
        <Stars value={reward.stars} size={40} animate />
        <div
          className="picture-reveal"
          style={{ gridTemplateColumns: `repeat(${width}, 14px)` }}
        >
          {level.picture.flatMap((row, r) =>
            row.split('').map((ch, c) => {
              const color = PICTURE_CHAR[ch] ?? 'transparent';
              return (
                <div
                  key={`${r},${c}`}
                  className="pr-cell"
                  style={{ width: 14, height: 14, background: color }}
                />
              );
            }),
          )}
        </div>
        <p style={{ fontWeight: 900, margin: 0 }}>You revealed the {level.pictureName}!</p>
        <div className="reward-row">
          <span>🏆 {reward.score}</span>
          <span>🪙 {reward.coins}</span>
          <span>🎨 {reward.pigment}</span>
        </div>
        <button className="btn btn--primary btn--block" onClick={onNext}>
          Continue →
        </button>
        <button className="btn btn--ghost btn--block" onClick={onRetry}>
          ↻ Replay
        </button>
      </div>
    </div>
  );
}
