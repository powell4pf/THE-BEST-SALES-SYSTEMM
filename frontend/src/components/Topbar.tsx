import { Command, RefreshCw, Search, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ThemeToggle } from './ThemeToggle';
import type { ThemeMode } from '../lib/types';

type Props = {
  theme: ThemeMode;
  onToggleTheme: () => void;
  onSearchChange: (value: string) => void;
  onOpenPalette: () => void;
  onRefresh: () => void;
  onLogout: () => void;
  searchValue: string;
  userName: string;
};

export function Topbar({ theme, onToggleTheme, onSearchChange, onOpenPalette, onRefresh, onLogout, searchValue, userName }: Props) {
  return (
    <header className="flex flex-col gap-4 rounded-[2rem] border border-slate-200/70 bg-white/80 p-4 shadow-soft backdrop-blur-xl dark:border-white/10 dark:bg-white/6 lg:flex-row lg:items-center lg:justify-between">
      <div>
        <div className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Enterprise Sales & Distribution</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">Operate the floor with clarity</h1>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Signed in as {userName}</p>
      </div>

      <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
        <div className="relative w-full lg:w-[26rem]">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={searchValue}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search customers, products, invoices..."
            className="pl-11"
            onFocus={onOpenPalette}
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onOpenPalette}>
            <Command className="h-4 w-4" />
            Ctrl K
          </Button>
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
          <ThemeToggle mode={theme} onToggle={onToggleTheme} />
          <Button variant="ghost" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
