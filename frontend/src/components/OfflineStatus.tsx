import { useCallback, useEffect, useRef, useState } from 'react';
import { Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { replayOfflineDraft } from '../lib/api';
import { listOfflineDrafts, removeOfflineDraft, updateOfflineDraft, type OfflineDraft } from '../lib/offlineStore';

export function OfflineStatus() {
  const [online, setOnline] = useState(() => navigator.onLine);
  const [drafts, setDrafts] = useState<OfflineDraft[]>([]);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  const refresh = useCallback(async () => setDrafts(await listOfflineDrafts()), []);
  const sync = useCallback(async () => {
    if (!navigator.onLine || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      for (const draft of await listOfflineDrafts()) {
        if (draft.status !== 'pending') continue;
        try {
          await replayOfflineDraft(draft);
          await updateOfflineDraft(draft.id, { status: 'synchronized', error: undefined });
        } catch (error) {
          await updateOfflineDraft(draft.id, { status: 'failed', error: error instanceof Error ? error.message : 'Synchronization failed.' });
          if (!navigator.onLine) break;
        }
      }
      await refresh();
    } finally { syncingRef.current = false; setSyncing(false); }
  }, [refresh]);

  useEffect(() => {
    const handleOnline = () => { setOnline(true); void sync(); };
    const handleOffline = () => setOnline(false);
    const handleDrafts = () => void refresh();
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('nurtured-choice-offline-drafts-changed', handleDrafts);
    void refresh();
    if (navigator.onLine) void sync();
    return () => { window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); window.removeEventListener('nurtured-choice-offline-drafts-changed', handleDrafts); };
  }, [refresh, sync]);

  const pending = drafts.filter((draft) => draft.status === 'pending').length;
  const failed = drafts.filter((draft) => draft.status === 'failed').length;
  if (online && pending === 0 && failed === 0) return null;
  return <div className="fixed bottom-4 left-4 z-[80] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-2xl border border-slate-200 bg-white/95 px-3 py-2 text-xs text-slate-700 shadow-xl backdrop-blur dark:border-white/10 dark:bg-slate-900/95 dark:text-slate-200">
    {online ? <Cloud className="h-4 w-4 text-emerald-600" /> : <CloudOff className="h-4 w-4 text-amber-600" />}
    <span>{online ? `${pending} offline draft${pending === 1 ? '' : 's'} pending sync${failed ? ` · ${failed} needs attention` : ''}` : 'Offline mode · cached data and drafts are available'}</span>
    {online && drafts.some((draft) => draft.status === 'pending' || draft.status === 'failed') && <button type="button" className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-white/10" onClick={() => { void Promise.all(drafts.filter((draft) => draft.status === 'failed').map((draft) => updateOfflineDraft(draft.id, { status: 'pending', error: undefined }))).then(() => sync()); }} aria-label="Retry offline drafts" disabled={syncing}><RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} /></button>}
  </div>;
}
