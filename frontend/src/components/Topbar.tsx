import { Command, Menu, RefreshCw, Search, LogOut } from 'lucide-react';
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
  onOpenNavigation: () => void;
  pageTitle: string;
};

export function Topbar({ theme, onToggleTheme, onSearchChange, onOpenPalette, onRefresh, onLogout, searchValue, userName, onOpenNavigation, pageTitle }: Props) {
  return (
    <header className="flex items-center justify-between gap-3 rounded-[1.5rem] border border-slate-200/70 bg-white/80 px-4 py-3 shadow-soft backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/90 lg:flex-row lg:px-6 lg:py-4">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="outline" size="sm" className="h-10 w-10 shrink-0 rounded-xl px-0 lg:hidden" onClick={onOpenNavigation} aria-label="Open navigation menu"><Menu className="h-4 w-4" /></Button>
        <div>
        <div className="text-[10px] uppercase tracking-[0.25em] text-slate-500 dark:text-slate-400 lg:text-xs lg:tracking-[0.35em]">Nurtured Choice</div>
        <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-slate-950 dark:text-white lg:mt-2 lg:text-2xl">{pageTitle}</h1>
        <p className="hidden text-sm text-slate-500 dark:text-slate-400 lg:mt-1 lg:block">Signed in as {userName}</p>
        </div>
      </div>

      <div className="hidden w-full flex-col gap-3 lg:flex lg:w-auto lg:flex-row lg:items-center">
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
          <Button variant="outline" onClick={onOpenPalette} className="hidden sm:inline-flex">
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
      <div className="flex shrink-0 items-center gap-1 lg:hidden">
        <Button variant="ghost" size="sm" className="h-10 w-10 rounded-xl px-0" onClick={onOpenPalette} aria-label="Search"><Search className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" className="h-10 w-10 rounded-xl px-0" onClick={onRefresh} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
        <ThemeToggle mode={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
