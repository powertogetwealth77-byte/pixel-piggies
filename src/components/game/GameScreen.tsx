import { useCallback, useEffect, useRef, useState } from 'react';
import { useEngine } from '../../hooks/useEngine';
import type { LevelDef } from '../../engine/types';
import type { LevelReward, SaveData } from '../../save/save';
import { audio, vibrate } from '../../audio/audio';
import { PICTURE_CHAR } from '../../data/palette';
import { PIGGIES } from '../../data/piggies';
import { LEVELS } from '../../data/levels';
import { ITEMS } from '../../data/items';
import { telemetry } from '../../telemetry/telemetry';
import { buyItem, itemAvailable, useItem } from '../../save/save';
import type { ItemId } from '../../engine/types';
import { Board } from './Board';
import { Pens } from './Pens';
import { TideMeter } from './TideMeter';
import { ItemBar } from './ItemBar';
import { Stars } from '../ui/Stars';
import { PiggyAvatar } from '../ui/PiggyAvatar';

interface Props {
  level: LevelDef;
  save: SaveData;
  onComplete: (reward: LevelReward) => void;
  onExit: (levelId: number) => void;
  onQuit: () => void;
  onRestart: () => void;
  onKingdom: () => void;
  onUpdateSave: (s: SaveData) => void;
  onToast: (msg: string) => void;
}

const STAGE_NUM: Record<string, number> = { calm: 1, building: 2, critical: 3 };

/** Escalating combo milestone callouts. */
const PRAISE = [
  { at: 8, text: 'Great!' },
  { at: 16, text: 'Amazing!' },
  { at: 24, text: 'PIGGYLICIOUS!' },
];

export type PenMood = 'idle' | 'sad' | 'happy' | 'wow';

