import { Barcode, CreditCard, PackagePlus, Plus, UserRound } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from './ui/button';

export function MobileQuickActions() {
  const navigate = useNavigate();
  const actions = [
    ['Add invoice', '/invoices', Plus],
    ['Record payment', '/payments', CreditCard],
    ['Add stock', '/products', PackagePlus],
    ['Customer balance', '/collections', UserRound]
  ] as const;
  return <div className="fixed bottom-[5.5rem] left-3 right-3 z-40 rounded-2xl border border-slate-200 bg-white/95 p-2 shadow-xl backdrop-blur-md dark:border-white/10 dark:bg-slate-900/95 lg:hidden"><div className="grid grid-cols-5 gap-1">{actions.map(([label, path, Icon]) => <Button key={path} variant="ghost" className="h-auto min-w-0 flex-col gap-1 rounded-xl px-1 py-2 text-[10px]" onClick={() => navigate(path)}><Icon className="h-4 w-4" /><span className="truncate">{label}</span></Button>)}<Button variant="ghost" className="h-auto min-w-0 flex-col gap-1 rounded-xl px-1 py-2 text-[10px]" onClick={() => navigate('/invoices', { state: { openScanner: true } })}><Barcode className="h-4 w-4" /><span>Scan</span></Button></div></div>;
}
