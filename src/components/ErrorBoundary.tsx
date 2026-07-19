import { Component, type ErrorInfo, type ReactNode } from 'react';
import { logError, isPlaytest, downloadJson, buildDiagnostics } from '../playtest/playtest';
import { loadSave, listSnapshots } from '../save/save';
import { versionLabel } from '../version';

interface Props {
  children: ReactNode;
  /** Best-effort current screen/level for the error record. */
  context?: () => { screen?: string; level?: number };
}
interface State {
  error: Error | null;
}

/**
 * Top-level error boundary. Catches render failures, preserves the save, and
 * shows a friendly recovery screen. Stack details appear only in Playtest Mode;
 * ordinary players see a calm message and safe recovery actions.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    const ctx = this.props.context?.() ?? {};
    logError({
      message: error.message,
      stack: (info.componentStack || error.stack || '').slice(0, 2000),
      screen: ctx.screen,
      level: ctx.level,
    });
  }

  render() {
    if (!this.state.error) return this.props.children;
    const playtest = isPlaytest();
    const snaps = listSnapshots();
    return (
      <div className="screen error-screen">
        <div className="dialog" role="alertdialog" aria-label="Something went wrong">
          <p className="big" aria-hidden="true">🐷💤</p>
          <h2>The piggies need a moment</h2>
          <p style={{ fontWeight: 700, margin: 0 }}>
            Something went wrong, but your progress is safe on this device.
          </p>
          <button className="btn btn--primary btn--block" onClick={() => window.location.reload()}>
            ↻ Reload the game
          </button>
          <button
            className="btn btn--ghost btn--block"
            onClick={() => { try { downloadJson(buildDiagnostics(loadSave()), 'pixel-piggies-diagnostics.json'); } catch { /* ignore */ } }}
          >
            ⬇ Export diagnostics
          </button>
          {snaps.length > 0 && (
            <p style={{ fontSize: '0.78rem', opacity: 0.7, margin: '4px 0 0' }}>
              {snaps.length} save backup{snaps.length === 1 ? '' : 's'} available — reload, then use
              Settings → Save &amp; Backup to restore if needed.
            </p>
          )}
          {playtest && (
            <pre className="error-stack">{this.state.error.message}{'\n'}{this.state.error.stack?.slice(0, 900)}</pre>
          )}
          <p style={{ fontSize: '0.7rem', opacity: 0.5, margin: '6px 0 0' }}>{versionLabel()}</p>
        </div>
      </div>
    );
  }
}
