import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { initPlaytestFromUrl } from './playtest/playtest';
import './index.css';

// Read ?playtest=1 / ?dev=1 once and persist before the app mounts.
initPlaytestFromUrl();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
