import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CloudOff, RefreshCw, Trash2 } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { replayOfflineDraft } from '../lib/api';
import { listOfflineDrafts, removeOfflineDraft, updateOfflineDraft, type OfflineDraft } from '../lib/offlineStore';

const labels = { invoice: 'Invoice', payment: 'Payment', stock: 'Stock / product' } as const;
const statusStyles = { pending: 'text-amber-700 bg-amber-50', failed: 'text-rose-700 bg-rose-50', synchronized: 'text-emerald-700 bg-emerald-50' } as const;

export function OfflineSyncPage() {
  const [drafts, setDrafts] = useState<OfflineDraft[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [online, setOnline] = useState(() => navigator.onLine);
  const refresh = useCallback(async () => setDrafts(await listOfflineDrafts()), []);
  useEffect(() => { void refresh(); const handler = () => void refresh(); const handleOnline = () => setOnline(true); const handleOffline = () => setOnline(false); window.addEventListener('nurtured-choice-offline-drafts-changed', handler); window.addEventListener('online', handleOnline); window.addEventListener('offline', handleOffline); return () => { window.removeEventListener('nurtured-choice-offline-drafts-changed', handler); window.removeEventListener('online', handleOnline); window.removeEventListener('offline', handleOffline); }; }, [refresh]);

  async function retry(draft: OfflineDraft) {
    if (!online) return;
    setBusyId(draft.id);
    await updateOfflineDraft(draft.id, { status: 'pending', error: undefined });
    try { await replayOfflineDraft(draft); await updateOfflineDraft(draft.id, { status: 'synchronized', error: undefined }); }
    catch (error) { await updateOfflineDraft(draft.id, { status: 'failed', error: error instanceof Error ? error.message : 'Synchronization failed.' }); }
    finally { setBusyId(null); await refresh(); }
  }

  async function discard(draft: OfflineDraft) {
    if (!window.confirm(`Discard this local ${labels[draft.kind].toLowerCase()} draft? This cannot be undone.`)) return;
    await removeOfflineDraft(draft.id);
    await refresh();
  }

  const counts = { pending: drafts.filter((draft) => draft.status === 'pending').length, failed: drafts.filter((draft) => draft.status === 'failed').length, synchronized: drafts.filter((draft) => draft.status === 'synchronized').length };
  return <div className="space-y-6"><div><h2 className="text-xl font-semibold">Offline Sync Center</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Review local drafts and synchronization results. Finalized invoices, payments, and stock changes are created only after the server accepts them.</p></div><div className="grid gap-3 sm:grid-cols-3"><Card className="p-4"><div className="text-xs uppercase tracking-widest text-slate-400">Pending</div><div className="mt-2 text-2xl font-semibold">{counts.pending}</div></Card><Card className="p-4"><div className="text-xs uppercase tracking-widest text-slate-400">Needs attention</div><div className="mt-2 text-2xl font-semibold text-rose-600">{counts.failed}</div></Card><Card className="p-4"><div className="text-xs uppercase tracking-widest text-slate-400">Synchronized</div><div className="mt-2 text-2xl font-semibold text-emerald-600">{counts.synchronized}</div></Card></div><Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="px-5 py-3">Type</th><th>Created</th><th>Status</th><th>Error / conflict</th><th className="text-right">Actions</th></tr></thead><tbody>{drafts.map((draft) => <tr key={draft.id} className="border-b last:border-0"><td className="px-5 py-4 font-medium">{labels[draft.kind]}</td><td className="text-slate-500">{new Date(draft.createdAt).toLocaleString()}</td><td><span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusStyles[draft.status]}`}>{draft.status === 'failed' ? 'Needs attention' : draft.status[0].toUpperCase() + draft.status.slice(1)}</span></td><td className="max-w-xs text-xs text-rose-600">{draft.error ?? '—'}</td><td><div className="flex justify-end gap-2 px-5 py-2">{draft.status !== 'synchronized' && <Button size="sm" variant="outline" onClick={() => void retry(draft)} disabled={!online || busyId === draft.id}><RefreshCw className={`h-3.5 w-3.5 ${busyId === draft.id ? 'animate-spin' : ''}`} />Retry</Button>}<Button size="sm" variant="ghost" className="text-rose-600" onClick={() => void discard(draft)} disabled={busyId === draft.id}><Trash2 className="h-3.5 w-3.5" />Discard</Button></div></td></tr>)}</tbody></table>{drafts.length === 0 && <div className="p-10 text-center text-sm text-slate-500"><CloudOff className="mx-auto mb-3 h-8 w-8 text-slate-300" />No offline drafts or synchronization history yet.</div>}</div></Card>{!online && <p className="flex items-center gap-2 text-sm text-amber-700"><AlertTriangle className="h-4 w-4" />You are offline. Retry becomes available when the connection returns.</p>}<p className="flex items-center gap-2 text-xs text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-600" />Synchronized records are kept locally as history and do not replace the official server records.</p></div>;
}