export function GameScreen({ level, save, onComplete, onExit, onQuit, onRestart, onKingdom, onUpdateSave, onToast }: Props) {
  const fxMode = save.settings.reducedMotion ? 'off' : save.settings.lowEffects ? 'reduced' : 'full';
  const { engine, snapshot: snap } = useEngine(level);
  const [shakeClass, setShakeClass] = useState('');
  const [comboBump, setComboBump] = useState(false);
  const [showFeverBanner, setShowFeverBanner] = useState(false);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(audio.muted);
  const [praise, setPraise] = useState<{ text: string; tier: number } | null>(null);
  const [mood, setMood] = useState<PenMood>('idle');
  const [leanLane, setLeanLane] = useState<number | null>(null);
  const [glitching, setGlitching] = useState(false);
  const [relaxed, setRelaxed] = useState(save.settings.relaxedMode);
  const saveRef = useRef(save);
  saveRef.current = save;
  const moodTimer = useRef(0);

  const setMoodFor = useCallback((m: PenMood, ms: number) => {
    setMood(m);
    window.clearTimeout(moodTimer.current);
    moodTimer.current = window.setTimeout(() => setMood('idle'), ms);
  }, []);

  const lastLaunchId = useRef(-1);
  const prevFever = useRef(false);
  const completedRef = useRef(false);
  const [result, setResult] = useState<null | {
    won: boolean;
    reward: LevelReward;
    lossReason?: 'overflow' | 'ammo' | 'tide';
  }>(null);

  // Start engine + music; record the attempt locally.
  useEffect(() => {
    engine.setRelaxed(relaxed);
    engine.start();
    audio.startMusic();
    audio.setMusicState('playful');
    telemetry.levelStart(level.id);
    if (relaxed) telemetry.relaxedRun();
    return () => audio.stopMusic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engine, level.id]);

  // Adaptive music: state follows Fever, then the Tide stage.
  useEffect(() => {
    if (snap.feverActive) audio.setMusicState('fever');
    else if (!snap.tideEnabled) audio.setMusicState('playful');
    else audio.setMusicState(snap.tideStage === 'critical' ? 'critical' : snap.tideStage === 'building' ? 'building' : 'playful');
  }, [snap.feverActive, snap.tideEnabled, snap.tideStage]);

  // Tide stage telemetry + a soft warning shimmer entering Critical.
  const prevStage = useRef(snap.tideStage);
  useEffect(() => {
    if (snap.tideEnabled) telemetry.tideStage(STAGE_NUM[snap.tideStage] ?? 0);
    if (snap.tideEnabled && snap.tideStage === 'critical' && prevStage.current !== 'critical' && !snap.feverActive) {
      audio.tideWarn();
      vibrate(30);
    }
    prevStage.current = snap.tideStage;
  }, [snap.tideStage, snap.tideEnabled, snap.feverActive]);

  // Glitch Strike feedback: glitch flash, wobble SFX, haptic, telemetry.
  const lastStrike = useRef(0);
  useEffect(() => {
    if (snap.lastStrikeId > lastStrike.current) {
      lastStrike.current = snap.lastStrikeId;
      audio.glitchStrike();
      telemetry.glitchStrike();
      vibrate([40, 60, 40]);
      setGlitching(true);
      window.setTimeout(() => setGlitching(false), 600);
    }
  }, [snap.lastStrikeId]);

  // Time restored on a match → sparkling bell + local stat.
  const lastRestoreLaunch = useRef(-1);
  useEffect(() => {
    const l = snap.lastLaunch;
    if (!l || l.id === lastRestoreLaunch.current) return;
    lastRestoreLaunch.current = l.id;
    if (snap.lastTimeRestored > 0) {
      telemetry.timeRestored(snap.lastTimeRestored);
      if (snap.lastTimeRestored >= 15) audio.timeRestore();
    }
  }, [snap.lastLaunch, snap.lastTimeRestored]);

  // React to launches: sounds, haptics, screen shake, combo bump.
  useEffect(() => {
    const l = snap.lastLaunch;
    if (!l || l.id === lastLaunchId.current) return;
    lastLaunchId.current = l.id;

    if (l.fizzle) {
      audio.fizzle();
      vibrate(30);
      setMoodFor('sad', 800);
      telemetry.fizzle(level.id);
      return;
    }
    const big = l.cleared.length >= 5 || l.comboAfter >= 8;
    if (big) setMoodFor('happy', 700);
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

  // Cascade chain feedback: rising jingle, haptic, shake per stage.
  const lastChainId = useRef(-1);
  useEffect(() => {
    const ch = snap.lastChain;
    if (!ch || ch.id === lastChainId.current) return;
    lastChainId.current = ch.id;
    audio.chain(ch.stage);
    setMoodFor('wow', 900);
    vibrate([15, 20, 15 + ch.stage * 8]);
    setShakeClass(ch.stage >= 3 ? 'shake-big' : 'shake');
    window.setTimeout(() => setShakeClass(''), 440);
    setComboBump(true);
    window.setTimeout(() => setComboBump(false), 250);
  }, [snap.lastChain]);

  // Fever start / end feedback.
  useEffect(() => {
    if (snap.feverActive && !prevFever.current) {
      audio.feverStart();
      setShowFeverBanner(true);
      setMoodFor('wow', 1400);
      telemetry.fever();
      // Igniting Fever in the Critical stage is a clutch save.
      if (snap.tideEnabled && snap.tideStage === 'critical') telemetry.feverSave();
      vibrate([40, 40, 40, 40]);
      window.setTimeout(() => setShowFeverBanner(false), 1400);
    } else if (!snap.feverActive && prevFever.current) {
      audio.feverEnd();
    }
    prevFever.current = snap.feverActive;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snap.feverActive]);

  // Combo milestone praise: fires once per milestone per combo run.
  const prevCombo = useRef(0);
  useEffect(() => {
    const c = snap.combo;
    if (c > prevCombo.current) {
      for (let tier = PRAISE.length - 1; tier >= 0; tier--) {
        const m = PRAISE[tier];
        if (c >= m.at && prevCombo.current < m.at) {
          setPraise({ text: m.text, tier });
          audio.praise(tier);
          vibrate(20 + tier * 15);
          window.setTimeout(() => setPraise((p) => (p?.text === m.text ? null : p)), 950);
          break;
        }
      }
    }
    prevCombo.current = c;
  }, [snap.combo]);

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
        bestCombo: snap.bestCombo,
        coins,
        pigment: level.pigment,
      };
      onComplete(reward);
      audio.finalRelease(); // powerful final-pixel release
      vibrate([60, 40, 80, 40, 120]);
      telemetry.levelEnd(level.id, true, snap.elapsedMs, snap.bestCombo);
      if (level.id === 1) telemetry.tutorialDone();
      setResult({ won: true, reward });
    } else if (snap.phase === 'lost') {
      completedRef.current = true;
      audio.lose();
      vibrate(200);
      telemetry.levelEnd(level.id, false, snap.elapsedMs, snap.bestCombo);
      if (snap.lossReason === 'tide') telemetry.timeoutLoss();
      setResult({
        won: false,
        reward: { levelId: level.id, stars: 0, score: snap.score, bestCombo: snap.bestCombo, coins: 0, pigment: 0 },
        lossReason: snap.lossReason ?? 'ammo',
      });
    }
  }, [snap.phase, engine, level, snap.score, snap.lossReason, onComplete]);

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
      setLeanLane(lane);
      window.setTimeout(() => setLeanLane(null), 240);
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

  // Desktop keyboard controls: 1-3 launch lanes, Q/W/E/R/T/Y select pens, P/Esc pause.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (result) return;
      const k = e.key.toLowerCase();
      if (k === 'p' || k === 'escape') {
        if (paused) doResume();
        else doPause();
        return;
      }
      if (paused) return;
      if (k >= '1' && k <= '3') {
        launch(Number(k) - 1);
        return;
      }
      const penIdx = ['q', 'w', 'e', 'r', 't', 'y'].indexOf(k);
      if (penIdx >= 0 && penIdx < snap.pens.length && snap.pens[penIdx]) {
        audio.select();
        engine.selectPen(penIdx);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });
  // Parent remounts this screen with a fresh key, restarting the level in place.
  const restart = () => {
    telemetry.retry(level.id);
    onRestart();
  };

  // Use a recovery item. Spends a free use or owned stock; if none, offers to
  // buy with coins. The item only acts if it can (e.g. an empty pen exists),
  // and a use is consumed only when the effect actually applies.
  const useRecoveryItem = useCallback(
    (id: ItemId) => {
      const cur = saveRef.current;
      const have = itemAvailable(cur, id);
      if (have <= 0) {
        // Buy prompt: only when affordable, never required to progress.
        if (cur.coins < ITEMS[id].price) {
          onToast(`Need ${ITEMS[id].price} coins for ${ITEMS[id].name}`);
          audio.fizzle();
          return;
        }
        const bought = buyItem(cur, id);
        if (!bought) return;
        onUpdateSave(bought);
        onToast(`Bought ${ITEMS[id].name}`);
        audio.coin();
        return; // buying doesn't auto-use; tap again to fire it
      }
      const applied = engine.applyItem(id);
      if (!applied) {
        onToast(`Can't use ${ITEMS[id].name} right now`);
        audio.fizzle();
        return;
      }
      const next = useItem(cur, id);
      if (next) onUpdateSave(next);
      telemetry.itemUse(id);
      if (id === 'freezePop') audio.freeze();
      else audio.item();
    },
    [engine, onUpdateSave, onToast],
  );

  const doSecondWind = () => {
    let cur = saveRef.current;
    // Ensure one Second Wind is available: use a free use / owned stock, or buy.
    if (itemAvailable(cur, 'secondWind') <= 0) {
      if (cur.coins < ITEMS.secondWind.price) {
        onToast('Not enough coins to continue');
        audio.fizzle();
        return;
      }
      cur = buyItem(cur, 'secondWind')!;
      telemetry.coinContinue();
    }
    const spent = useItem(cur, 'secondWind');
    if (!spent) return;
    if (!engine.secondWind()) return;
    onUpdateSave(spent);
    telemetry.itemUse('secondWind');
    completedRef.current = false;
    setResult(null);
    audio.item();
  };

  const toggleRelaxed = () => {
    const next = !relaxed;
    setRelaxed(next);
    engine.setRelaxed(next);
    onUpdateSave({ ...saveRef.current, settings: { ...saveRef.current.settings, relaxedMode: next } });
    onToast(next ? '🌿 Relaxed Mode on' : 'Glitch Tide on');
  };

  const selectedPiggy =
    snap.selectedPen != null ? snap.pens[snap.selectedPen] : snap.pens.find((p) => p) ?? null;

  const toggleMute = () => setMuted(audio.toggleMute());

  return (
    <div className={`game ${shakeClass} ${glitching ? 'glitching' : ''}`}>
      {/* HUD */}
      <div className="hud">
        <div className="hud-top">
          <button className="icon-btn" onClick={doPause} aria-label="Pause">
            ⏸
          </button>
          <div className="objective">
            {level.name}
            <small>
              {snap.blocksRemaining} pixels left · {level.pictureName}
            </small>
          </div>
          <button className="icon-btn" onClick={toggleMute} aria-label="Toggle sound">
            {muted ? '🔇' : '🔊'}
          </button>
        </div>

        <TideMeter snap={snap} />

        <div className="meters">
          <div className="score-badge" aria-label="Score">
            🏆 {snap.score.toLocaleString()}
          </div>
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
        fxMode={fxMode}
        theme={save.settings.theme}
        leanLane={leanLane}
      />

      {/* Pens + queue */}
      <Pens snap={snap} mood={mood} onSelect={(slot) => { audio.select(); engine.selectPen(slot); }} />

      {/* Recovery items */}
      <ItemBar save={save} onUse={useRecoveryItem} disabled={snap.phase !== 'playing'} />

      {/* Banners */}
      {showFeverBanner && <div className="fever-banner">PIGGY FEVER!</div>}
      {glitching && <div className="glitch-banner">⚡ GLITCH STRIKE {snap.strikes}/{snap.maxStrikes}</div>}
      {praise && !showFeverBanner && (
        <div className={`praise praise--${praise.tier}`}>{praise.text}</div>
      )}
      {snap.closeCall && snap.phase === 'playing' && !snap.feverActive && (
        <div className="close-call">Last piggies — make them count!</div>
      )}

      {/* First-session coaching (level 1 only, until the first pop) */}
      {level.id === 1 &&
        !save.levels[1]?.cleared &&
        !result &&
        !paused &&
        snap.phase === 'playing' &&
        snap.shotsFired === 0 &&
        snap.pens.some(Boolean) && (
          <div className={`coach ${snap.selectedPen == null ? 'coach--pens' : 'coach--board'}`}>
            {snap.selectedPen == null ? 'Tap a piggy to pick it up!' : 'Now tap a lane with the same color!'}
          </div>
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
            <div className="settings-row">
              <span>🔊 Sound</span>
              <button className={`toggle ${!muted ? 'on' : ''}`} onClick={toggleMute}>
                <span className="knob" />
              </button>
            </div>
            <div className="settings-row" style={{ borderBottom: 'none' }}>
              <span>
                🌿 Relaxed Mode
                <small className="settings-hint">No Glitch Tide · reduced coins</small>
              </span>
              <button
                className={`toggle ${relaxed ? 'on' : ''}`}
                onClick={toggleRelaxed}
                aria-label="Toggle Relaxed Mode"
              >
                <span className="knob" />
              </button>
            </div>
            <button className="btn btn--coral btn--block" onClick={onQuit}>
              ✕ Quit to Levels
            </button>
            <p style={{ fontSize: '0.72rem', opacity: 0.65, margin: '4px 0 0' }}>
              Keyboard: 1–3 launch lanes · Q–Y pick pens · P pause
            </p>
          </div>
        </div>
      )}

      {/* Result overlay */}
      {result && (
        <ResultDialog
          level={level}
          result={result}
          teaser={result.won ? rescueTeaser(level.id, save) : undefined}
          continueOffer={
            !result.won && result.lossReason === 'tide'
              ? {
                  cost: itemAvailable(save, 'secondWind') > 0 ? 0 : ITEMS.secondWind.price,
                  affordable:
                    itemAvailable(save, 'secondWind') > 0 || save.coins >= ITEMS.secondWind.price,
                  onContinue: doSecondWind,
                }
              : undefined
          }
          onKingdom={
            result.won &&
            save.pigment >= 20 &&
            (save.kingdom.house < 100 || save.kingdom.bakery < 100 || save.kingdom.fountain < 100)
              ? onKingdom
              : undefined
          }
          onNext={() => {
            if (!result.won) telemetry.postLossExit();
            onExit(level.id);
          }}
          onRetry={restart}
        />
      )}
    </div>
  );
}

