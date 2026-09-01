import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CommandPalette } from '../components/CommandPalette';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';
import { MobileBottomNav } from '../components/MobileBottomNav';
import { MonthEndReminder } from '../components/MonthEndReminder';
import type { ThemeMode } from '../lib/types';
import { useAuth } from '../context/AuthContext';

type Props = {
  children: React.ReactNode;
};

export function AppShell({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  // The workspace always opens in light mode. Users can still switch modes
  // with the top-bar toggle during the current session.
  const [theme, setTheme] = useState<ThemeMode>('light');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');

  function openCommandPalette() {
    setPaletteQuery('');
    setPaletteOpen(true);
  }

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    if (!mobileNavigationOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = previousOverflow; };
  }, [mobileNavigationOpen]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openCommandPalette();
      }
      if (!typing && event.key === '/') { event.preventDefault(); openCommandPalette(); }

      if (event.key === 'Escape') {
        setPaletteOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const pageTitle = useMemo(() => {
    const map: Record<string, string> = {
      '/': 'Dashboard',
      '/customers': 'Customers',
      '/products': 'Products',
      '/stock': 'Stock',
      '/invoices': 'Invoices',
      '/statements': 'Statements',
      '/credit-notes': 'Credit Notes',
      '/payments': 'Payments',
      '/collections': 'Collections',
      '/reports': 'Reports',
      '/portal': 'Customer Portal',
      '/settings': 'Settings'
    };
    return map[location.pathname] ?? 'Nurtured Choice';
  }, [location.pathname]);

  async function handleLogout() {
    await auth.logout();
    navigate('/login', { replace: true });
  }

  return (
    <div className="app-bg min-h-screen text-slate-950 dark:text-white">
      <div className={`mx-auto grid min-h-screen max-w-[100rem] gap-4 p-3 pb-24 transition-[grid-template-columns] duration-300 ease-in-out sm:gap-6 sm:p-4 sm:pb-24 lg:p-6 lg:pb-6 ${collapsed ? 'lg:grid-cols-[88px_1fr]' : 'lg:grid-cols-[280px_1fr]'}`}>
        <Sidebar currentPath={location.pathname} onNavigate={navigate} collapsed={collapsed} onToggleCollapsed={() => setCollapsed((value) => !value)} className="hidden transition-all duration-300 ease-in-out lg:flex" />
        <main className="flex min-w-0 flex-col gap-4 sm:gap-6">
          <Topbar
            theme={theme}
            onToggleTheme={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
            onSearchChange={setSearchValue}
            onOpenPalette={openCommandPalette}
            onRefresh={() => window.location.reload()}
            onLogout={handleLogout}
            searchValue={searchValue}
            userName={auth.user?.displayName ?? auth.user?.email ?? 'Signed in'}
            onOpenNavigation={() => setMobileNavigationOpen(true)}
            pageTitle={pageTitle}
          />
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
      {mobileNavigationOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm lg:hidden" onClick={() => setMobileNavigationOpen(false)}>
          <div onClick={(event) => event.stopPropagation()}>
            <Sidebar
              currentPath={location.pathname}
              onNavigate={navigate}
              collapsed={false}
              onToggleCollapsed={() => setMobileNavigationOpen(false)}
              onClose={() => setMobileNavigationOpen(false)}
              className="mobile-sidebar"
            />
          </div>
        </div>
      )}
      <MobileBottomNav currentPath={location.pathname} onNavigate={navigate} onOpenMore={() => setMobileNavigationOpen(true)} />
      <MonthEndReminder />
      <CommandPalette
        open={paletteOpen}
        query={paletteQuery}
        onQueryChange={setPaletteQuery}
        onClose={() => setPaletteOpen(false)}
        onSelect={(path) => {
          navigate(path);
          setPaletteOpen(false);
        }}
      />
      <div className="fixed bottom-5 right-5 hidden rounded-full border border-white/10 bg-slate-950 px-4 py-2 text-xs text-slate-300 shadow-2xl lg:block">
        {pageTitle}
      </div>
    </div>
  );
}
