import { BarChart3, Boxes, CreditCard, FileText, LayoutDashboard, PackageSearch, Settings, ShoppingCart, ShieldCheck, Users } from 'lucide-react';
import { cn } from '../lib/cn';
import { Button } from './ui/button';

type Props = {
  currentPath: string;
  onNavigate: (path: string) => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
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
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Customer Portal', path: '/portal', icon: ShieldCheck },
  { label: 'Settings', path: '/settings', icon: Settings }
];

export function Sidebar({ currentPath, onNavigate, collapsed, onToggleCollapsed, className }: Props) {
  return (
    <aside className={cn('sidebar-panel flex h-full flex-col gap-6 p-4', collapsed && 'collapsed', className)}>
      <div className="flex items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur-xl">
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-[0.35em] text-slate-400">Nurtured Choice</div>
          <div className="mt-1 text-lg font-semibold text-white">Sales System</div>
        </div>
        <Button variant="glass" size="sm" onClick={onToggleCollapsed}>
          {collapsed ? '>' : '<'}
        </Button>
      </div>

      <nav className="flex-1 space-y-1">
        {navigation.map((item) => {
          const Icon = item.icon;
          const active = currentPath === item.path;
          return (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
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
        <div className="mt-2 text-xl font-semibold text-white">KES 1.28M</div>
        <p className="mt-1 leading-relaxed">You are 8.1% above yesterday's pace.</p>
      </div>
    </aside>
  );
}
