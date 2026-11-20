import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary.tsx';
import './index.css';

// Remove the auto-retry marker from the URL after a successful boot.
const url = new URL(window.location.href);
if (url.searchParams.has('bootRetry')) {
  url.searchParams.delete('bootRetry');
  window.history.replaceState({}, '', url.toString());
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);

