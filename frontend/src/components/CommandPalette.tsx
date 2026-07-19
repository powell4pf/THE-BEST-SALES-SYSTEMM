import { Search, Sparkles, Users, PackageSearch, ShoppingCart, Settings } from 'lucide-react';
import { Input } from './ui/input';
import { cn } from '../lib/cn';

type CommandItem = {
  label: string;
  path: string;
  description: string;
  icon: React.ReactNode;
};

const items: CommandItem[] = [
  { label: 'Dashboard', path: '/', description: 'Overview and analytics', icon: <Sparkles className="h-4 w-4" /> },
  { label: 'Customers', path: '/customers', description: 'Parent groups and branches', icon: <Users className="h-4 w-4" /> },
  { label: 'Products', path: '/products', description: 'Catalog and pricing', icon: <PackageSearch className="h-4 w-4" /> },
  { label: 'Invoices', path: '/invoices', description: 'Billing and payments', icon: <ShoppingCart className="h-4 w-4" /> },
  { label: 'Settings', path: '/settings', description: 'Company and system settings', icon: <Settings className="h-4 w-4" /> }
];

type Props = {
  open: boolean;
  query: string;
  onQueryChange: (value: string) => void;
  onSelect: (path: string) => void;
  onClose: () => void;
};

export function CommandPalette({ open, query, onQueryChange, onSelect, onClose }: Props) {
  if (!open) return null;

  const filtered = items.filter((item) => item.label.toLowerCase().includes(query.toLowerCase()) || item.description.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/60 px-4 pt-24 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-[2rem] border border-white/10 bg-slate-950 p-4 text-white shadow-2xl" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-white/10 px-2 pb-4">
          <Search className="h-4 w-4 text-slate-400" />
          <Input
            autoFocus
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search pages and actions..."
            className="border-0 bg-transparent px-0 text-white placeholder:text-slate-500 focus:ring-0"
          />
        </div>
        <div className="mt-3 space-y-2">
          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 p-6 text-sm text-slate-400">No results found.</div>
          ) : (
            filtered.map((item) => (
              <button
                key={item.path}
                onClick={() => onSelect(item.path)}
                className={cn('flex w-full items-center gap-4 rounded-2xl px-4 py-3 text-left transition hover:bg-white/6')}
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10">{item.icon}</div>
                <div>
                  <div className="font-medium text-white">{item.label}</div>
                  <div className="text-sm text-slate-400">{item.description}</div>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

