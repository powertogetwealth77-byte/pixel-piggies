import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LEVELS } from './data/levels';
import { audio, setHaptics } from './audio/audio';
import {
  resolveLevelReward,
  loadSave,
  persist,
  resetSave,
  wasRecovered,
  type LevelReward,
  type RewardSummary,
  type SaveData,
} from './save/save';
import { telemetry } from './telemetry/telemetry';
import { isPlaytest, perf, promptAnswered } from './playtest/playtest';
import { generateDailyLevel, todayKey } from './daily/daily';
import type { PiggyType } from './engine/types';
import { MainMenu } from './components/screens/MainMenu';
import { StoryCinematic } from './components/screens/StoryCinematic';
import { PiggyBook } from './components/book/PiggyBook';
import { LevelSelect } from './components/screens/LevelSelect';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { KingdomScreen } from './components/kingdom/KingdomScreen';
import { SanctuaryScreen } from './components/sanctuary/SanctuaryScreen';
import { GameScreen } from './components/game/GameScreen';
import { RescueScreen } from './components/screens/RescueScreen';
import { PlaytestScreen } from './components/playtest/PlaytestScreen';
import { QuickPrompt, PROMPTS, type PromptDef } from './components/playtest/QuickPrompt';

export type Screen =
  | { name: 'menu' }
  | { name: 'intro'; replay?: boolean }
  | { name: 'book' }
  | { name: 'levels' }
  | { name: 'settings' }
  | { name: 'kingdom' }
  | { name: 'sanctuary' }
  | { name: 'rescue'; piggy: PiggyType }
  | { name: 'game'; levelId: number; runId?: number }
  | { name: 'daily'; runId?: number }
  | { name: 'playtest' };

export function App() {
  const initial = useRef<SaveData>(loadSave()).current;
  const [save, setSave] = useState<SaveData>(initial);
  // First-run players meet Pip through the opening cinematic; returning players
  // (and anyone who's seen it) land on the menu.
  const [screen, setScreen] = useState<Screen>(
    initial.story.introSeen ? { name: 'menu' } : { name: 'intro' },
  );
  const [toast, setToast] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<PromptDef | null>(null);
  const playtest = isPlaytest();
  const pendingRescue = useRef<PiggyType | null>(null);

  // One local session record per app load (no external tracking); start the
  // (playtest-only) perf sampler; recover gracefully from a corrupt save.
  useEffect(() => {
    telemetry.session({
      reducedMotion: initial.settings.reducedMotion,
      lowEffects: initial.settings.lowEffects,
      sound: !initial.settings.muted,
    });
    if (playtest) perf.start();
    if (wasRecovered()) {
      window.setTimeout(
        () => showToast('Recovered your progress from a backup 🐷'),
        400,
      );
    }
    return () => perf.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Show a one-tap playtest question, once each, without blocking play.
  const maybePrompt = useCallback((id: string) => {
    if (!playtest || promptAnswered(id) || !PROMPTS[id]) return;
    setPrompt(PROMPTS[id]);
  }, [playtest]);

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
    telemetry.screen(s.name);
    if (s.name === 'sanctuary') maybePrompt('sanctuary_return');
    setScreen(s);
  }, [maybePrompt]);

  // Finish the opening cinematic: mark it seen (once) and drop to the menu.
  const finishIntro = useCallback(() => {
    if (!save.story.introSeen) update({ ...save, story: { ...save.story, introSeen: true } });
    go({ name: 'menu' });
  }, [save, update, go]);

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
      // Playtest one-tap check-ins at comprehension milestones.
      if (wasFirstClear && reward.levelId === 1) maybePrompt('understand_l1');
      if (wasFirstClear && reward.levelId === 5) maybePrompt('keep_playing');
      return summary;
    },
    [save, update, maybePrompt],
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
      {screen.name === 'intro' && (
        <StoryCinematic replay={screen.replay} onDone={finishIntro} />
      )}

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
          onStory={() => go({ name: 'intro', replay: true })}
          onBook={() => go({ name: 'book' })}
        />
      )}

      {screen.name === 'book' && (
        <PiggyBook
          save={save}
          onBack={() => go({ name: 'menu' })}
          onSanctuary={() => go({ name: 'sanctuary' })}
          onUpdate={update}
          onToast={showToast}
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
          onBook={() => go({ name: 'book' })}
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
          onLoss={() => maybePrompt('clear_loss')}
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
        <RescueScreen piggy={screen.piggy} onDone={() => { maybePrompt('rescue_reward'); go({ name: 'kingdom' }); }} />
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
          onPlaytest={() => go({ name: 'playtest' })}
        />
      )}

      {screen.name === 'playtest' && (
        <PlaytestScreen
          save={save}
          onBack={() => go({ name: 'menu' })}
          onUpdate={update}
          onToast={showToast}
          onSkipLevel={(id) => go({ name: 'game', levelId: id })}
        />
      )}

      {/* Unobtrusive playtest badge (never shown to ordinary players) */}
      {playtest && screen.name !== 'playtest' && screen.name !== 'game' && screen.name !== 'daily' && (
        <button className="playtest-badge playtest-badge--fab" onClick={() => go({ name: 'playtest' })}>
          PLAYTEST
        </button>
      )}

      {/* One-tap playtest question (dismissible, once each) */}
      {prompt && <QuickPrompt prompt={prompt} onClose={() => setPrompt(null)} />}

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
