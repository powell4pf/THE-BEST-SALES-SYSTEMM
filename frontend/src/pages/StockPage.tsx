import { useQuery } from '@tanstack/react-query';
import { ArrowDownToLine, ArrowUpFromLine, Minus, Printer } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';
import { openLetterheadPrintWindow } from '../lib/print';

export function StockPage() {
  const stockQuery = useQuery({
    queryKey: ['stockDashboard'],
    queryFn: () => api.getStockDashboard(),
    refetchInterval: 15_000,
    refetchOnWindowFocus: true,
    staleTime: 0
  });
  const data = stockQuery.data;
  const movementTypeLabel = (type: string) => type.replace(/([a-z])([A-Z])/g, '$1 $2');
  const movementIcon = (quantity: number) => quantity > 0 ? <ArrowDownToLine className="h-4 w-4 text-emerald-600" /> : quantity < 0 ? <ArrowUpFromLine className="h-4 w-4 text-rose-600" /> : <Minus className="h-4 w-4 text-slate-400" />;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Inventory Dashboard</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">{stockQuery.isLoading ? 'Loading inventory data...' : 'Movement history, adjustments, and valuation in one place.'}</p>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              const styles = `body{font-family:Inter,sans-serif;padding:0;color:#111827}h1,h2{font-weight:700;margin:0 0 16px}h1{font-size:24px}h2{font-size:18px;margin-top:32px}.grid{display:grid;gap:16px;grid-template-columns:repeat(2,1fr)}.stat{padding:12px;border:1px solid #e5e7eb;border-radius:16px}.label{font-size:12px;text-transform:uppercase;letter-spacing:.1em;color:#6b7280}.value{font-size:20px;font-weight:600;margin-top:8px}.list-item{padding:10px;border:1px solid #e5e7eb;border-radius:12px;margin-bottom:8px}`;
              const body = `<h1>Stock Report</h1><div class="grid">${(data?.stats ?? [])
                  .map(([label, value]) => `<div class="stat"><div class="label">${label}</div><div class="value">${value}</div></div>`)
                  .join('')}</div>
                <h2>Recent Movements</h2>
                <div>${(data?.movements ?? []).map((item) => `<div class="list-item">${item.createdAt} - ${movementTypeLabel(item.movementType)}: ${item.quantity > 0 ? '+' : ''}${item.quantity} ${item.productName} (balance ${item.currentStock})</div>`).join('')}</div>
                `;
              openLetterheadPrintWindow('Print Stock Report', body, styles);
            }}
          >
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>
        {stockQuery.error ? (
          <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{(stockQuery.error as Error).message}</div>
        ) : (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            {(data?.stats ?? []).map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                <div className="text-xs uppercase tracking-[0.25em] text-slate-400">{label}</div>
                <div className="mt-2 text-2xl font-semibold text-slate-950 dark:text-white">{stockQuery.isLoading ? '...' : value}</div>
              </div>
            ))}
            {stockQuery.isLoading && <div className="col-span-full rounded-2xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500 dark:border-white/15 dark:text-slate-400">Loading inventory summary...</div>}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="text-lg font-semibold text-slate-950 dark:text-white">Stock Movement History</h3>
        <div className="mt-4 space-y-2 text-sm">
          {stockQuery.isLoading && <div className="text-sm text-slate-500 dark:text-slate-400">Loading movements...</div>}
          {!stockQuery.isLoading && (data?.movements ?? []).length === 0 && <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-8 text-center text-sm text-slate-500 dark:border-white/15 dark:bg-white/5 dark:text-slate-400">No stock movements have been recorded yet. New stock entries and adjustments will appear here.</div>}
          {(data?.movements ?? []).map((item) => {
            const quantity = item.quantity > 0 ? `+${item.quantity}` : `${item.quantity}`;
            return <div key={`${item.createdAt}-${item.productName}-${item.movementType}`} className="flex items-center gap-3 rounded-xl border border-slate-200/70 bg-slate-50/70 px-3 py-2.5 dark:border-white/10 dark:bg-white/5">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white dark:bg-slate-900">{movementIcon(item.quantity)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-950 dark:text-white">{movementTypeLabel(item.movementType)} · {item.productName}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(item.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })} · Balance {item.currentStock}</p>
              </div>
              <span className={`shrink-0 font-semibold ${item.quantity > 0 ? 'text-emerald-600' : item.quantity < 0 ? 'text-rose-600' : 'text-slate-500'}`}>{quantity}</span>
            </div>;
          })}
        </div>
      </Card>
    </div>
  );
}
