import { Command, Menu, RefreshCw, Search, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ThemeToggle } from './ThemeToggle';
import { NotificationsMenu } from './NotificationsMenu';
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
    <header className="sticky top-2 z-40 flex items-center justify-between gap-2 rounded-[1.25rem] border border-slate-200/70 bg-white/90 px-3 py-2.5 shadow-soft backdrop-blur-xl dark:border-slate-700/80 dark:bg-slate-900/90 sm:gap-3 sm:rounded-[1.5rem] sm:px-4 sm:py-3 lg:relative lg:top-0 lg:flex-row lg:px-6 lg:py-4">
      <div className="flex min-w-0 items-center gap-3">
        <Button variant="outline" size="sm" className="h-10 w-10 shrink-0 rounded-xl px-0 lg:hidden" onClick={onOpenNavigation} aria-label="Open navigation menu"><Menu className="h-4 w-4" /></Button>
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white p-1 shadow-sm sm:h-11 sm:w-11 dark:border-white/10 dark:bg-white/95">
            <img src="/icons/client-logo-source.png" alt="Nurtured Choice Products logo" className="h-full w-full object-contain" />
          </div>
          <div className="min-w-0">
            <div className="mobile-brand-label truncate text-[9px] font-bold uppercase tracking-[0.16em] text-[#d94d40] sm:text-xs sm:tracking-[0.28em]">Nurtured Choice Products</div>
            <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-slate-950 dark:text-white lg:mt-1 lg:text-2xl">{pageTitle}</h1>
            <p className="hidden text-sm text-slate-500 dark:text-slate-400 lg:mt-1 lg:block">Signed in as {userName}</p>
          </div>
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
          <NotificationsMenu />
          <ThemeToggle mode={theme} onToggle={onToggleTheme} />
          <Button variant="ghost" onClick={onLogout}>
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-0.5 lg:hidden">
        <Button variant="ghost" size="sm" className="h-10 w-10 rounded-xl px-0" onClick={onOpenPalette} aria-label="Search"><Search className="h-[18px] w-[18px]" /></Button>
        <Button variant="ghost" size="sm" className="hidden h-10 w-10 rounded-xl px-0 sm:inline-flex" onClick={onRefresh} aria-label="Refresh"><RefreshCw className="h-4 w-4" /></Button>
        <NotificationsMenu />
        <ThemeToggle mode={theme} onToggle={onToggleTheme} />
      </div>
    </header>
  );
}
