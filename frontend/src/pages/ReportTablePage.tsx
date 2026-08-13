import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Printer } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { api } from '../lib/api';
import { openLetterheadPrintWindow } from '../lib/print';

type Props = { reportKey: string; onBack: () => void };
const currency = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 2 });

export function ReportTablePage({ reportKey, onBack }: Props) {
  const query = useQuery({ queryKey: ['report', reportKey], queryFn: () => api.getReport(reportKey) });
  const data = query.data;
  const print = () => {
    if (!data) return;
    const head = data.columns.map((column) => `<th>${column.label}</th>`).join('');
    const body = data.rows.map((row) => `<tr>${data.columns.map((column) => `<td>${format(row[column.key], column.type)}</td>`).join('')}</tr>`).join('');
    openLetterheadPrintWindow(data.title, `<h1>${data.title}</h1><p>${data.description}</p><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>`, 'h1{font-size:24px;margin:0 0 10px}p{color:#6b7280;margin:0 0 20px}table{width:100%;border-collapse:collapse;font-size:11px}th,td{padding:8px 6px;border:1px solid #e5e7eb;text-align:right}th:first-child,td:first-child{text-align:left}th{background:#f8fafc;font-size:10px}');
  };
  return <Card>
    <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200/70 p-6 dark:border-white/10">
      <div><Button variant="outline" size="sm" onClick={onBack} className="mb-4"><ArrowLeft className="h-4 w-4" />Back to Reports</Button><h2 className="text-xl font-semibold text-slate-950 dark:text-white">{data?.title ?? 'Report'}</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{data?.description}</p></div>
      <Button size="sm" variant="outline" onClick={print} disabled={!data}><Printer className="h-4 w-4" />Print Report</Button>
    </div>
    <div className="p-6">{query.isLoading && <p className="text-sm text-slate-500">Loading report data...</p>}{query.error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{(query.error as Error).message}</div>}{data && <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="border-b-2 border-slate-300 dark:border-slate-700"><tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">{data.columns.map((column) => <th key={column.key} className="whitespace-nowrap px-3 py-3 first:pl-0">{column.label}</th>)}</tr></thead><tbody>{data.rows.map((row, index) => <tr key={index} className="border-t border-slate-200/70 dark:border-white/10">{data.columns.map((column) => <td key={column.key} className={`whitespace-nowrap px-3 py-3 first:pl-0 ${column.type !== 'text' ? 'text-right' : ''}`}>{format(row[column.key], column.type)}</td>)}</tr>)}</tbody></table>{data.rows.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No data available for this report yet.</p>}</div>}</div>
  </Card>;
}

function format(value: string | number | null | undefined, type: string) { if (value === null || value === undefined || value === '') return '—'; if (type === 'currency') return `KES ${currency.format(Number(value))}`; if (type === 'number') return currency.format(Number(value)); return String(value); }
