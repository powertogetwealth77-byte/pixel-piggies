import { useState } from 'react';
import {
  exportSave,
  importSave,
  backupBeforeImport,
  persist,
  listSnapshots,
  type SaveData,
  type SaveSummary,
} from '../../save/save';
import { APP_VERSION, SAVE_SCHEMA_VERSION, versionLabel } from '../../version';
import { buildDiagnostics, diagnosticsText, downloadJson } from '../../playtest/playtest';

interface Props {
  save: SaveData;
  onUpdate: (s: SaveData) => void;
  onToast: (msg: string) => void;
}

/**
 * Safe save backup & recovery, plus the diagnostic report. Export is one tap;
 * import validates and previews before applying and auto-backs-up the current
 * save; recovery snapshots can be restored; nothing here can wipe progress
 * without an explicit confirm.
 */
export function SaveManager({ save, onUpdate, onToast }: Props) {
  const [pending, setPending] = useState<{ save: SaveData; summary: SaveSummary } | null>(null);
  const [importErr, setImportErr] = useState<string | null>(null);
  const [text, setText] = useState('');
  const snaps = listSnapshots();

  const doExport = () => {
    downloadJson(JSON.parse(exportSave(save, APP_VERSION)), `pixel-piggies-save-${new Date().toISOString().slice(0, 10)}.json`);
    onToast('Save exported to this device');
  };

  const tryImport = (raw: string) => {
    const res = importSave(raw);
    if (!res.ok || !res.save || !res.summary) {
      setImportErr(res.reason ?? 'Could not read that save');
      setPending(null);
      return;
    }
    setImportErr(null);
    setPending({ save: res.save, summary: res.summary });
  };

  const confirmImport = () => {
    if (!pending) return;
    backupBeforeImport(); // auto-backup current save before overwriting
    persist(pending.save);
    onUpdate(pending.save);
    setPending(null);
    setText('');
    onToast('Save imported — a backup of your old save was kept');
  };

  return (
    <div className="card save-manager">
      <div className="row row--between" style={{ marginBottom: 6 }}>
        <b>💾 Save &amp; Backup</b>
        <small style={{ opacity: 0.6 }}>{versionLabel()} · schema {SAVE_SCHEMA_VERSION}</small>
      </div>
      <p style={{ fontSize: '0.74rem', opacity: 0.7, margin: '0 0 8px' }}>
        Backups stay on this device until you export them. Importing keeps a copy of your current save.
      </p>

      <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn--mint" style={{ padding: '8px 12px', minHeight: 40 }} onClick={doExport}>
          ⬇ Export save
        </button>
        <label className="btn btn--ghost" style={{ padding: '8px 12px', minHeight: 40, cursor: 'pointer' }}>
          ⬆ Import from file
          <input
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) tryImport(await f.text());
              e.target.value = '';
            }}
          />
        </label>
      </div>

      <details style={{ marginTop: 8 }}>
        <summary style={{ cursor: 'pointer', fontSize: '0.82rem', fontWeight: 700 }}>Paste a save instead</summary>
        <textarea
          className="save-paste"
          placeholder="Paste exported save JSON here…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="btn btn--ghost btn--sm" onClick={() => tryImport(text)} disabled={!text.trim()}>
          Check paste
        </button>
      </details>

      {importErr && <p className="import-err">⚠️ {importErr}</p>}

      {pending && (
        <div className="import-preview">
          <b>Restore this save?</b>
          <span>🐷 {pending.summary.freed} freed · ⭐ {pending.summary.stars} · 🪙 {pending.summary.coins} · level {pending.summary.unlockedLevel}</span>
          <div className="row" style={{ gap: 8 }}>
            <button className="btn btn--primary" style={{ padding: '7px 14px', minHeight: 38 }} onClick={confirmImport}>Restore</button>
            <button className="btn btn--ghost" style={{ padding: '7px 14px', minHeight: 38 }} onClick={() => setPending(null)}>Cancel</button>
          </div>
        </div>
      )}

      {snaps.length > 0 && (
        <div className="snap-list">
          <small style={{ opacity: 0.7, fontWeight: 700 }}>Recovery snapshots</small>
          {snaps.map((s) => (
            <div key={s.slot} className="snap-row">
              <span>{s.slot}</span>
              <span className="snap-sum">🐷 {s.summary.freed} · ⭐ {s.summary.stars} · 🪙 {s.summary.coins}</span>
            </div>
          ))}
        </div>
      )}

      <div className="row" style={{ gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
        <button
          className="btn btn--ghost btn--sm"
          onClick={() => { downloadJson(buildDiagnostics(save), 'pixel-piggies-diagnostics.json'); onToast('Diagnostics exported'); }}
        >
          🧪 Export report
        </button>
        <button
          className="btn btn--ghost btn--sm"
          onClick={async () => {
            try { await navigator.clipboard.writeText(diagnosticsText(save)); onToast('Summary copied'); }
            catch { onToast('Copy not available — use Export report'); }
          }}
        >
          📋 Copy summary
        </button>
      </div>
    </div>
  );
}
