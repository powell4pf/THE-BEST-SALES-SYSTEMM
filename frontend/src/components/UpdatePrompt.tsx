import { useEffect, useRef, useState } from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from './ui/button';

const updateEvent = 'nurtured-choice-update-available';

export function UpdatePrompt() {
  const [visible, setVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const showUpdate = (event: Event) => {
      registrationRef.current = (event as CustomEvent<ServiceWorkerRegistration>).detail;
      setVisible(true);
    };

    window.addEventListener(updateEvent, showUpdate);
    void navigator.serviceWorker.getRegistration().then((registration) => {
      if (registration?.waiting && navigator.serviceWorker.controller) {
        registrationRef.current = registration;
        setVisible(true);
      }
    });

    return () => window.removeEventListener(updateEvent, showUpdate);
  }, []);

  function updateNow() {
    const waitingWorker = registrationRef.current?.waiting;
    if (!waitingWorker) return;
    setUpdating(true);
    window.dispatchEvent(new Event('nurtured-choice-update-requested'));
    waitingWorker.postMessage({ type: 'SKIP_WAITING' });
  }

  if (!visible) return null;

  return (
    <aside className="update-prompt" role="status" aria-live="polite">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-slate-950 dark:text-white">Update available</div>
        <p className="mt-0.5 text-xs leading-5 text-slate-600 dark:text-slate-300">A newer version is ready. Update when you have finished your current work.</p>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <Button size="sm" variant="primary" onClick={updateNow} disabled={updating}>{updating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{updating ? 'Updating' : 'Update'}</Button>
        <Button size="sm" variant="ghost" className="h-8 w-8 rounded-xl px-0" onClick={() => setVisible(false)} aria-label="Dismiss update message"><X className="h-4 w-4" /></Button>
      </div>
    </aside>
  );
}
