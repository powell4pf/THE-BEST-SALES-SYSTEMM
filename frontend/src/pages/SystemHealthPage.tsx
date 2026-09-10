import { useCallback, useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Clock3, Database, RefreshCw, Server } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { api } from '../lib/api';
import { listOfflineDrafts, type OfflineDraft } from '../lib/offlineStore';

type Health = { status: string; api: string; database: string; latencyMs: number; utcNow: string };

export function SystemHealthPage() {
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<OfflineDraft[]>([]);
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const checkHealth = useCallback(async () => {
    setChecking(true);
    try {
      const response = await fetch(`${api.baseUrl}/api/v1/health`, { cache: 'no-store', headers: { Accept: 'application/json' } });
      const body = await response.json().catch(() => null) as Health | null;
      if (!response.ok || !body) throw new Error(body?.database === 'unavailable' ? 'The database is unavailable.' : 'The API health check failed.');
      setHealth(body);
      setHealthError(null);
    } catch (error) {
      setHealth(null);
      setHealthError(error instanceof Error ? error.message : 'The system health check failed.');
    } finally { setLastChecked(new Date()); setChecking(false); }
  }, []);

  const refreshDrafts = useCallback(async () => setDrafts(await listOfflineDrafts()), []);
  useEffect(() => {
    void checkHealth();
    void refreshDrafts();
    const healthTimer = window.setInterval(() => void checkHealth(), 30_000);
    const draftHandler = () => void refreshDrafts();
    window.addEventListener('nurtured-choice-offline-drafts-changed', draftHandler);
    return () => { window.clearInterval(healthTimer); window.removeEventListener('nurtured-choice-offline-drafts-changed', draftHandler); };
  }, [checkHealth, refreshDrafts]);

  const failedDrafts = drafts.filter((draft) => draft.status === 'failed');
  const pendingDrafts = drafts.filter((draft) => draft.status === 'pending');
  const healthy = Boolean(health && !healthError);
  const checks = [
    { label: 'API service', value: health?.api === 'healthy' ? 'Healthy' : 'Unavailable', icon: Server, ok: health?.api === 'healthy' },
    { label: 'Database', value: health?.database === 'healthy' ? 'Connected' : 'Unavailable', icon: Database, ok: health?.database === 'healthy' },
    { label: 'Offline synchronization', value: failedDrafts.length ? `${failedDrafts.length} needs attention` : `${pendingDrafts.length} pending`, icon: Activity, ok: failedDrafts.length === 0 }
  ];

  return <div className="space-y-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">System Health</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Live checks for the API, database, response time, and offline synchronization.</p></div><Button size="sm" variant="outline" onClick={() => { void checkHealth(); void refreshDrafts(); }} disabled={checking}><RefreshCw className={`h-4 w-4 ${checking ? 'animate-spin' : ''}`} />Check now</Button></div>{healthError && <div className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-500/20 dark:bg-rose-950/30 dark:text-rose-200"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><strong>System health alert</strong><p className="mt-1">{healthError} Check Railway deployment logs and database availability.</p></div></div>}{failedDrafts.length > 0 && <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-950/30 dark:text-amber-200"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" /><div><strong>Synchronization alert</strong><p className="mt-1">{failedDrafts.length} offline draft{failedDrafts.length === 1 ? ' has' : 's have'} failed to synchronize. Open Offline Sync to review and retry safely.</p></div></div>}<div className="grid gap-4 md:grid-cols-3">{checks.map(({ label, value, icon: Icon, ok }) => <Card key={label} className="p-5"><div className="flex items-center justify-between"><Icon className="h-5 w-5 text-slate-400" />{ok ? <CheckCircle2 className="h-5 w-5 text-emerald-600" /> : <AlertTriangle className="h-5 w-5 text-rose-600" />}</div><p className="mt-4 text-xs uppercase tracking-widest text-slate-400">{label}</p><p className={`mt-2 font-semibold ${ok ? 'text-emerald-600' : 'text-rose-600'}`}>{value}</p></Card>)}</div><Card className="p-5"><div className="flex items-center gap-2 font-semibold"><Clock3 className="h-4 w-4 text-slate-400" />Performance</div><div className="mt-4 grid gap-4 sm:grid-cols-3"><div><p className="text-xs text-slate-500">API response</p><p className="mt-1 text-lg font-semibold">{health ? `${health.latencyMs} ms` : '—'}</p></div><div><p className="text-xs text-slate-500">Overall status</p><p className={`mt-1 text-lg font-semibold ${healthy ? 'text-emerald-600' : 'text-rose-600'}`}>{healthy ? 'Healthy' : 'Needs attention'}</p></div><div><p className="text-xs text-slate-500">Last checked</p><p className="mt-1 text-lg font-semibold">{lastChecked ? lastChecked.toLocaleTimeString() : '—'}</p></div></div></Card></div>;
}
