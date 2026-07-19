import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { useMemo } from 'react';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Card } from '../ui/card';

const currency = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });

type Props = {
  onBack: () => void;
};

export function AccountsReceivableAgingReport({ onBack }: Props) {
  const reportQuery = useQuery({
    queryKey: ['report', 'ar-aging'],
    queryFn: () => api.getAccountsReceivableAging()
  });

  const data = reportQuery.data;

  const totals = useMemo(() => {
    if (!data?.items) return { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 };
    return data.items.reduce(
      (acc, item) => ({
        current: acc.current + item.current,
        '1-30': acc['1-30'] + item.days1To30,
        '31-60': acc['31-60'] + item.days31To60,
        '61-90': acc['61-90'] + item.days61To90,
        '90+': acc['90+'] + item.days91Plus,
        total: acc.total + item.total
      }),
      { current: 0, '1-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total: 0 }
    );
  }, [data]);

  return (
    <Card>
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/70 p-6 dark:border-white/10">
        <div>
          <Button variant="outline" size="sm" onClick={onBack} className="mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Reports
          </Button>
          <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Accounts Receivable Aging</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">A summary of outstanding customer balances by aging period.</p>
        </div>
        <Button size="sm" variant="outline" disabled>
          <Printer className="h-4 w-4" />
          Print Report
        </Button>
      </div>
      <div className="p-6">
        {reportQuery.isLoading && <p className="text-sm text-slate-500">Loading report data...</p>}
        {reportQuery.error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{(reportQuery.error as Error).message}</div>}
        {data && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b-2 border-slate-300 dark:border-slate-700">
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3 pr-3">Customer</th>
                  <th className="py-3 px-3 text-right">Current</th>
                  <th className="py-3 px-3 text-right">1-30 Days</th>
                  <th className="py-3 px-3 text-right">31-60 Days</th>
                  <th className="py-3 px-3 text-right">61-90 Days</th>
                  <th className="py-3 px-3 text-right">90+ Days</th>
                  <th className="py-3 pl-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item) => (
                  <tr key={item.customerId} className="border-t border-slate-200/70 font-medium dark:border-white/10">
                    <td className="py-3 pr-3">{item.customerName}</td>
                    <td className="py-3 px-3 text-right">{currency.format(item.current)}</td>
                    <td className="py-3 px-3 text-right">{currency.format(item.days1To30)}</td>
                    <td className="py-3 px-3 text-right">{currency.format(item.days31To60)}</td>
                    <td className="py-3 px-3 text-right">{currency.format(item.days61To90)}</td>
                    <td className="py-3 px-3 text-right">{currency.format(item.days91Plus)}</td>
                    <td className="py-3 pl-3 text-right font-semibold">{currency.format(item.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t-2 border-slate-300 font-bold dark:border-slate-700">
                <tr>
                  <td className="py-3 pr-3">Total</td>
                  <td className="py-3 px-3 text-right">{currency.format(totals.current)}</td>
                  <td className="py-3 px-3 text-right">{currency.format(totals['1-30'])}</td>
                  <td className="py-3 px-3 text-right">{currency.format(totals['31-60'])}</td>
                  <td className="py-3 px-3 text-right">{currency.format(totals['61-90'])}</td>
                  <td className="py-3 px-3 text-right">{currency.format(totals['90+'])}</td>
                  <td className="py-3 pl-3 text-right">{currency.format(totals.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}