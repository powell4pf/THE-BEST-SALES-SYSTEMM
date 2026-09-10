import { useCallback, useEffect, useState } from 'react';
import { Circle } from 'lucide-react';
import { api } from '../lib/api';

type Props = { compact?: boolean };

export function ConnectionStatus({ compact = false }: Props) {
  const [online, setOnline] = useState(false);

  const checkConnection = useCallback(async () => {
    if (!navigator.onLine) {
      setOnline(false);
      return;
    }

    try {
      const response = await fetch(`${api.baseUrl}/api/v1/health`, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });
      setOnline(response.ok);
    } catch {
      setOnline(false);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => { void checkConnection(); };
    const handleOffline = () => setOnline(false);
    const timer = window.setInterval(() => { void checkConnection(); }, 30_000);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    void checkConnection();

    return () => {
      window.clearInterval(timer);
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [checkConnection]);

  return <div className={`flex items-center gap-1.5 text-xs font-medium ${online ? 'text-emerald-600' : 'text-rose-600'} ${compact ? 'justify-center' : 'justify-end'}`} role="status" aria-live="polite" aria-label={`System is ${online ? 'online' : 'offline'}`}>
    <Circle className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
    <span>{online ? 'System online' : 'System offline'}</span>
  </div>;
}
