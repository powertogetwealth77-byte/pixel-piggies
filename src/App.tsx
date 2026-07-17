import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LEVELS } from './data/levels';
import { audio, setHaptics } from './audio/audio';
import {
  resolveLevelReward,
  loadSave,
  persist,
  resetSave,
  type LevelReward,
  type RewardSummary,
  type SaveData,
} from './save/save';
import { telemetry } from './telemetry/telemetry';
import { generateDailyLevel, todayKey } from './daily/daily';
import type { PiggyType } from './engine/types';
import { MainMenu } from './components/screens/MainMenu';
import { LevelSelect } from './components/screens/LevelSelect';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { KingdomScreen } from './components/kingdom/KingdomScreen';
import { SanctuaryScreen } from './components/sanctuary/SanctuaryScreen';
import { GameScreen } from './components/game/GameScreen';
import { RescueScreen } from './components/screens/RescueScreen';

export type Screen =
  | { name: 'menu' }
  | { name: 'levels' }
  | { name: 'settings' }
  | { name: 'kingdom' }
  | { name: 'sanctuary' }
  | { name: 'rescue'; piggy: PiggyType }
  | { name: 'game'; levelId: number; runId?: number }
  | { name: 'daily'; runId?: number };

export function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [screen, setScreen] = useState<Screen>({ name: 'menu' });
  const [toast, setToast] = useState<string | null>(null);
  const pendingRescue = useRef<PiggyType | null>(null);

  // One local session record per app load (no external tracking).
  useEffect(() => {
    telemetry.session();
  }, []);

  // Apply persisted settings to audio, haptics + motion.
  useEffect(() => {
    audio.setMuted(save.settings.muted);
    audio.setMusicEnabled(!save.settings.musicOff);
    setHaptics(!save.settings.hapticsOff);
    document.body.classList.toggle('reduced-motion', save.settings.reducedMotion);
    document.body.classList.toggle('low-effects', save.settings.lowEffects);
    document.body.classList.toggle('color-symbols', save.settings.colorSymbols);
  }, [save.settings]);

  const update = useCallback((next: SaveData) => {
    setSave(next);
    persist(next);
  }, []);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 1800);
  }, []);

  const go = useCallback((s: Screen) => {
    audio.resume();
    setScreen(s);
  }, []);

  const handleLevelComplete = useCallback(
    (reward: LevelReward): RewardSummary => {
      const wasFirstClear = !save.levels[reward.levelId]?.cleared;
      const { next, summary } = resolveLevelReward(save, reward);
      update(next);
      telemetry.log(wasFirstClear ? 'level_completed' : 'level_replayed');
      if (!wasFirstClear) telemetry.log('replay_reward_earned');
      if (summary.newHighScore) telemetry.log('high_score_improved');
      if (summary.newStarTokens > 0) telemetry.log('new_star_earned');
      if (summary.treasureCoins > 0) telemetry.log('treasure_chest_awarded');
      // Queue the rescue story after first clearing a rescue milestone.
      const hero = LEVELS.find((l) => l.id === reward.levelId)?.rescue;
      if (hero && wasFirstClear && !save.rescued[hero]) {
        pendingRescue.current = hero;
        telemetry.rescue(hero);
      }
      return summary;
    },
    [save, update],
  );

  // Daily bonus: generated fresh each day, validated by the solver.
  const dailyLevel = useMemo(() => generateDailyLevel(todayKey()), []);

  const handleDailyComplete = useCallback(
    (reward: LevelReward): RewardSummary => {
      const blank: RewardSummary = {
        firstClear: true,
        baseCoins: 0,
        scoreBonus: 0,
        highScoreBonus: 0,
        newStarTokens: 0,
        treasureCoins: 0,
        pigment: 0,
        totalCoins: 0,
        totalTokens: 0,
        newHighScore: false,
        perfect: false,
        antiGrind: false,
        phrase: 'THE SANCTUARY GROWS!',
      };
      if (!reward.stars) return blank; // losses can be retried the same day
      const next: SaveData = {
        ...save,
        coins: save.coins + reward.coins,
        pigment: save.pigment + dailyLevel.pigment,
        rescueTokens: save.rescueTokens + 3, // daily gives a chunk of tokens
        dailyDone: todayKey(),
      };
      update(next);
      telemetry.dailyDone();
      return {
        ...blank,
        baseCoins: reward.coins,
        pigment: dailyLevel.pigment,
        totalCoins: reward.coins,
        totalTokens: 3,
      };
    },
    [save, update, dailyLevel],
  );

  const exitGame = useCallback(
    (lastLevelId: number) => {
      if (pendingRescue.current) {
        const hero = pendingRescue.current;
        pendingRescue.current = null;
        go({ name: 'rescue', piggy: hero });
      } else if (lastLevelId === dailyLevel.id) {
        go({ name: 'levels' });
      } else if (lastLevelId % 3 === 0 && save.levels[lastLevelId]?.cleared) {
        // Every few levels, surface Kingdom restoration progress.
        go({ name: 'kingdom' });
      } else {
        go({ name: 'levels' });
      }
    },
    [go, save.levels, dailyLevel.id],
  );

  return (
    <div className="app">
      {screen.name === 'menu' && (
        <MainMenu
          save={save}
          onPlay={() => {
            // Jump to the highest unlocked level for a fast "continue".
            go({ name: 'levels' });
          }}
          onLevels={() => go({ name: 'levels' })}
          onKingdom={() => go({ name: 'kingdom' })}
          onSanctuary={() => go({ name: 'sanctuary' })}
          onSettings={() => go({ name: 'settings' })}
        />
      )}

      {screen.name === 'levels' && (
        <LevelSelect
          save={save}
          onBack={() => go({ name: 'menu' })}
          onKingdom={() => go({ name: 'kingdom' })}
          onSanctuary={() => go({ name: 'sanctuary' })}
          onSelect={(id) => go({ name: 'game', levelId: id })}
          onDaily={() => go({ name: 'daily' })}
          onUpdate={update}
          onToast={showToast}
        />
      )}

      {screen.name === 'sanctuary' && (
        <SanctuaryScreen
          save={save}
          onBack={() => go({ name: 'levels' })}
          onUpdate={update}
          onToast={showToast}
        />
      )}

      {screen.name === 'game' && (
        <GameScreen
          key={`${screen.levelId}:${screen.runId ?? 0}`}
          level={LEVELS.find((l) => l.id === screen.levelId)!}
          save={save}
          onComplete={handleLevelComplete}
          onExit={exitGame}
          onQuit={() => go({ name: 'levels' })}
          onRestart={() =>
            setScreen((s) =>
              s.name === 'game' ? { ...s, runId: (s.runId ?? 0) + 1 } : s,
            )
          }
          onKingdom={() => go({ name: 'kingdom' })}
          onSanctuary={() => go({ name: 'sanctuary' })}
          onUpdateSave={update}
          onToast={showToast}
        />
      )}

      {screen.name === 'daily' && (
        <GameScreen
          key={`daily:${todayKey()}:${screen.runId ?? 0}`}
          level={dailyLevel}
          save={save}
          onComplete={handleDailyComplete}
          onExit={exitGame}
          onQuit={() => go({ name: 'levels' })}
          onRestart={() =>
            setScreen((s) =>
              s.name === 'daily' ? { ...s, runId: (s.runId ?? 0) + 1 } : s,
            )
          }
          onKingdom={() => go({ name: 'kingdom' })}
          onSanctuary={() => go({ name: 'sanctuary' })}
          onUpdateSave={update}
          onToast={showToast}
        />
      )}

      {screen.name === 'kingdom' && (
        <KingdomScreen
          save={save}
          onBack={() => go({ name: 'levels' })}
          onUpdate={update}
          onToast={showToast}
        />
      )}

      {screen.name === 'rescue' && (
        <RescueScreen piggy={screen.piggy} onDone={() => go({ name: 'kingdom' })} />
      )}

      {screen.name === 'settings' && (
        <SettingsScreen
          save={save}
          onBack={() => go({ name: 'menu' })}
          onUpdate={update}
          onReset={() => {
            const fresh = resetSave();
            setSave(fresh);
            showToast('Progress reset');
          }}
          onToast={showToast}
        />
      )}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
