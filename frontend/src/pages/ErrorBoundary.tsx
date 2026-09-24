import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error: _, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error caught by ErrorBoundary:", error, errorInfo);
    if (/dynamically imported module|importing a module script failed|loading chunk/i.test(error.message) && !sessionStorage.getItem('nurtured-choice.chunk-recovery')) {
      sessionStorage.setItem('nurtured-choice.chunk-recovery', '1');
      void Promise.all([
        'serviceWorker' in navigator ? navigator.serviceWorker.getRegistrations().then((registrations) => Promise.all(registrations.map((registration) => registration.unregister()))) : Promise.resolve(),
        'caches' in window ? caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))) : Promise.resolve()
      ]).finally(() => window.location.reload());
    }
    this.setState({
      error: error,
      errorInfo: errorInfo,
    });
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div style={{ padding: '20px', border: '1px solid #e3342f', borderRadius: '8px', backgroundColor: '#fff5f5', color: '#e3342f', margin: '20px' }}>
          <h2>Oops! Something went wrong.</h2>
          <p>We're sorry, but an unexpected error occurred. Please try refreshing the page.</p>
          <details style={{ whiteSpace: 'pre-wrap', marginTop: '10px', fontSize: '12px', color: '#a0aec0' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo?.componentStack}
          </details>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
