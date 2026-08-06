import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Mail, MessageCircle, Search, Send, UsersRound } from 'lucide-react';
import { api } from '../lib/api';
import type { CollectionCustomerDto } from '../lib/apiTypes';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { openCollectionsPrintWindow } from '../lib/print';

const currency = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });
const followUpStatuses = ['Not contacted', 'Contacted', 'Promised to pay', 'Dispute', 'Escalated', 'Paid'];

function money(value: number) { return `KES ${currency.format(value)}`; }
function reminderMessage(customer: CollectionCustomerDto) {
  return `Dear ${customer.contactPerson || customer.customerName}, this is a friendly reminder that your outstanding account balance with Nurtured Choice Products is ${money(customer.outstandingBalance)}. Please contact us if you need a statement or have any questions. Thank you.`;
}

export function CollectionsPage() {
  const queryClient = useQueryClient();
  const overviewQuery = useQuery({ queryKey: ['collections', 'overview'], queryFn: () => api.getCollectionsOverview() });
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = overviewQuery.data?.customers.find((customer) => customer.customerId === selectedId) ?? null;
  const [status, setStatus] = useState('Not contacted');
  const [nextDate, setNextDate] = useState('');
  const [method, setMethod] = useState('Phone');
  const [notes, setNotes] = useState('');

  const saveFollowUp = useMutation({
    mutationFn: () => api.updateCollectionFollowUp(selectedId as string, { status, nextFollowUpDate: nextDate || null, contactMethod: method, notes: notes || null }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['collections', 'overview'] }); }
  });

  const customers = useMemo(() => {
    const rows = overviewQuery.data?.customers ?? [];
    const term = search.trim().toLowerCase();
    return rows.filter((customer) => {
      const matchesSearch = !term || [customer.customerName, customer.contactPerson, customer.email, customer.phone].filter(Boolean).some((value) => value!.toLowerCase().includes(term));
      const matchesFilter = filter === 'all' || (filter === 'overdue' && customer.overdueBalance > 0) || (filter === 'over-limit' && customer.riskStatus === 'Over credit limit') || (filter === 'follow-up' && customer.followUpStatus !== 'Not contacted');
      return matchesSearch && matchesFilter;
    });
  }, [filter, overviewQuery.data, search]);

  function selectCustomer(customer: CollectionCustomerDto) {
    setSelectedId(customer.customerId); setStatus(customer.followUpStatus); setNextDate(customer.nextFollowUpDate ?? ''); setMethod(customer.lastContactMethod || 'Phone'); setNotes(customer.notes ?? '');
  }

  function openWhatsApp(customer: CollectionCustomerDto) {
    if (!customer.phone) return;
    const phone = customer.phone.replace(/[^\d]/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(reminderMessage(customer))}`, '_blank', 'noopener,noreferrer');
  }

  function openEmail(customer: CollectionCustomerDto) {
    if (!customer.email) return;
    window.location.href = `mailto:${customer.email}?subject=${encodeURIComponent('Account balance reminder')}&body=${encodeURIComponent(reminderMessage(customer))}`;
  }

  const data = overviewQuery.data;
  return <div className="space-y-6">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div><p className="eyebrow">Accounts receivable</p><h1 className="mt-2 text-3xl font-semibold text-slate-950 dark:text-white">Receivables & Collections</h1><p className="mt-2 max-w-2xl text-sm text-slate-500 dark:text-slate-400">See who owes money, what is overdue, and the next action for every customer.</p></div>
      <div className="flex gap-2"><Button variant="outline" onClick={() => overviewQuery.refetch()} disabled={overviewQuery.isFetching}>Refresh</Button><Button onClick={() => data && openCollectionsPrintWindow({ totalOutstanding: data.totalOutstanding, totalOverdue: data.totalOverdue, dueToday: data.dueToday, customers })} disabled={!data || overviewQuery.isLoading}><Send className="h-4 w-4" /> Print list</Button></div>
    </div>
    {overviewQuery.error && <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">Unable to load collections: {(overviewQuery.error as Error).message}</div>}
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Total outstanding" value={money(data?.totalOutstanding ?? 0)} tone="sky" />
      <Metric label="Overdue" value={money(data?.totalOverdue ?? 0)} tone="rose" />
      <Metric label="Due today" value={money(data?.dueToday ?? 0)} tone="amber" />
      <Metric label="Customers to follow up" value={String(data?.customersOverdue ?? 0)} tone="emerald" />
    </div>
    <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
      <Card className="overflow-hidden"><div className="flex flex-col gap-3 border-b border-slate-200/70 p-5 dark:border-white/10 sm:flex-row"><div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input className="pl-10" placeholder="Search customers..." value={search} onChange={(event) => setSearch(event.target.value)} /></div><Select className="sm:w-52" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">All customers</option><option value="overdue">Overdue only</option><option value="over-limit">Over credit limit</option><option value="follow-up">Already contacted</option></Select></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50/80 text-left text-xs uppercase tracking-wider text-slate-500 dark:bg-white/[0.03]"><tr><th className="px-5 py-3">Customer</th><th className="px-3 py-3 text-right">Outstanding</th><th className="px-3 py-3 text-right">Overdue</th><th className="px-3 py-3">Status</th><th className="px-5 py-3">Next action</th></tr></thead><tbody>{customers.map((customer) => <tr key={customer.customerId} className={`cursor-pointer border-t border-slate-200/70 hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/[0.03] ${selectedId === customer.customerId ? 'bg-sky-50/70 dark:bg-sky-500/10' : ''}`} onClick={() => selectCustomer(customer)}><td className="px-5 py-4"><p className="font-semibold text-slate-900 dark:text-white">{customer.customerName}</p><p className="mt-1 text-xs text-slate-500">{customer.contactPerson || customer.email || 'No contact details'}</p></td><td className="px-3 py-4 text-right font-semibold">{money(customer.outstandingBalance)}</td><td className="px-3 py-4 text-right text-rose-600">{money(customer.overdueBalance)}</td><td className="px-3 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-medium ${customer.riskStatus === 'Current' ? 'bg-emerald-100 text-emerald-700' : customer.riskStatus === 'Over credit limit' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'}`}>{customer.riskStatus}</span></td><td className="px-5 py-4 text-xs text-slate-600 dark:text-slate-300">{customer.followUpStatus}{customer.nextFollowUpDate ? ` · ${customer.nextFollowUpDate}` : ''}</td></tr>)}</tbody></table>{!overviewQuery.isLoading && customers.length === 0 && <div className="p-8 text-center text-sm text-slate-500">No customers match this view.</div>}</div></Card>
      <Card className="p-5">{selected ? <div className="space-y-5"><div><p className="text-xs uppercase tracking-widest text-slate-500">Selected account</p><h2 className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">{selected.customerName}</h2><p className="mt-1 text-sm text-slate-500">{selected.email || selected.phone || 'No contact details recorded'}</p></div><div className="grid grid-cols-2 gap-3"><Mini label="Balance" value={money(selected.outstandingBalance)} /><Mini label="Oldest overdue" value={`${selected.oldestDaysOverdue} days`} /></div><div className="space-y-3"><h3 className="font-semibold">Invoices requiring attention</h3>{selected.invoices.map((invoice) => <div key={invoice.invoiceId} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-white/10"><div className="flex justify-between gap-3"><span className="font-medium">{invoice.invoiceNumber}</span><span className="font-semibold">{money(invoice.outstanding)}</span></div><p className="mt-1 text-xs text-slate-500">Due {invoice.dueDate || invoice.invoiceDate}{invoice.daysOverdue ? ` · ${invoice.daysOverdue} days overdue` : ' · Current'}</p></div>)}</div><div className="flex flex-wrap gap-2"><Button size="sm" onClick={() => openWhatsApp(selected)} disabled={!selected.phone}><MessageCircle className="h-4 w-4" /> WhatsApp reminder</Button><Button size="sm" variant="outline" onClick={() => openEmail(selected)} disabled={!selected.email}><Mail className="h-4 w-4" /> Email reminder</Button></div><div className="border-t border-slate-200/70 pt-4 dark:border-white/10"><h3 className="font-semibold">Record follow-up</h3><div className="mt-3 grid gap-3"><Select value={status} onChange={(event) => setStatus(event.target.value)}>{followUpStatuses.map((item) => <option key={item}>{item}</option>)}</Select><div className="grid gap-3 sm:grid-cols-2"><Select value={method} onChange={(event) => setMethod(event.target.value)}><option>Phone</option><option>WhatsApp</option><option>Email</option><option>In person</option></Select><Input type="date" value={nextDate} onChange={(event) => setNextDate(event.target.value)} /></div><textarea className="min-h-24 w-full rounded-2xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-sky-500 dark:border-white/10 dark:bg-white/[0.04]" placeholder="Add collection notes..." value={notes} onChange={(event) => setNotes(event.target.value)} /><Button onClick={() => saveFollowUp.mutate()} disabled={saveFollowUp.isPending}>{saveFollowUp.isPending ? 'Saving...' : 'Save follow-up'}</Button>{saveFollowUp.error && <p className="text-sm text-rose-600">{(saveFollowUp.error as Error).message}</p>}{saveFollowUp.isSuccess && <p className="flex items-center gap-2 text-sm text-emerald-600"><CheckCircle2 className="h-4 w-4" /> Follow-up saved.</p>}</div></div></div> : <div className="flex min-h-[28rem] flex-col items-center justify-center text-center"><UsersRound className="h-10 w-10 text-slate-300" /><h2 className="mt-4 font-semibold text-slate-950 dark:text-white">Select a customer</h2><p className="mt-2 max-w-xs text-sm text-slate-500">Choose a customer from the list to see invoices, send a reminder, and record the next collection action.</p></div>}</Card>
    </div>
  </div>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone: 'sky' | 'rose' | 'amber' | 'emerald' }) { const colors = { sky: 'border-sky-400', rose: 'border-rose-400', amber: 'border-amber-400', emerald: 'border-emerald-400' }; return <Card className={`border-t-4 ${colors[tone]} p-5`}><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{value}</p></Card>; }
function Mini({ label, value }: { label: string; value: string }) { return <div className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.04]"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">{value}</p></div>; }
