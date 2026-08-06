import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles/globals.css';
import { AuthProvider } from './context/AuthContext';
import ErrorBoundary from './pages/ErrorBoundary';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false
    }
  }
});

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <GoogleOAuthProvider clientId={googleClientId ?? ''}>
          <Router>
            <AuthProvider>
              <App />
            </AuthProvider>
          </Router>
        </GoogleOAuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
