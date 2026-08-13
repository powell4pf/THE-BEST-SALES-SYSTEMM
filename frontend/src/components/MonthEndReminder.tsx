import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BarChart3, FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { Button } from './ui/button';

export function MonthEndReminder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [visible, setVisible] = useState(true);
  const reminders = useQuery({ queryKey: ['reminders', 'month-end'], queryFn: api.getMonthEndReminders, staleTime: 60_000 });
  const markRead = useMutation({ mutationFn: api.markMonthEndReminderRead, onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reminders', 'month-end'] }) });
  const reminder = reminders.data?.[0];

  function open(path: '/statements' | '/reports') {
    if (reminder) markRead.mutate(reminder.id);
    navigate(path);
  }

  if (!visible || !reminder) return null;
  return (
    <aside className="month-end-reminder" role="status" aria-live="polite">
      <div className="min-w-0"><div className="text-sm font-semibold text-slate-950 dark:text-white">{reminder.title}</div><p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">{reminder.message}</p></div>
      <div className="flex flex-wrap gap-2"><Button size="sm" variant="outline" onClick={() => open('/statements')}><FileText className="h-4 w-4" /> Statements</Button><Button size="sm" variant="primary" onClick={() => open('/reports')}><BarChart3 className="h-4 w-4" /> Reports</Button><Button size="sm" variant="ghost" onClick={() => { markRead.mutate(reminder.id); setVisible(false); }}>Later</Button></div>
    </aside>
  );
}
