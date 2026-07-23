import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import { ArrowUpRight, Boxes, FileText, PackageCheck, Plus, Receipt, Users, WalletCards } from 'lucide-react';
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { StatCard } from '../components/StatCard';
import { api } from '../lib/api';
import type { StatCardData } from '../lib/types';

const money = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en-KE', { notation: 'compact', maximumFractionDigits: 1 });

export function DashboardPage() {
  const navigate = useNavigate();
  const [summary, trend, products, customers, activity] = useQueries({
    queries: [
      { queryKey: ['dashboard', 'summary'], queryFn: api.getDashboardSummary },
      { queryKey: ['dashboard', 'trend'], queryFn: () => api.getSalesTrend('6m') },
      { queryKey: ['dashboard', 'products'], queryFn: api.getProductPerformance },
      { queryKey: ['dashboard', 'customers'], queryFn: api.getCustomerRevenue },
      { queryKey: ['dashboard', 'activity'], queryFn: api.getRecentActivity }
    ]
  });

  const data = summary.data;
  const stats = useMemo<StatCardData[]>(() => [
    { label: 'Total sales', value: data ? money.format(data.totalSales) : '—', delta: 'All time', accent: 'blue' },
    { label: "Today's sales", value: data ? money.format(data.todaySales) : '—', delta: 'Live today', accent: 'emerald' },
    { label: 'Monthly sales', value: data ? money.format(data.monthlySales) : '—', delta: `${data?.totalInvoices ?? 0} invoices`, accent: 'amber' },
    { label: 'Outstanding balance', value: data ? money.format(data.outstandingCustomerBalance) : '—', delta: 'Receivables', accent: 'rose' }
  ], [data]);

  const quickActions = [
    { label: 'New invoice', detail: 'Create and finalize a sale', icon: Receipt, path: '/invoices' },
    { label: 'Add customer', detail: 'Create a parent group', icon: Users, path: '/customers' },
    { label: 'Add product', detail: 'Update your catalogue', icon: PackageCheck, path: '/products' },
    { label: 'Stock overview', detail: 'Review low-stock items', icon: Boxes, path: '/stock' }
  ];

  return (
    <div className="space-y-6">
      <section className="dashboard-hero relative overflow-hidden rounded-[2rem] p-7 text-white shadow-2xl lg:p-9">
        <div className="hero-orb hero-orb-one" />
        <div className="hero-orb hero-orb-two" />
        <div className="relative grid gap-8 xl:grid-cols-[1.4fr_0.9fr] xl:items-end">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-white/20 bg-white/10 text-white">Operations center</Badge>
              <span className="inline-flex items-center gap-2 text-xs text-slate-300"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,.8)]" /> API connected</span>
            </div>
            <h2 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] md:text-5xl">A clearer view of every sale, customer, and shelf.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-300">Nurtured Choice Products, brought together in one calm workspace for your team to move faster.</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button variant="primary" onClick={() => navigate('/invoices')}><Plus className="h-4 w-4" /> Create invoice</Button>
              <Button variant="glass" onClick={() => navigate('/reports')}>View reports <ArrowUpRight className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['Active customers', data?.totalCustomers ?? '—'],
              ['Products in catalogue', data?.totalProducts ?? '—'],
              ['Units in stock', data ? compact.format(data.currentStockUnits) : '—'],
              ['Low-stock alerts', data?.lowStockAlerts ?? '—']
            ].map(([label, value]) => <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.08] p-4 backdrop-blur-md"><div className="text-[11px] uppercase tracking-[0.18em] text-slate-400">{label}</div><div className="mt-3 text-2xl font-semibold">{value}</div></div>)}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">{stats.map((stat) => <StatCard key={stat.label} {...stat} />)}</section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <Card className="min-h-[390px]">
          <div className="mb-6 flex items-start justify-between gap-4"><div><div className="eyebrow">Performance</div><h3 className="mt-2 text-xl font-semibold">Sales momentum</h3><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Revenue across the last six months.</p></div><Badge variant="success">KES view</Badge></div>
          <div className="h-[270px]">{trend.data?.length ? <ResponsiveContainer width="100%" height="100%"><AreaChart data={trend.data}><defs><linearGradient id="salesFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#e35345" stopOpacity={0.32} /><stop offset="100%" stopColor="#e35345" stopOpacity={0.02} /></linearGradient></defs><CartesianGrid vertical={false} stroke="rgba(148,163,184,.17)" /><XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 12 }} tickFormatter={(value) => `KES ${compact.format(value)}`} /><Tooltip formatter={(value) => money.format(Number(value))} contentStyle={{ borderRadius: 14, border: '1px solid rgba(148,163,184,.2)', background: 'rgba(15,23,42,.95)', color: '#fff' }} /><Area type="monotone" dataKey="sales" stroke="#e35345" fill="url(#salesFill)" strokeWidth={3} /></AreaChart></ResponsiveContainer> : <div className="flex h-full items-center justify-center text-sm text-slate-400">{trend.isLoading ? 'Loading performance data…' : 'No sales trend data yet.'}</div>}</div>
        </Card>
        <Card>
          <div className="mb-5"><div className="eyebrow">Top customers</div><h3 className="mt-2 text-xl font-semibold">Revenue leaders</h3></div>
          <div className="space-y-4">{(customers.data ?? []).slice(0, 5).map((customer, index) => <div key={customer.customerName} className="flex items-center gap-3"><div className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-sm font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-200">{index + 1}</div><div className="min-w-0 flex-1"><div className="truncate text-sm font-medium">{customer.customerName}</div><div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"><div className="h-full rounded-full bg-[#e35345]" style={{ width: `${Math.max(12, Math.min(100, (customer.revenue / Math.max(...(customers.data ?? []).map((item) => item.revenue), 1)) * 100))}%` }} /></div></div><div className="text-sm font-semibold">{money.format(customer.revenue)}</div></div>)}{!customers.data?.length && <div className="py-10 text-center text-sm text-slate-400">No customer revenue data yet.</div>}</div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <Card><div className="mb-5 flex items-center justify-between"><div><div className="eyebrow">Quick access</div><h3 className="mt-2 text-xl font-semibold">Keep the floor moving</h3></div><WalletCards className="h-5 w-5 text-[#e35345]" /></div><div className="grid gap-3 sm:grid-cols-2">{quickActions.map(({ label, detail, icon: Icon, path }) => <button key={label} onClick={() => navigate(path)} className="group flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 text-left transition hover:-translate-y-0.5 hover:border-[#e35345]/40 hover:bg-white dark:border-white/10 dark:bg-white/[0.04] dark:hover:bg-white/[0.08]"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-[#e35345] shadow-sm dark:bg-white/10"><Icon className="h-4 w-4" /></span><span><span className="block text-sm font-semibold">{label}</span><span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">{detail}</span></span><ArrowUpRight className="ml-auto h-4 w-4 text-slate-400 transition group-hover:text-[#e35345]" /></button>)}</div></Card>
        <Card><div className="mb-5 flex items-center justify-between"><div><div className="eyebrow">Team pulse</div><h3 className="mt-2 text-xl font-semibold">Recent activity</h3></div><FileText className="h-5 w-5 text-slate-400" /></div><div className="space-y-4">{(activity.data ?? []).slice(0, 4).map((item) => <div key={`${item.type}-${item.occurredAt}`} className="flex gap-3"><span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#e35345]" /><div className="min-w-0"><div className="text-sm font-medium">{item.description}</div><div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{item.type}{item.reference ? ` · ${item.reference}` : ''} · {new Date(item.occurredAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}</div></div></div>)}{!activity.data?.length && <div className="py-8 text-center text-sm text-slate-400">No recent activity yet.</div>}</div></Card>
      </section>
    </div>
  );
}
