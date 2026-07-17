import { useState } from 'react';
import { audio } from '../../audio/audio';
import { buyItem, itemAvailable, type SaveData } from '../../save/save';
import { LEVELS } from '../../data/levels';
import { ITEMS, ITEM_ORDER } from '../../data/items';
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

  type BoolSetting = 'muted' | 'musicOff' | 'hapticsOff' | 'relaxedMode' | 'reducedMotion' | 'lowEffects' | 'colorSymbols';
  const toggle = (key: BoolSetting) => {
    const next = { ...save, settings: { ...save.settings, [key]: !save.settings[key] } };
    onUpdate(next);
    if (key === 'muted') audio.setMuted(next.settings.muted);
  };

  const rows: { key: BoolSetting; label: string; on: boolean; hint?: string }[] = [
    { key: 'muted', label: '🔊 Sound', on: !save.settings.muted },
    { key: 'musicOff', label: '🎵 Music', on: !save.settings.musicOff },
    { key: 'hapticsOff', label: '📳 Haptics', on: !save.settings.hapticsOff },
    { key: 'relaxedMode', label: '🌿 Relaxed Mode', on: save.settings.relaxedMode, hint: 'No Glitch Tide · reduced coin rewards' },
    { key: 'reducedMotion', label: '🎬 Reduced motion', on: save.settings.reducedMotion },
    { key: 'lowEffects', label: '🔋 Low effects mode', on: save.settings.lowEffects, hint: 'Fewer particles & glows for older phones' },
    { key: 'colorSymbols', label: '♿ Color symbols', on: save.settings.colorSymbols, hint: 'Shape markers on blocks for color-blind play' },
  ];

  const buy = (id: (typeof ITEM_ORDER)[number]) => {
    const next = buyItem(save, id);
    if (!next) {
      onToast('Not enough coins');
      audio.fizzle();
      return;
    }
    onUpdate(next);
    audio.coin();
    onToast(`Bought ${ITEMS[id].name}`);
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

      <div className="card">
        <div className="row row--between" style={{ marginBottom: 10 }}>
          <b>🛟 Recovery Items</b>
          <span className="pill">🪙 {save.coins}</span>
        </div>
        <p style={{ fontSize: '0.74rem', opacity: 0.7, margin: '0 0 10px' }}>
          Optional helpers for the Glitch Tide. Every level is beatable without
          them — free intro uses are yours to try first.
        </p>
        <div className="shop-list">
          {ITEM_ORDER.map((id) => {
            const def = ITEMS[id];
            const have = itemAvailable(save, id);
            return (
              <div className="shop-item" key={id}>
                <span className="shop-icon">{def.icon}</span>
                <div className="shop-text">
                  <b>{def.name}</b>
                  <small>{def.effect}</small>
                </div>
                <div className="shop-buy">
                  <span className="shop-have">×{have}</span>
                  <button
                    className="btn btn--mint"
                    style={{ padding: '7px 12px', minHeight: 38, fontSize: '0.82rem' }}
                    disabled={save.coins < def.price}
                    onClick={() => buy(id)}
                  >
                    🪙 {def.price}
                  </button>
                </div>
              </div>
            );
          })}
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
        <span>🌊 max Tide {['none', 'calm', 'building', 'critical'][t.maxTideStage]} · ⚡ {t.glitchStrikes} strikes</span>
        <span>⏱ {t.timeRestored} restored · 💀 {t.timeoutLosses} timeouts</span>
        <span>🌬️ {t.feverSaves} fever saves · 🌿 {t.relaxedRuns} relaxed runs</span>
        <span>🛒 {Object.values(t.itemUses).reduce<number>((a, b) => a + (b ?? 0), 0)} items · 🪙 {t.coinContinues} continues</span>
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
