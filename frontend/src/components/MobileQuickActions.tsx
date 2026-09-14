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
  return <div data-onboarding="mobile-actions" className="mobile-quick-actions lg:hidden"><div className="mobile-quick-actions-list">{actions.map(([label, path, Icon]) => <Button key={path} variant="ghost" title={label} className="mobile-quick-action-button" onClick={() => navigate(path)}><Icon className="h-4 w-4 shrink-0" /><span>{label}</span></Button>)}<Button variant="ghost" title="Scan barcode" className="mobile-quick-action-button" onClick={() => navigate('/invoices', { state: { openScanner: true } })}><Barcode className="h-4 w-4 shrink-0" /><span>Scan</span></Button></div></div>;
}
