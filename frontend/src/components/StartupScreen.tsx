import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';

const STARTUP_MINIMUM_MS = 950;

export function StartupScreen() {
  const { isLoading } = useAuth();
  const [minimumTimeElapsed, setMinimumTimeElapsed] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setMinimumTimeElapsed(true), STARTUP_MINIMUM_MS);
    return () => window.clearTimeout(timer);
  }, []);

  if (!isLoading && minimumTimeElapsed) return null;

  return (
    <div className="startup-screen" role="status" aria-live="polite" aria-label="Loading Nurtured Choice Products">
      <div className="startup-orbit startup-orbit-one" />
      <div className="startup-orbit startup-orbit-two" />
      <div className="startup-card">
        <div className="startup-logo-wrap">
          <img src="/icons/client-logo-source.png" alt="" className="startup-logo" />
        </div>
        <div className="startup-brand">Nurtured Choice</div>
        <div className="startup-title">Products Sales System</div>
        <div className="startup-loader" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <p className="startup-caption">Preparing your workspace</p>
      </div>
    </div>
  );
}