/** Countdown to the next caged hero, shown on campaign win dialogs. */
function rescueTeaser(levelId: number, save: SaveData): string | undefined {
  const next = LEVELS.find((l) => l.rescue && !save.rescued[l.rescue] && l.id > levelId);
  if (!next || !next.rescue || levelId > 15) return undefined;
  const name = PIGGIES[next.rescue].name;
  const toGo = next.id - levelId;
  return `🐷 ${name}'s rescue is ${toGo} level${toGo === 1 ? '' : 's'} away!`;
}

interface ContinueOffer {
  cost: number;
  affordable: boolean;
  onContinue: () => void;
}

function ResultDialog({
  level,
  result,
  teaser,
  continueOffer,
  onKingdom,
  onNext,
  onRetry,
}: {
  level: LevelDef;
  result: { won: boolean; reward: LevelReward; lossReason?: 'overflow' | 'ammo' | 'tide' };
  teaser?: string;
  continueOffer?: ContinueOffer;
  onKingdom?: () => void;
  onNext: () => void;
  onRetry: () => void;
}) {
  const { won, reward } = result;
  const width = level.picture[0].length;

  if (!won) {
    const overflow = result.lossReason === 'overflow';
    const tide = result.lossReason === 'tide';
    return (
      <div className="overlay">
        <div className="dialog">
          <h2>{tide ? 'Glitched Out!' : overflow ? 'Pens Overflowed!' : 'Out of Piggies!'}</h2>
          <p className="big">{tide ? '⚡' : '😅'}</p>
          <p style={{ fontWeight: 800, margin: 0 }}>
            {tide
              ? 'Three Glitch Strikes! Keep the board clearing to hold the Tide back.'
              : overflow
              ? 'So close! Launch faster next time.'
              : 'Match colors carefully — every piggy counts!'}
          </p>
          {continueOffer && (
            <button
              className="btn btn--mint btn--block"
              onClick={continueOffer.onContinue}
              disabled={!continueOffer.affordable}
            >
              🌬️ Second Wind{' '}
              {continueOffer.cost === 0 ? '(free)' : `(🪙${continueOffer.cost})`}
            </button>
          )}
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
        <div className="dialog-piggy">
          <PiggyAvatar type="mochi" color="coral" size={84} expression="happy" pose="dance" />
        </div>
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
                  style={{
                    width: 14,
                    height: 14,
                    background: color,
                    animationDelay: `${(r * row.length + c) * 12}ms`,
                  }}
                />
              );
            }),
          )}
        </div>
        <p style={{ fontWeight: 900, margin: 0 }}>You revealed the {level.pictureName}!</p>
        <div className="reward-row">
          <span>🏆 {reward.score.toLocaleString()}</span>
          <span>⚡ {reward.bestCombo}</span>
          <span>🪙 {reward.coins}</span>
          <span>🎨 {reward.pigment}</span>
        </div>
        {teaser && <p className="rescue-teaser">{teaser}</p>}
        <button className="btn btn--primary btn--block" onClick={onNext}>
          Continue →
        </button>
        {onKingdom && (
          <button className="btn btn--mint btn--block" onClick={onKingdom}>
            🏰 Spend Pigment in the Kingdom
          </button>
        )}
        <button className="btn btn--ghost btn--block" onClick={onRetry}>
          ↻ Replay
        </button>
      </div>
    </div>
  );
}
