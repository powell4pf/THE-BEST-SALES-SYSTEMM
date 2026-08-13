import { Boxes, LayoutDashboard, Menu, ShoppingCart, Users } from 'lucide-react';
import { cn } from '../lib/cn';

type Props = {
  currentPath: string;
  onNavigate: (path: string) => void;
  onOpenMore: () => void;
};

const items = [
  { label: 'Home', path: '/', icon: LayoutDashboard },
  { label: 'Invoices', path: '/invoices', icon: ShoppingCart },
  { label: 'Customers', path: '/customers', icon: Users },
  { label: 'Stock', path: '/stock', icon: Boxes }
];

export function MobileBottomNav({ currentPath, onNavigate, onOpenMore }: Props) {
  return (
    <nav className="mobile-bottom-nav lg:hidden" aria-label="Primary navigation">
      {items.map(({ label, path, icon: Icon }) => {
        const active = currentPath === path;
        return <button key={path} onClick={() => onNavigate(path)} className={cn('mobile-nav-item', active && 'mobile-nav-item-active')} aria-current={active ? 'page' : undefined}><Icon className="h-5 w-5" /><span>{label}</span></button>;
      })}
      <button onClick={onOpenMore} className="mobile-nav-item"><Menu className="h-5 w-5" /><span>More</span></button>
    </nav>
  );
}
