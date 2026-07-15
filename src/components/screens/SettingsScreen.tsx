import { useState } from 'react';
import { audio } from '../../audio/audio';
import type { SaveData } from '../../save/save';
import { LEVELS } from '../../data/levels';
import { solveAll, type SolveReport } from '../../engine/solver';

interface Props {
  save: SaveData;
  onBack: () => void;
  onUpdate: (s: SaveData) => void;
  onReset: () => void;
  onToast: (msg: string) => void;
}

export function SettingsScreen({ save, onBack, onUpdate, onReset, onToast }: Props) {
  const [confirmReset, setConfirmReset] = useState(false);
  const [reports, setReports] = useState<SolveReport[] | null>(null);

  const toggle = (key: 'muted' | 'reducedMotion') => {
    const next = { ...save, settings: { ...save.settings, [key]: !save.settings[key] } };
    onUpdate(next);
    if (key === 'muted') audio.setMuted(next.settings.muted);
  };

  const runVerify = () => {
    const r = solveAll(LEVELS);
    setReports(r);
    const fails = r.filter((x) => !x.solvable).length;
    onToast(fails === 0 ? 'All levels solvable ✓' : `${fails} level(s) failed`);
  };

  return (
    <div className="screen">
      <div className="row row--between">
        <button className="icon-btn" onClick={onBack} aria-label="Back">
          ‹
        </button>
        <h2 style={{ margin: 0 }}>Settings</h2>
        <span style={{ width: 48 }} />
      </div>

      <div className="card">
        <div className="settings-row">
          <span>🔊 Sound</span>
          <button
            className={`toggle ${!save.settings.muted ? 'on' : ''}`}
            onClick={() => toggle('muted')}
            aria-label="Toggle sound"
          >
            <span className="knob" />
          </button>
        </div>
        <div className="settings-row">
          <span>🎬 Reduced motion</span>
          <button
            className={`toggle ${save.settings.reducedMotion ? 'on' : ''}`}
            onClick={() => toggle('reducedMotion')}
            aria-label="Toggle reduced motion"
          >
            <span className="knob" />
          </button>
        </div>
        <div className="settings-row" style={{ borderBottom: 'none' }}>
          <span>🗑 Reset progress</span>
          {confirmReset ? (
            <div className="row">
              <button
                className="btn btn--coral"
                style={{ padding: '8px 14px', minHeight: 40 }}
                onClick={() => {
                  onReset();
                  setConfirmReset(false);
                }}
              >
                Confirm
              </button>
              <button
                className="btn btn--ghost"
                style={{ padding: '8px 14px', minHeight: 40 }}
                onClick={() => setConfirmReset(false)}
              >
                No
              </button>
            </div>
          ) : (
            <button
              className="btn btn--ghost"
              style={{ padding: '8px 14px', minHeight: 40 }}
              onClick={() => setConfirmReset(true)}
            >
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="row row--between" style={{ marginBottom: 10 }}>
          <b>🛠 Developer</b>
          <button
            className="btn btn--mint"
            style={{ padding: '8px 14px', minHeight: 40 }}
            onClick={runVerify}
          >
            Verify levels solvable
          </button>
        </div>
        {reports && (
          <div className="solve-report">
            {reports.map((r) => (
              <div key={r.levelId} className={r.solvable ? 'ok' : 'fail'}>
                L{r.levelId} {r.solvable ? 'OK  ' : 'FAIL'} {r.name} — {r.note}
              </div>
            ))}
          </div>
        )}
      </div>

      <p style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.8rem' }}>
        Pixel Piggies — original game. Art, sound &amp; code made from scratch.
      </p>
    </div>
  );
}
