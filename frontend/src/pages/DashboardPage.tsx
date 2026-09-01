import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { ArrowUpRight, Boxes, FileText, PackageCheck, Plus, Receipt, Users, WalletCards } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Select } from '../components/ui/select';
import { StatCard } from '../components/StatCard';
import { api } from '../lib/api';
import type { StatCardData } from '../lib/types';

const money = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en-KE', { notation: 'compact', maximumFractionDigits: 1 });

type DateFilter = 'today' | 'week' | 'month' | 'custom';

function kenyaToday() {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
}

function addDays(date: string, days: number) {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function dateRangeFor(filter: DateFilter, customStart: string, customEnd: string) {
  const today = kenyaToday();
  if (filter === 'today') return { startDate: today, endDate: today, label: 'Today' };
  if (filter === 'week') return { startDate: addDays(today, -6), endDate: today, label: 'Last 7 days' };
  if (filter === 'month') return { startDate: `${today.slice(0, 8)}01`, endDate: today, label: 'This month' };
  return { startDate: customStart, endDate: customEnd, label: 'Custom range' };
}

function dateLabel(startDate: string, endDate: string) {
  const format = (value: string) => new Date(`${value}T00:00:00Z`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
  return startDate === endDate ? format(startDate) : `${format(startDate)} – ${format(endDate)}`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState<DateFilter>('month');
  const [customStartDate, setCustomStartDate] = useState(() => addDays(kenyaToday(), -29));
  const [customEndDate, setCustomEndDate] = useState(kenyaToday);
  const dateRange = useMemo(() => dateRangeFor(dateFilter, customStartDate, customEndDate), [dateFilter, customStartDate, customEndDate]);
  const rangeDays = dateRange.startDate && dateRange.endDate ? (new Date(`${dateRange.endDate}T00:00:00Z`).getTime() - new Date(`${dateRange.startDate}T00:00:00Z`).getTime()) / 86_400_000 + 1 : 0;
  const validRange = Boolean(dateRange.startDate && dateRange.endDate && dateRange.startDate <= dateRange.endDate && rangeDays <= 366);
  const [summary, period, activity] = useQueries({
    queries: [
      { queryKey: ['dashboard', 'summary'], queryFn: api.getDashboardSummary, refetchInterval: 15000, staleTime: 0 },
      { queryKey: ['dashboard', 'period', dateRange.startDate, dateRange.endDate], queryFn: () => api.getDashboardPeriod(dateRange.startDate, dateRange.endDate), enabled: validRange, refetchInterval: 15000, staleTime: 0 },
      { queryKey: ['dashboard', 'activity'], queryFn: api.getRecentActivity, refetchInterval: 15000, staleTime: 0 }
    ]
  });

  const data = summary.data;
  const periodData = period.data;
  const comparisonLabel = periodData?.salesChangePercentage == null
    ? (periodData?.previousSales ? `Compared with ${money.format(periodData.previousSales)}` : 'No earlier sales to compare')
    : `${periodData.salesChangePercentage >= 0 ? '+' : ''}${periodData.salesChangePercentage}% vs previous period`;
  const stats = useMemo<StatCardData[]>(() => [
    { label: 'Sales', value: periodData ? money.format(periodData.sales) : '—', delta: comparisonLabel, accent: 'blue' },
    { label: 'Invoices', value: periodData ? String(periodData.invoiceCount) : '—', delta: periodData ? `${periodData.previousInvoiceCount} in previous period` : 'Loading…', accent: 'emerald' },
    { label: 'Previous-period sales', value: periodData ? money.format(periodData.previousSales) : '—', delta: 'Matching prior date range', accent: 'amber' },
    { label: 'Period outstanding', value: periodData ? money.format(periodData.outstandingBalance) : '—', delta: 'Unpaid invoices in range', accent: 'rose' }
  ], [comparisonLabel, periodData]);

  const quickActions = [
    { label: 'New invoice', detail: 'Create and finalize a sale', icon: Receipt, path: '/invoices' },
    { label: 'Add customer', detail: 'Create a parent group', icon: Users, path: '/customers' },
    { label: 'Add product', detail: 'Update your catalogue', icon: PackageCheck, path: '/products' },
    { label: 'Stock overview', detail: 'Review low-stock items', icon: Boxes, path: '/stock' }
  ];

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="dashboard-period p-4 lg:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <div className="eyebrow">Dashboard period</div>
            <h2 className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">{validRange ? dateLabel(dateRange.startDate, dateRange.endDate) : 'Choose a valid date range'}</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Sales are compared with the immediately preceding period of the same length.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-[180px_150px_150px]">
            <Select value={dateFilter} onChange={(event) => setDateFilter(event.target.value as DateFilter)} aria-label="Dashboard date filter">
              <option value="today">Today</option><option value="week">Last 7 days</option><option value="month">This month</option><option value="custom">Custom dates</option>
            </Select>
            <input type="date" value={dateRange.startDate} onChange={(event) => { setDateFilter('custom'); setCustomStartDate(event.target.value); }} disabled={dateFilter !== 'custom'} aria-label="Start date" className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white" />
            <input type="date" value={dateRange.endDate} onChange={(event) => { setDateFilter('custom'); setCustomEndDate(event.target.value); }} disabled={dateFilter !== 'custom'} aria-label="End date" className="h-11 rounded-2xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-500/10 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-white" />
          </div>
        </div>
        {!validRange && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">The end date must be after the start date, and the range can be no longer than one year.</p>}
      </Card>

      <section className="dashboard-hero relative overflow-hidden rounded-[2rem] p-5 text-white shadow-2xl sm:p-7 lg:p-9">
        <div className="hero-orb hero-orb-one" /><div className="hero-orb hero-orb-two" />
        <div className="relative grid gap-5 sm:gap-8 xl:grid-cols-[1.4fr_0.9fr] xl:items-end">
          <div><div className="flex flex-wrap items-center gap-2"><Badge className="border-white/20 bg-white/10 text-white">Operations center</Badge><span className="inline-flex items-center gap-2 text-xs text-slate-300"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]" /> API connected</span></div><h2 className="mt-4 max-w-3xl text-3xl font-semibold tracking-[-0.04em] sm:mt-5 sm:text-4xl md:text-5xl">A clearer view of every sale, customer, and shelf.</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 sm:mt-4 sm:text-base sm:leading-7">NURTURED CHOICE PRODUCTS SYSTEM</p><div className="mt-5 flex flex-wrap gap-3 sm:mt-7"><Button variant="primary" onClick={() => navigate('/invoices')}><Plus className="h-4 w-4" /> Create invoice</Button><Button variant="glass" onClick={() => navigate('/reports')}>View reports <ArrowUpRight className="h-4 w-4" /></Button></div></div>
          <div className="grid grid-cols-2 gap-3">{[['Active customers', data?.totalCustomers ?? '—'], ['Products in catalogue', data?.totalProducts ?? '—'], ['Units in stock', data ? compact.format(data.currentStockUnits) : '—'], ['Low-stock alerts', data?.lowStockAlerts ?? '—']].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-md"><div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</div><div className="mt-3 text-2xl font-semibold">{value}</div></div>)}</div>
        </div>
      </section>

      <section className="dashboard-metrics grid grid-cols-2 gap-3 md:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</section>

      <section className="grid gap-4 sm:gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <Card className="min-h-0 lg:min-h-[390px]"><div className="mb-4 flex items-start justify-between gap-4 sm:mb-6"><div><div className="eyebrow">Performance</div><h3 className="mt-1 text-lg font-semibold sm:mt-2 sm:text-xl">Sales momentum</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Daily revenue for {dateRange.label.toLowerCase()}.</p></div><Badge variant="success">KES view</Badge></div><div className="h-[220px] sm:h-[270px]">{periodData?.trend.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={periodData.trend}><defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e35345" stopOpacity={0.32} /><stop offset="100%" stopColor="#e35345" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} stroke="rgba(148,163,184,.17)" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => `KES ${compact.format(value)}`} /><Tooltip formatter={(value) => money.format(Number(value))} contentStyle={{ borderRadius: 14, border: '1px solid rgba(148,163,184,.2)', background: 'rgba(15,23,42,.95)', color: '#fff' }} /><Area type="monotone" dataKey="sales" stroke="#e35345" fill="url(#salesFill)" strokeWidth={3} /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-400">{period.isLoading ? 'Loading performance data…' : 'No sales trend data for this period.'}</div>}</div></Card>
        <Card><div className="mb-5"><div className="eyebrow">Top customers</div><h3 className="mt-2 text-xl font-semibold">Revenue leaders</h3></div><div className="space-y-4">{(periodData?.topCustomers ?? []).slice(0, 5).map((customer, index) => <div key={customer.customerName} className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-200">{index + 1}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{customer.customerName}</div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-[#e35345]" style={{ width: `${Math.max(12, Math.min(100, (customer.revenue / Math.max(...(periodData?.topCustomers ?? []).map((item) => item.revenue), 1)) * 100))}%` }} /></div></div><div className="text-sm font-semibold">{money.format(customer.revenue)}</div></div>)}{!periodData?.topCustomers.length && <div className="py-10 text-center text-sm text-slate-400">{period.isLoading ? 'Loading customer revenue…' : 'No customer revenue data for this period.'}</div>}</div></Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card><div className="mb-4 flex items-center justify-between sm:mb-5"><div><div className="eyebrow">Quick access</div><h3 className="mt-1 text-lg font-semibold sm:mt-2 sm:text-xl">Keep the floor moving</h3></div><WalletCards className="h-5 w-5 text-[#e35345]" /></div><div className="grid grid-cols-2 gap-2.5 sm:gap-3">{quickActions.map(({ label, detail, icon: Icon, path }) => <button key={label} onClick={() => navigate(path)} className="mobile-quick-action group flex items-center gap-2.5 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-3 text-left transition hover:-translate-y-0.5 hover:border-[#e35345]/40 hover:bg-white sm:gap-3 sm:p-4 dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white text-[#e35345] shadow-sm sm:h-10 sm:w-10 dark:bg-white/10"><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block truncate text-sm font-semibold">{label}</span><span className="mt-1 block truncate text-[11px] text-slate-500 dark:text-slate-400 sm:text-xs">{detail}</span></span><ArrowUpRight className="ml-auto hidden h-4 w-4 shrink-0 text-slate-400 transition group-hover:text-[#e35345] sm:block" /></button>)}</div></Card>
        <Card><div className="mb-5 flex items-center justify-between"><div><div className="eyebrow">Team pulse</div><h3 className="mt-2 text-xl font-semibold">Recent activity</h3></div><FileText className="h-5 w-5 text-slate-400" /></div><div className="space-y-4">{(activity.data ?? []).slice(0, 4).map((item) => <div key={`${item.type}-${item.occurredAt}`} className="flex gap-3"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#e35345]" /><div className="min-w-0"><div className="text-sm font-medium">{item.description}</div><div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.type}{item.reference ? ` · ${item.reference}` : ''} · {new Date(item.occurredAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', timeZone: 'Africa/Nairobi' })}</div></div></div>)}{!activity.data?.length && <div className="py-8 text-center text-sm text-slate-400">No recent activity yet.</div>}</div></Card>
      </section>
    </div>
  );
}
