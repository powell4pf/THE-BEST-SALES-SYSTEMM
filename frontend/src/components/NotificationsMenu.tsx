import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Button } from './ui/button';

function relativeTime(value: string) {
  const timestamp = Date.parse(value);
  if (!Number.isFinite(timestamp) || timestamp < Date.UTC(2000, 0, 1)) return 'Just now';
  const seconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (seconds < 60) return 'Just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function NotificationsMenu() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({ queryKey: ['notifications'], queryFn: api.listNotifications, refetchInterval: 30_000, staleTime: 15_000 });
  const markRead = useMutation({ mutationFn: api.markNotificationRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }) });
  const markAllRead = useMutation({ mutationFn: api.markAllNotificationsRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }) });
  const notifications = notificationsQuery.data ?? [];
  const unreadCount = notifications.filter((notification) => !notification.readAt).length;

  useEffect(() => {
    const close = (event: MouseEvent) => { if (!containerRef.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  function openNotification(id: string, route: string, readAt: string | null) {
    if (!readAt) markRead.mutate(id);
    setOpen(false);
    navigate(route);
  }

  return <div ref={containerRef} className="relative z-[100]">
    <Button variant="outline" size="sm" className="relative h-10 w-10 rounded-xl px-0" onClick={() => setOpen((value) => !value)} aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`} aria-expanded={open}>
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">{unreadCount > 9 ? '9+' : unreadCount}</span>}
    </Button>
    {open && <div className="notification-popover absolute right-0 top-12 z-[100] w-[min(24rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl ring-1 ring-slate-950/5 dark:border-white/10 dark:bg-slate-900 dark:text-white">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-white/10"><div><h2 className="text-sm font-semibold">Notifications</h2><p className="text-xs text-slate-500 dark:text-slate-400">Document activity and generated records</p></div><Button variant="ghost" size="sm" className="h-8 px-2 text-xs" onClick={() => markAllRead.mutate()} disabled={!unreadCount || markAllRead.isPending}><CheckCheck className="h-3.5 w-3.5" />Read all</Button></div>
      <div className="max-h-[22rem] min-h-[5rem] overflow-y-auto bg-white p-2 dark:bg-slate-900">{notificationsQuery.isLoading ? <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading notifications...</div> : notificationsQuery.isError ? <div className="px-4 py-8 text-center text-sm text-rose-600 dark:text-rose-300">Unable to load notifications. Try Refresh.</div> : notifications.length === 0 ? <div className="px-4 py-8 text-center text-sm text-slate-500 dark:text-slate-400"><Bell className="mx-auto mb-2 h-6 w-6 opacity-50" />No document notifications yet.</div> : notifications.map((notification) => <button type="button" key={notification.id} className={`flex w-full gap-3 rounded-xl border p-3 text-left text-slate-950 transition hover:bg-slate-100 dark:text-white dark:hover:bg-white/10 ${notification.readAt ? 'border-slate-200 bg-white dark:border-white/10 dark:bg-slate-900' : 'border-sky-200 bg-sky-50 dark:border-sky-500/30 dark:bg-sky-500/10'}`} onClick={() => openNotification(notification.id, notification.route, notification.readAt)}><span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-950 text-white dark:bg-white dark:text-slate-950"><FileText className="h-4 w-4" /></span><span className="min-w-0 flex-1 break-words"><span className="flex items-start justify-between gap-2"><span className="min-w-0 break-words text-sm font-semibold">{notification.title}</span>{!notification.readAt && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-sky-500" />}</span><span className="mt-0.5 block break-words text-xs text-slate-600 dark:text-slate-300">{notification.message}</span><span className="mt-1 block text-[11px] text-slate-400">{relativeTime(notification.createdAt)}</span></span></button>)}</div>
    </div>}
  </div>;
}
