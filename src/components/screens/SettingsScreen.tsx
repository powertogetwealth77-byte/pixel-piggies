import { useState } from 'react';
import { audio } from '../../audio/audio';
import type { SaveData } from '../../save/save';
import { LEVELS } from '../../data/levels';
import { solveAll, type SolveReport } from '../../engine/solver';
import { telemetry } from '../../telemetry/telemetry';

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

  type BoolSetting = 'muted' | 'musicOff' | 'hapticsOff' | 'reducedMotion' | 'lowEffects' | 'colorSymbols';
  const toggle = (key: BoolSetting) => {
    const next = { ...save, settings: { ...save.settings, [key]: !save.settings[key] } };
    onUpdate(next);
    if (key === 'muted') audio.setMuted(next.settings.muted);
  };

  const rows: { key: BoolSetting; label: string; on: boolean; hint?: string }[] = [
    { key: 'muted', label: '🔊 Sound', on: !save.settings.muted },
    { key: 'musicOff', label: '🎵 Music', on: !save.settings.musicOff },
    { key: 'hapticsOff', label: '📳 Haptics', on: !save.settings.hapticsOff },
    { key: 'reducedMotion', label: '🎬 Reduced motion', on: save.settings.reducedMotion },
    { key: 'lowEffects', label: '🔋 Low effects mode', on: save.settings.lowEffects, hint: 'Fewer particles & glows for older phones' },
    { key: 'colorSymbols', label: '♿ Color symbols', on: save.settings.colorSymbols, hint: 'Shape markers on blocks for color-blind play' },
  ];

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
        {rows.map((r) => (
          <div className="settings-row" key={r.key}>
            <span>
              {r.label}
              {r.hint && <small className="settings-hint">{r.hint}</small>}
            </span>
            <button
              className={`toggle ${r.on ? 'on' : ''}`}
              onClick={() => toggle(r.key)}
              aria-label={`Toggle ${r.label}`}
            >
              <span className="knob" />
            </button>
          </div>
        ))}
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

      <PlaytestStats onToast={onToast} />

      <div className="dev-row">
        <button className="dev-link" onClick={runVerify}>
          🛠 Verify all levels are solvable
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

      <p style={{ textAlign: 'center', opacity: 0.6, fontSize: '0.8rem' }}>
        Pixel Piggies — original game. Art, sound &amp; code made from scratch.
      </p>
    </div>
  );
}

/** On-device playtest stats: never leave this browser unless YOU export them. */
function PlaytestStats({ onToast }: { onToast: (msg: string) => void }) {
  const [, force] = useState(0);
  const t = telemetry.snapshot();
  const totals = Object.values(t.levels).reduce(
    (acc, l) => ({
      attempts: acc.attempts + l.attempts,
      losses: acc.losses + l.losses,
      fizzles: acc.fizzles + l.fizzles,
    }),
    { attempts: 0, losses: 0, fizzles: 0 },
  );

  return (
    <div className="card">
      <div className="row row--between" style={{ marginBottom: 8 }}>
        <b>📊 Playtest stats</b>
        <small style={{ opacity: 0.65 }}>stored only on this device</small>
      </div>
      <div className="stats-grid">
        <span>🗓 {t.daysPlayed.length} days · {t.sessions} sessions</span>
        <span>🎮 {totals.attempts} attempts · {totals.losses} losses</span>
        <span>💨 {totals.fizzles} fizzles · 🔥 {t.feverActivations} fevers</span>
        <span>⚡ best combo {t.largestCombo} · 🏰 {t.kingdomVisits} visits</span>
        <span>🐷 {Object.keys(t.rescues).length}/4 rescued · 🎁 {t.dailiesCompleted} dailies</span>
        <span>🎓 tutorial {t.tutorialCompleted ? 'done' : 'not yet'}</span>
      </div>
      <div className="row" style={{ marginTop: 10 }}>
        <button
          className="btn btn--ghost btn--block"
          style={{ minHeight: 42, padding: '8px 12px', fontSize: '0.85rem' }}
          onClick={() => {
            telemetry.export();
            onToast('Stats downloaded as JSON');
          }}
        >
          ⬇ Export JSON
        </button>
        <button
          className="btn btn--ghost btn--block"
          style={{ minHeight: 42, padding: '8px 12px', fontSize: '0.85rem' }}
          onClick={() => {
            telemetry.reset();
            force((n) => n + 1);
            onToast('Playtest stats reset');
          }}
        >
          🗑 Reset stats
        </button>
      </div>
    </div>
  );
}
