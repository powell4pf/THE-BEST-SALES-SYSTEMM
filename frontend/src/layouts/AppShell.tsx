import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { CommandPalette } from '../components/CommandPalette';
import { Sidebar } from '../components/Sidebar';
import { Topbar } from '../components/Topbar';
import type { ThemeMode } from '../lib/types';
import { useAuth } from '../context/AuthContext';

type Props = {
  children: React.ReactNode;
};

export function AppShell({ children }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const auth = useAuth();
  const [theme, setTheme] = useState<ThemeMode>(() => (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  const [collapsed, setCollapsed] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [paletteQuery, setPaletteQuery] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(true);
      }

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
      <div className={`mx-auto grid min-h-screen max-w-[100rem] gap-6 p-4 transition-[grid-template-columns] duration-300 ease-in-out lg:p-6 ${collapsed ? 'lg:grid-cols-[88px_1fr]' : 'lg:grid-cols-[280px_1fr]'}`}>
        <Sidebar currentPath={location.pathname} onNavigate={navigate} collapsed={collapsed} onToggleCollapsed={() => setCollapsed((value) => !value)} className="transition-all duration-300 ease-in-out" />
        <main className="flex min-w-0 flex-col gap-6">
          <Topbar
            theme={theme}
            onToggleTheme={() => setTheme((value) => (value === 'dark' ? 'light' : 'dark'))}
            onSearchChange={setSearchValue}
            onOpenPalette={() => setPaletteOpen(true)}
            onRefresh={() => window.location.reload()}
            onLogout={handleLogout}
            searchValue={searchValue}
            userName={auth.user?.displayName ?? auth.user?.email ?? 'Signed in'}
          />
          <div className="animate-fade-in">{children}</div>
        </main>
      </div>
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
