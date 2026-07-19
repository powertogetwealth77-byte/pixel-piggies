import { useEffect, useState } from 'react';
import { telemetry } from '../../telemetry/telemetry';
import {
  perf,
  isDevTools,
  saveFeedback,
  getFeedback,
  setPlaytest,
  type Feedback,
} from '../../playtest/playtest';
import { versionLabel } from '../../version';
import { type SaveData } from '../../save/save';
import { SaveManager } from './SaveManager';

interface Props {
  save: SaveData;
  onBack: () => void;
  onUpdate: (s: SaveData) => void;
  onToast: (msg: string) => void;
  onSkipLevel?: (id: number) => void;
}

const CATEGORIES = ['Controls', 'Difficulty', 'Visual clarity', 'Sound', 'Story', 'Sanctuary', 'Piggy Book', 'Performance', 'Bug', 'Other'];

/** The playtest dashboard: local summary, per-level table, perf, feedback, and
 *  save tools. Available only in Playtest Mode. Nothing is transmitted. */
export function PlaytestScreen({ save, onBack, onUpdate, onToast, onSkipLevel }: Props) {
  const s = telemetry.summary();
  const p = perf.status();
  const [fbCount, setFbCount] = useState(getFeedback().length);

  useEffect(() => { telemetry.screen('playtest'); }, []);

  const stat = (label: string, value: string | number) => (
    <div className="pt-stat"><b>{value}</b><span>{label}</span></div>
  );

  return (
    <div className="screen">
      <div className="row row--between">
        <button className="icon-btn" onClick={onBack} aria-label="Back">‹</button>
        <h2 style={{ margin: 0 }}>🧪 Playtest</h2>
        <span className="playtest-badge" aria-hidden="true">PLAYTEST</span>
      </div>

      <p style={{ fontSize: '0.76rem', opacity: 0.7, margin: 0 }}>
        {versionLabel()} · session {Math.round(telemetry.sessionDurationMs() / 1000)}s · id {telemetry.snapshot().anonId} · all data stays on this device
      </p>

      <div className="card">
        <b style={{ display: 'block', marginBottom: 8 }}>📊 Summary</b>
        <div className="pt-stats">
          {stat('Sessions', s.sessions)}
          {stat('Attempted', s.levelsAttempted)}
          {stat('Completed', s.levelsCompleted)}
          {stat('Completion', `${s.completionRate}%`)}
          {stat('Avg tries', s.avgAttempts)}
          {stat('Most-failed', s.mostFailedLevel ?? '—')}
          {stat('Invalid taps', s.invalidInputs)}
          {stat('Hints', `${s.hintUsed}/${s.hintOffered}`)}
          {stat('Best combo', s.highestCombo)}
          {stat('Sanctuary', s.sanctuaryVisits)}
          {stat('Book opens', s.bookVisits)}
          {stat('Rescues', s.rescues)}
          {stat('Quests', s.questsClaimed)}
          {stat('Near-wins', s.nearWins)}
          {stat('FPS', `${p.band} ~${p.fps}`)}
          {stat('Long frames', p.longFrames)}
        </div>
        {p.band === 'poor' && (
          <p className="pt-warn">⚠️ Frame rate is low — consider enabling Low effects mode in Settings.</p>
        )}
      </div>

      {s.rows.length > 0 && (
        <div className="card" style={{ overflowX: 'auto' }}>
          <b style={{ display: 'block', marginBottom: 8 }}>📋 Per-level</b>
          <table className="pt-table">
            <thead>
              <tr><th>Lvl</th><th>Try</th><th>Win</th><th>Fail</th><th>%</th><th>Retry</th></tr>
            </thead>
            <tbody>
              {s.rows.map((r) => (
                <tr key={r.level} className={r.completion < 40 && r.attempts >= 2 ? 'pt-hot' : ''}>
                  <td>{r.level}</td><td>{r.attempts}</td><td>{r.wins}</td><td>{r.failures}</td><td>{r.completion}%</td><td>{r.retries}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <FeedbackForm onSubmit={(f) => { saveFeedback(f); setFbCount((n) => n + 1); onToast('Feedback saved on this device'); }} count={fbCount} />

      <SaveManager save={save} onUpdate={onUpdate} onToast={onToast} />

      {isDevTools() && onSkipLevel && (
        <div className="card">
          <b style={{ display: 'block', marginBottom: 6 }}>🛠 Developer tools</b>
          <p style={{ fontSize: '0.72rem', opacity: 0.6, margin: '0 0 8px' }}>Hidden from ordinary players (needs ?dev=1).</p>
          <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
            {[1, 5, 7, 13, 19, 25].map((id) => (
              <button key={id} className="btn btn--ghost btn--sm" onClick={() => onSkipLevel(id)}>Level {id}</button>
            ))}
          </div>
        </div>
      )}

      <div className="card">
        <div className="row row--between">
          <span>Reset test profile</span>
          <button
            className="btn btn--coral btn--sm"
            onClick={() => { telemetry.reset(); onToast('Playtest telemetry cleared'); }}
          >
            Clear telemetry
          </button>
        </div>
        <div className="row row--between" style={{ marginTop: 8 }}>
          <span>Turn off Playtest Mode</span>
          <button className="btn btn--ghost btn--sm" onClick={() => { setPlaytest(false); onToast('Playtest Mode off'); onBack(); }}>
            Disable
          </button>
        </div>
      </div>
    </div>
  );
}

function FeedbackForm({ onSubmit, count }: { onSubmit: (f: Feedback) => void; count: number }) {
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState('Other');
  const [confusing, setConfusing] = useState('');
  const [frustrating, setFrustrating] = useState('');
  const [enjoyed, setEnjoyed] = useState('');
  const [pig, setPig] = useState('');
  const [again, setAgain] = useState('');
  const lim = (v: string) => v.slice(0, 200);

  const submit = () => {
    onSubmit({
      at: new Date().toISOString(),
      rating, category, confusing, frustrating, enjoyed, pig, again,
    });
    setRating(0); setConfusing(''); setFrustrating(''); setEnjoyed(''); setPig(''); setAgain('');
  };

  return (
    <div className="card feedback-form">
      <div className="row row--between" style={{ marginBottom: 6 }}>
        <b>💬 Feedback</b>
        <small style={{ opacity: 0.6 }}>{count} saved on this device</small>
      </div>
      <label className="fb-label">Overall rating</label>
      <div className="fb-stars" role="radiogroup" aria-label="Overall rating">
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} className={`fb-star ${rating >= n ? 'on' : ''}`} onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? 's' : ''}`} role="radio" aria-checked={rating === n}>★</button>
        ))}
      </div>
      <label className="fb-label">What felt confusing?</label>
      <input className="fb-input" maxLength={200} value={confusing} onChange={(e) => setConfusing(lim(e.target.value))} />
      <label className="fb-label">What felt frustrating?</label>
      <input className="fb-input" maxLength={200} value={frustrating} onChange={(e) => setFrustrating(lim(e.target.value))} />
      <label className="fb-label">What did you enjoy most?</label>
      <input className="fb-input" maxLength={200} value={enjoyed} onChange={(e) => setEnjoyed(lim(e.target.value))} />
      <label className="fb-label">Which pig do you remember?</label>
      <input className="fb-input" maxLength={80} value={pig} onChange={(e) => setPig(e.target.value.slice(0, 80))} />
      <label className="fb-label">Would you play another level?</label>
      <input className="fb-input" maxLength={80} value={again} onChange={(e) => setAgain(e.target.value.slice(0, 80))} />
      <label className="fb-label">Category</label>
      <select className="fb-input" value={category} onChange={(e) => setCategory(e.target.value)}>
        {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
      </select>
      <button className="btn btn--primary btn--block" style={{ marginTop: 10 }} disabled={rating === 0} onClick={submit}>
        Save feedback
      </button>
      <p style={{ fontSize: '0.72rem', opacity: 0.6, margin: '6px 0 0', textAlign: 'center' }}>
        Saved on this device until exported.
      </p>
    </div>
  );
}
