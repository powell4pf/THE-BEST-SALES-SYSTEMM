import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { StatCard } from '../components/StatCard';
import { api } from '../lib/api';

const colors = ['#0ea5e9', '#10b981', '#f59e0b'];

export function DashboardPage() {
  const navigate = useNavigate();
  const dashboardQuery = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.getDashboardStats()
  });

  const data = dashboardQuery.data;

  return (
    <div className="space-y-8">
      <section className="hero-panel relative overflow-hidden rounded-[2.5rem] p-8 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.35),_transparent_38%),radial-gradient(circle_at_bottom_left,_rgba(16,185,129,0.22),_transparent_30%),linear-gradient(135deg,#0b1220,#121a2f_45%,#1f2b48)]" />
        <div className="relative grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div>
            <Badge className="border-white/20 bg-white/10 text-white">Operations are live</Badge>
            <h2 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight md:text-5xl">Run sales, stock, and customer accounts from one polished control center.</h2>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-200">
              Premium dashboards, fast lookup, and actionable KPIs for Nurtured Choice Products across invoices, stock, statements, and customer groups.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="glass" onClick={() => navigate('/invoices')}>Generate Invoice</Button>
              <Button variant="glass" onClick={() => navigate('/statements')}>Generate Statement</Button>
              <Button variant="glass" onClick={() => navigate('/customers')}>Add Customer</Button>
              <Button variant="glass" onClick={() => navigate('/products')}>Add Product</Button>
            </div>
          </div>
          <Card className="border-white/10 bg-white/10 text-white backdrop-blur-xl">
            <div className="grid gap-4 sm:grid-cols-2">
              {(data?.heroStats ?? [['Loading...', '...'], ['Loading...', '...'], ['Loading...', '...'], ['Loading...', '...']]).map(([label, value]) => (
                <div key={label} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="text-xs uppercase tracking-[0.25em] text-slate-300">{label}</div>
                  <div className="mt-3 text-3xl font-semibold">{dashboardQuery.isLoading ? '...' : value}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      <section className="grid animate-fade-in gap-4 md:grid-cols-2 xl:grid-cols-4" style={{ animationDelay: '200ms', animationFillMode: 'backwards' }}>
        {(data?.stats ?? []).map((stat) => (
          <StatCard key={stat.label} {...stat} />
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.9fr]">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Monthly Sales Trend</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">Revenue momentum across the current year.</p>
            </div>
            <Badge>Last 7 months</Badge>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.monthlyTrend}>
                <defs>
                  <linearGradient id="trend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.18)" />
                <XAxis dataKey="month" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="#38bdf8" fill="url(#trend)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Best Selling Products</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Product mix by contribution.</p>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart >
                <Pie data={data?.productPerformance} dataKey="value" nameKey="name" innerRadius={72} outerRadius={110} paddingAngle={6}>
                  {(data?.productPerformance ?? []).map((_, index) => (
                    <Cell key={index} fill={colors[index % colors.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Stock Value by Category</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">Current inventory count across product families.</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.stockValue}>
                <CartesianGrid strokeDasharray="4 4" stroke="rgba(148,163,184,0.18)" />
                <XAxis dataKey="category" tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="units" radius={[14, 14, 0, 0]} fill="#0ea5e9" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Recent Activity</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">What the team just did.</p>
          </div>
          <div className="space-y-4">
            {(data?.activity ?? []).map((item) => (
              <div key={item.title} className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="font-medium text-slate-950 dark:text-white">{item.title}</div>
                <div className="mt-1 text-sm text-slate-500 dark:text-slate-400">{item.detail}</div>
                <div className="mt-2 text-xs uppercase tracking-[0.2em] text-slate-400">{item.time}</div>
              </div>
            ))}
          </div>
        </Card>
      </section>
    </div>
  );
}
