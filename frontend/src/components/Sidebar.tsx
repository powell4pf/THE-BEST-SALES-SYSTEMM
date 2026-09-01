import { BarChart3, Boxes, ClipboardCheck, CreditCard, FileText, LayoutDashboard, PackageSearch, Settings, ShoppingCart, ShieldCheck, Users, WalletCards, HandCoins, X } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './ui/button';
import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

type Props = {
  currentPath: string;
  onNavigate: (path: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onClose?: () => void;
  className?: string;
};

const navigation = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Products', path: '/products', icon: PackageSearch },
  { label: 'Stock', path: '/stock', icon: Boxes },
  { label: 'Invoices', path: '/invoices', icon: ShoppingCart },
  { label: 'Statements', path: '/statements', icon: FileText },
  { label: 'Credit Notes', path: '/credit-notes', icon: CreditCard },
  { label: 'Delivery Notes', path: '/delivery-notes', icon: ClipboardCheck },
  { label: 'Payments', path: '/payments', icon: WalletCards },
  { label: 'Collections', path: '/collections', icon: HandCoins },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Customer Portal', path: '/portal', icon: ShieldCheck },
  { label: 'Settings', path: '/settings', icon: Settings }
];

export function Sidebar({ currentPath, onNavigate, collapsed, onToggleCollapsed, onClose, className }: Props) {
  const summaryQuery = useQuery({ queryKey: ['dashboard', 'summary'], queryFn: api.getDashboardSummary, refetchInterval: 15000, staleTime: 0 });
  const todaySales = summaryQuery.data?.todaySales ?? 0;
  const money = new Intl.NumberFormat('en-KE', { style: 'currency', currency: 'KES', maximumFractionDigits: 0 });

  return (
    <aside className={cn('sidebar-panel flex h-full flex-col gap-6 p-4', collapsed && 'collapsed', className)}>
      <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur-xl">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white p-1"><img src="/icons/client-logo-source.png" alt="Nurtured Choice Products logo" className="h-full w-full object-contain" /></div>
          {!collapsed && <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#f06a5c]">Nurtured Choice</div>
            <div className="mt-1 text-sm font-semibold leading-tight text-white">Products Sales System</div>
          </div>}
        </div>
        <Button variant="glass" size="sm" className="h-9 w-9 rounded-xl px-0 text-lg" onClick={onToggleCollapsed} aria-label={onClose ? 'Close navigation menu' : collapsed ? 'Expand navigation' : 'Collapse navigation'}>
          {onClose ? <X className="h-4 w-4" /> : collapsed ? '›' : '‹'}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 pr-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = currentPath === item.path;
          return (
            <button
              key={item.path}
              onClick={() => { onNavigate(item.path); onClose?.(); }}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-medium transition-all duration-200',
                active ? 'bg-white text-slate-950 shadow-soft' : 'text-slate-300 hover:bg-white/6 hover:text-white'
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="rounded-3xl border border-white/10 bg-white/6 p-4 text-sm text-slate-300 backdrop-blur-xl">
        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Today</div>
        <div className="mt-2 text-xl font-semibold text-white">{summaryQuery.isLoading ? 'Loading...' : money.format(todaySales)}</div>
        <p className="mt-1 leading-relaxed">Sales recorded today, updated live.</p>
      </div>
    </aside>
  );
}
