import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Check, X } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';

const labels: Record<string, string> = { InvoiceFinalize: 'Invoice finalization', InvoiceCreditSale: 'Credit sale', InvoiceCancellation: 'Invoice cancellation', StockAdjustment: 'Stock adjustment' };

export function ApprovalsPage() {
  const queryClient = useQueryClient();
  const [comment, setComment] = useState('');
  const query = useQuery({ queryKey: ['approvals'], queryFn: api.getApprovals, refetchInterval: 30000 });
  const mutation = useMutation({
    mutationFn: ({ id, approve }: { id: string; approve: boolean }) => approve ? api.approveRequest(id, comment) : api.rejectRequest(id, comment),
    onSuccess: async () => { setComment(''); await queryClient.invalidateQueries({ queryKey: ['approvals'] }); }
  });

  return <div className="space-y-6">
    <div><h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Approval Queue</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Review protected invoice and stock actions before they take effect.</p></div>
    <Card className="overflow-hidden p-0">
      {query.isLoading ? <div className="p-8 text-sm text-slate-500">Loading approval requests…</div> : query.error ? <div className="p-8 text-sm text-rose-600">Unable to load approval requests.</div> : (query.data ?? []).length === 0 ? <div className="p-10 text-center text-sm text-slate-500">No pending approvals.</div> : <div className="divide-y divide-slate-200/70 dark:divide-white/10">{query.data?.map((item) => <div key={item.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"><div><div className="font-semibold text-slate-950 dark:text-white">{labels[item.requestType] ?? item.requestType}</div><div className="mt-1 text-sm text-slate-500 dark:text-slate-400">Requested by {item.requestedByName} · {new Date(item.createdAt).toLocaleString()}</div><div className="mt-2 text-sm text-slate-600 dark:text-slate-300">{item.reason || 'No reason supplied.'}</div></div><div className="flex flex-wrap items-center gap-2"><input value={comment} onChange={(event) => setComment(event.target.value)} placeholder="Optional comment" className="h-10 min-w-48 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/5" /><Button size="sm" onClick={() => mutation.mutate({ id: item.id, approve: true })} disabled={mutation.isPending}><Check className="h-4 w-4" />Approve</Button><Button size="sm" variant="outline" className="text-rose-600" onClick={() => mutation.mutate({ id: item.id, approve: false })} disabled={mutation.isPending}><X className="h-4 w-4" />Reject</Button></div></div>)}</div>}
    </Card>
  </div>;
}
