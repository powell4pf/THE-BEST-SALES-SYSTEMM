import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles/globals.css';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './pages/ErrorBoundary';

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    let reloadForUpdate = false;
    const announceUpdate = (registration: ServiceWorkerRegistration) => {
      window.dispatchEvent(new CustomEvent<ServiceWorkerRegistration>('nurtured-choice-update-available', { detail: registration }));
    };

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (reloadForUpdate || navigator.serviceWorker.controller) window.location.reload();
    });

    void navigator.serviceWorker.register('/service-worker.js?v=5', { updateViaCache: 'none' }).then((registration) => {
      if (registration.waiting && navigator.serviceWorker.controller) announceUpdate(registration);
      registration.addEventListener('updatefound', () => {
        const worker = registration.installing;
        if (!worker) return;
        worker.addEventListener('statechange', () => {
          if (worker.state === 'installed' && navigator.serviceWorker.controller) announceUpdate(registration);
        });
      });
      window.addEventListener('nurtured-choice-update-requested', () => { reloadForUpdate = true; }, { once: true });
    }).catch(() => {
      // The application remains fully usable when a browser blocks service workers.
    });
  });
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false
    }
  }
});

// Google OAuth client IDs are public identifiers. Keep a local fallback so a
// missing runtime env file never removes the sign-in button from the UI.
const googleClientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined)
  || '105408819867-ng27fm94t4t03evofv5lf2bs7717f3ab.apps.googleusercontent.com';

const application = (
  <Router>
    <AuthProvider>
      <App />
    </AuthProvider>
  </Router>
);

const authenticatedApplication = <GoogleOAuthProvider clientId={googleClientId}>{application}</GoogleOAuthProvider>;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {authenticatedApplication}
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
