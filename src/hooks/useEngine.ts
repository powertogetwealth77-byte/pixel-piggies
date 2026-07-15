import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { GameEngine } from '../engine/engine';
import type { LevelDef } from '../engine/types';

/** Create an engine for a level and drive its real-time tick loop. */
export function useEngine(level: LevelDef) {
  const engine = useMemo(() => new GameEngine(level), [level]);
  const snapshot = useSyncExternalStore(engine.subscribe, engine.getSnapshot);
  const rafRef = useRef<number | null>(null);
  const lastRef = useRef<number>(0);

  useEffect(() => {
    lastRef.current = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(64, now - lastRef.current);
      lastRef.current = now;
      engine.tick(dt);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [engine]);

  return { engine, snapshot };
}
