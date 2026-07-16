import { useCallback, useEffect, useRef, useState } from 'react';
import { LEVELS } from './data/levels';
import { audio, setHaptics } from './audio/audio';
import {
  applyLevelResult,
  loadSave,
  persist,
  resetSave,
  type LevelReward,
  type SaveData,
} from './save/save';
import { MainMenu } from './components/screens/MainMenu';
import { LevelSelect } from './components/screens/LevelSelect';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { KingdomScreen } from './components/kingdom/KingdomScreen';
import { GameScreen } from './components/game/GameScreen';
import { RescueScreen } from './components/screens/RescueScreen';

export type Screen =
  | { name: 'menu' }
  | { name: 'levels' }
  | { name: 'settings' }
  | { name: 'kingdom' }
  | { name: 'rescue' }
  | { name: 'game'; levelId: number; runId?: number };

export function App() {
  const [save, setSave] = useState<SaveData>(() => loadSave());
  const [screen, setScreen] = useState<Screen>({ name: 'menu' });
  const [toast, setToast] = useState<string | null>(null);
  const pendingRescue = useRef(false);

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
    (reward: LevelReward) => {
      const wasFirstClear = !save.levels[reward.levelId]?.cleared;
      const next = applyLevelResult(save, reward);
      update(next);
      // Trigger the Mochi rescue sequence after first clearing level 5.
      if (reward.levelId === 5 && wasFirstClear && !save.mochiRescued) {
        pendingRescue.current = true;
      }
    },
    [save, update],
  );

  const exitGame = useCallback(
    (lastLevelId: number) => {
      if (pendingRescue.current) {
        pendingRescue.current = false;
        go({ name: 'rescue' });
      } else if (lastLevelId % 3 === 0 && save.levels[lastLevelId]?.cleared) {
        // Every few levels, surface Kingdom restoration progress.
        go({ name: 'kingdom' });
      } else {
        go({ name: 'levels' });
      }
    },
    [go, save.levels],
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
          onSettings={() => go({ name: 'settings' })}
        />
      )}

      {screen.name === 'levels' && (
        <LevelSelect
          save={save}
          onBack={() => go({ name: 'menu' })}
          onKingdom={() => go({ name: 'kingdom' })}
          onSelect={(id) => go({ name: 'game', levelId: id })}
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

      {screen.name === 'rescue' && <RescueScreen onDone={() => go({ name: 'kingdom' })} />}

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
