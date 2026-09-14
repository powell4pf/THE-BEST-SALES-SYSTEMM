import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Clock3, LifeBuoy, MessageSquare, Plus, Send, ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { api } from '../lib/api';
import { hasFullAdministrativeAccess, useAuth } from '../context/AuthContext';
import type { SupportTicketListItemDto } from '../lib/apiTypes';

const categories = ['Issue', 'Feature Request', 'Complaint', 'Question'];
const priorities = ['Low', 'Normal', 'High', 'Urgent'];
const statuses = ['Submitted', 'Acknowledged', 'In Progress', 'Waiting for Client', 'Resolved', 'Closed'];

function statusClass(status: string) {
  if (status === 'Resolved' || status === 'Closed') return 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300';
  if (status === 'In Progress' || status === 'Acknowledged') return 'bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300';
  if (status === 'Waiting for Client') return 'bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300';
  return 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300';
}

function priorityClass(priority: string) {
  return priority === 'Urgent' ? 'text-rose-600' : priority === 'High' ? 'text-amber-600' : 'text-slate-500';
}

function formatDate(value: string) {
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

export function SupportPage() {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const isManager = hasFullAdministrativeAccess(auth.user?.roles ?? []);
  const ticketsQuery = useQuery({ queryKey: ['supportTickets'], queryFn: api.listSupportTickets });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [filter, setFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [category, setCategory] = useState('Issue');
  const [priority, setPriority] = useState('Normal');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [reply, setReply] = useState('');
  const [internal, setInternal] = useState(false);
  const [status, setStatus] = useState('Submitted');
  const [ticketPriority, setTicketPriority] = useState('Normal');

  const detailQuery = useQuery({
    queryKey: ['supportTicket', selectedId],
    queryFn: () => api.getSupportTicket(selectedId!),
    enabled: Boolean(selectedId)
  });

  useEffect(() => {
    if (!selectedId && ticketsQuery.data?.[0]) setSelectedId(ticketsQuery.data[0].id);
  }, [selectedId, ticketsQuery.data]);

  useEffect(() => {
    if (detailQuery.data) {
      setStatus(detailQuery.data.status);
      setTicketPriority(detailQuery.data.priority);
    }
  }, [detailQuery.data]);

  const filteredTickets = useMemo(() => {
    const needle = filter.trim().toLowerCase();
    return (ticketsQuery.data ?? []).filter(ticket => !needle || [ticket.ticketNumber, ticket.subject, ticket.category, ticket.status, ticket.submittedBy].some(value => value.toLowerCase().includes(needle)));
  }, [filter, ticketsQuery.data]);

  const createTicket = useMutation({
    mutationFn: () => api.createSupportTicket({ subject, description, category, priority }),
    onSuccess: async ticket => {
      setSubject(''); setDescription(''); setCategory('Issue'); setPriority('Normal'); setShowCreate(false); setSelectedId(ticket.id);
      await queryClient.invalidateQueries({ queryKey: ['supportTickets'] });
      queryClient.setQueryData(['supportTicket', ticket.id], ticket);
    }
  });
  const sendReply = useMutation({
    mutationFn: () => api.addSupportTicketMessage(selectedId!, { body: reply, internal }),
    onSuccess: async ticket => { setReply(''); setInternal(false); queryClient.setQueryData(['supportTicket', ticket.id], ticket); await queryClient.invalidateQueries({ queryKey: ['supportTickets'] }); }
  });
  const updateTicket = useMutation({
    mutationFn: () => api.updateSupportTicket(selectedId!, { status, priority: ticketPriority }),
    onSuccess: async ticket => { queryClient.setQueryData(['supportTicket', ticket.id], ticket); await queryClient.invalidateQueries({ queryKey: ['supportTickets'] }); }
  });

  const selected = detailQuery.data;
  const counts = {
    open: (ticketsQuery.data ?? []).filter(ticket => !['Resolved', 'Closed'].includes(ticket.status)).length,
    urgent: (ticketsQuery.data ?? []).filter(ticket => ticket.priority === 'Urgent' && !['Resolved', 'Closed'].includes(ticket.status)).length,
    resolved: (ticketsQuery.data ?? []).filter(ticket => ['Resolved', 'Closed'].includes(ticket.status)).length
  };

  function submitTicket(event: React.FormEvent) {
    event.preventDefault();
    if (!subject.trim() || !description.trim() || createTicket.isPending) return;
    createTicket.mutate();
  }

  function submitReply(event: React.FormEvent) {
    event.preventDefault();
    if (!selectedId || !reply.trim() || sendReply.isPending) return;
    sendReply.mutate();
  }

  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-sky-950/30"><LifeBuoy className="h-5 w-5" /></div><div><h2 className="text-xl font-semibold">Help & Support</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Raise an issue, request an improvement, or track a response from the support team.</p></div></div></div>
      <Button onClick={() => setShowCreate(true)}><Plus className="h-4 w-4" />New ticket</Button>
    </div>

    <div className="grid gap-3 sm:grid-cols-3"><Card className="p-4"><div className="flex items-center justify-between"><span className="text-xs uppercase tracking-widest text-slate-400">Open tickets</span><Clock3 className="h-4 w-4 text-slate-400" /></div><div className="mt-2 text-2xl font-semibold">{counts.open}</div></Card><Card className="p-4"><div className="flex items-center justify-between"><span className="text-xs uppercase tracking-widest text-slate-400">Urgent attention</span><ShieldAlert className="h-4 w-4 text-rose-500" /></div><div className="mt-2 text-2xl font-semibold text-rose-600">{counts.urgent}</div></Card><Card className="p-4"><div className="flex items-center justify-between"><span className="text-xs uppercase tracking-widest text-slate-400">Resolved</span><CheckCircle2 className="h-4 w-4 text-emerald-600" /></div><div className="mt-2 text-2xl font-semibold text-emerald-600">{counts.resolved}</div></Card></div>

    <div className="grid min-w-0 gap-6 xl:grid-cols-[0.75fr_1.25fr]">
      <Card className="min-w-0 overflow-hidden p-0"><div className="border-b border-slate-200/70 p-5 dark:border-white/10"><div className="flex items-center justify-between gap-3"><div><h3 className="font-semibold">{isManager ? 'All support tickets' : 'My tickets'}</h3><p className="mt-1 text-xs text-slate-500">{filteredTickets.length} ticket{filteredTickets.length === 1 ? '' : 's'}</p></div><Input value={filter} onChange={event => setFilter(event.target.value)} placeholder="Search tickets" className="max-w-[12rem]" /></div></div><div className="max-h-[38rem] overflow-y-auto">{ticketsQuery.isLoading && <p className="p-8 text-center text-sm text-slate-500">Loading tickets...</p>}{ticketsQuery.error && <p className="p-5 text-sm text-rose-600">{(ticketsQuery.error as Error).message}</p>}{!ticketsQuery.isLoading && filteredTickets.length === 0 && <div className="p-10 text-center text-sm text-slate-500"><MessageSquare className="mx-auto mb-3 h-8 w-8 text-slate-300" />No support tickets yet.</div>}{filteredTickets.map(ticket => <TicketRow key={ticket.id} ticket={ticket} selected={ticket.id === selectedId} onClick={() => setSelectedId(ticket.id)} />)}</div></Card>

      <Card className="min-w-0 p-0">{selected ? <><div className="border-b border-slate-200/70 p-5 dark:border-white/10"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{selected.ticketNumber}</p><h3 className="mt-1 text-lg font-semibold">{selected.subject}</h3><p className="mt-1 text-sm text-slate-500">Submitted by {selected.submittedBy} · {formatDate(selected.createdAt)}</p></div><span className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass(selected.status)}`}>{selected.status}</span></div>{isManager && <div className="mt-4 flex flex-wrap items-end gap-3"><label className="text-xs font-medium text-slate-500">Status<select value={status} onChange={event => setStatus(event.target.value)} className="mt-1 block h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-900">{statuses.map(item => <option key={item}>{item}</option>)}</select></label><label className="text-xs font-medium text-slate-500">Priority<select value={ticketPriority} onChange={event => setTicketPriority(event.target.value)} className="mt-1 block h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-900">{priorities.map(item => <option key={item}>{item}</option>)}</select></label><Button size="sm" variant="outline" onClick={() => updateTicket.mutate()} disabled={updateTicket.isPending}>{updateTicket.isPending ? 'Updating...' : 'Save ticket'}</Button></div>}</div><div className="max-h-[25rem] space-y-4 overflow-y-auto p-5"><div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5"><p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Original request</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{selected.description}</p><div className="mt-3 flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-white px-2.5 py-1 text-slate-600 shadow-sm dark:bg-white/10 dark:text-slate-300">{selected.category}</span><span className={`rounded-full bg-white px-2.5 py-1 shadow-sm dark:bg-white/10 ${priorityClass(selected.priority)}`}>{selected.priority} priority</span></div></div>{selected.messages.map(message => <div key={message.id} className={`rounded-2xl border p-4 ${message.isInternal ? 'border-amber-200 bg-amber-50 dark:border-amber-500/20 dark:bg-amber-950/20' : 'border-slate-200 dark:border-white/10'}`}><div className="flex items-center justify-between gap-3 text-xs text-slate-500"><span className="font-medium">{message.isInternal ? 'Internal note' : message.messageType === 'StatusChanged' ? 'Status update' : message.author}</span><span>{formatDate(message.createdAt)}</span></div><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{message.body}</p></div>)}</div><form onSubmit={submitReply} className="border-t border-slate-200/70 p-5 dark:border-white/10"><textarea value={reply} onChange={event => setReply(event.target.value)} placeholder={isManager ? 'Reply to the client or add an internal note...' : 'Add more information for the support team...'} rows={3} className="w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-white/10 dark:bg-slate-900" />{isManager && <label className="mt-3 flex items-center gap-2 text-xs text-slate-500"><input type="checkbox" checked={internal} onChange={event => setInternal(event.target.checked)} />Internal note (hidden from the client)</label>}{(sendReply.error || updateTicket.error) && <p className="mt-2 text-sm text-rose-600">{((sendReply.error || updateTicket.error) as Error).message}</p>}<div className="mt-3 flex justify-end"><Button type="submit" disabled={!reply.trim() || sendReply.isPending}><Send className="h-4 w-4" />{sendReply.isPending ? 'Sending...' : 'Send response'}</Button></div></form></> : <div className="flex min-h-[28rem] items-center justify-center p-8 text-center text-sm text-slate-500"><div><AlertCircle className="mx-auto mb-3 h-8 w-8 text-slate-300" /><p>Select a ticket to view its progress.</p></div></div>}</Card>
    </div>

    {showCreate && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={() => setShowCreate(false)}><div className="w-full max-w-2xl rounded-3xl bg-white shadow-2xl dark:bg-slate-900" onClick={event => event.stopPropagation()}><form onSubmit={submitTicket}><div className="border-b border-slate-200/70 p-6 dark:border-white/10"><h3 className="text-lg font-semibold">Create support ticket</h3><p className="mt-1 text-sm text-slate-500">Give the support team enough detail to respond quickly.</p></div><div className="grid gap-4 p-6"><label className="text-sm font-medium">Subject<Input className="mt-2" value={subject} onChange={event => setSubject(event.target.value)} placeholder="Briefly describe the request" maxLength={180} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Category<select value={category} onChange={event => setCategory(event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-900">{categories.map(item => <option key={item}>{item}</option>)}</select></label><label className="text-sm font-medium">Priority<select value={priority} onChange={event => setPriority(event.target.value)} className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-slate-900">{priorities.map(item => <option key={item}>{item}</option>)}</select></label></div><label className="text-sm font-medium">Details<textarea value={description} onChange={event => setDescription(event.target.value)} placeholder="What happened, what did you expect, and how can we reproduce it?" maxLength={5000} rows={6} className="mt-2 w-full resize-y rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-400/20 dark:border-white/10 dark:bg-slate-900" /></label>{createTicket.error && <p className="text-sm text-rose-600">{(createTicket.error as Error).message}</p>}</div><div className="flex justify-end gap-3 border-t border-slate-200/70 p-6 dark:border-white/10"><Button type="button" variant="ghost" onClick={() => setShowCreate(false)}>Cancel</Button><Button type="submit" disabled={!subject.trim() || !description.trim() || createTicket.isPending}>{createTicket.isPending ? 'Submitting...' : 'Submit ticket'}</Button></div></form></div></div>}
  </div>;
}

function TicketRow({ ticket, selected, onClick }: { ticket: SupportTicketListItemDto; selected: boolean; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={`w-full border-b border-slate-200/70 p-5 text-left transition hover:bg-slate-50 dark:border-white/10 dark:hover:bg-white/5 ${selected ? 'bg-sky-50/70 dark:bg-sky-950/20' : ''}`}><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{ticket.ticketNumber}</p><p className="mt-1 truncate font-medium">{ticket.subject}</p></div><span className={`shrink-0 rounded-full px-2 py-1 text-[11px] font-medium ${statusClass(ticket.status)}`}>{ticket.status}</span></div><div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-500"><span className={priorityClass(ticket.priority)}>{ticket.priority} · {ticket.category}</span><span>{formatDate(ticket.lastActivityAt)}</span></div><p className="mt-2 truncate text-xs text-slate-400">{ticket.lastMessage ?? 'No messages yet'}</p></button>;
}
