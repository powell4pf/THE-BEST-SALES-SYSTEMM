import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { api } from '../lib/api';
import type { StatementDto } from '../lib/apiTypes';

const printStyles = `
  body { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 32px; color: #111827; background: #fff; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
  .title { font-size: 28px; font-weight: 700; margin: 0; }
  .customer { font-size: 18px; font-weight: 600; color: #0284c7; margin: 4px 0 0 0; }
  .period { font-size: 14px; color: #6b7280; }
  table { width: 100%; border-collapse: collapse; margin-top: 24px; }
  th, td { padding: 12px 10px; border: 1px solid #e5e7eb; }
  th { background: #f8fafc; font-size: 12px; text-align: left; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; }
  td { font-size: 13px; color: #111827; }
  .text-right { text-align: right; }
  .balance-row { font-weight: 600; }
  .total-row { font-weight: 700; border-top: 2px solid #374151; }`;

const currency = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

export function StatementsPage() {
  const [customerId, setCustomerId] = useState('');
  const [startDate, setStartDate] = useState(firstDayOfMonth());
  const [endDate, setEndDate] = useState(today());

  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: () => api.listCustomers() });
  const customers = useMemo(() => customersQuery.data?.items ?? [], [customersQuery.data]);

  const generateStatement = useMutation({
    mutationFn: (params: { customerId: string; startDate: string; endDate: string }) => api.generateStatement(params)
  });

  const statement = generateStatement.data;

  const handleGenerate = () => generateStatement.mutate({ customerId, startDate, endDate });

  return (
    <div className="grid gap-6 xl:grid-cols-[0.6fr_1.4fr]">
      <Card className="flex flex-col">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Generate Statement</h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Select a customer and date range to view their statement of account.</p>
        </div>
        <div className="flex-1 space-y-4 p-6">
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Customer</label>
            <Select value={customerId} onChange={(e) => setCustomerId(e.target.value)} disabled={customersQuery.isLoading}>
              <option value="">{customersQuery.isLoading ? 'Loading...' : 'Select a customer'}</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.companyName}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">Start Date</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 dark:text-slate-200">End Date</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>
        </div>
        <div className="border-t border-slate-200/70 p-6 dark:border-white/10">
          <Button className="w-full" onClick={handleGenerate} disabled={!customerId || generateStatement.isPending}>
            {generateStatement.isPending ? 'Generating...' : 'Generate Statement'}
          </Button>
        </div>
      </Card>

      <Card>
        {statement ? (
          <div className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-slate-950 dark:text-white">Statement of Account</h3>
                <p className="mt-1 text-lg font-semibold text-sky-600 dark:text-sky-400">{statement.customerName}</p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  For the period: {statement.startDate} to {statement.endDate}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => {
                const printWindow = window.open('', '_blank', 'width=900,height=700');
                if (!printWindow) return;
                const html = `
                  <html><head><title>Statement for ${statement.customerName}</title><style>${printStyles}</style></head>
                  <body>
                    <div class="header">
                      <div>
                        <h1 class="title">Statement of Account</h1>
                        <p class="customer">${statement.customerName}</p>
                        <p class="period">For the period: ${statement.startDate} to ${statement.endDate}</p>
                      </div>
                    </div>
                    <table>
                      <thead><tr><th>Date</th><th>Document</th><th>Description</th><th class="text-right">Debit</th><th class="text-right">Credit</th><th class="text-right">Balance</th></tr></thead>
                      <tbody>
                        <tr class="balance-row"><td colspan="5">Opening Balance</td><td class="text-right">${currency.format(statement.openingBalance)}</td></tr>
                        ${statement.transactions.map((tx) => `
                          <tr>
                            <td>${tx.date}</td><td>${tx.document}</td><td>${tx.description}</td>
                            <td class="text-right">${tx.debit > 0 ? currency.format(tx.debit) : '-'}</td>
                            <td class="text-right">${tx.credit > 0 ? currency.format(tx.credit) : '-'}</td>
                            <td class="text-right">${currency.format(tx.balance)}</td>
                          </tr>`).join('')}
                        <tr class="total-row"><td colspan="5">Closing Balance</td><td class="text-right">${currency.format(statement.closingBalance)}</td></tr>
                      </tbody>
                    </table>
                  </body></html>`;
                printWindow.document.open();
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.focus();
                printWindow.print();
              }}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b-2 border-slate-300 dark:border-slate-700">
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 pr-3">Date</th>
                    <th className="py-3 pr-3">Document</th>
                    <th className="py-3 pr-3">Description</th>
                    <th className="py-3 pr-3 text-right">Debit</th>
                    <th className="py-3 pr-3 text-right">Credit</th>
                    <th className="py-3 pl-3 text-right">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="font-semibold">
                    <td colSpan={5} className="py-3 pr-3">Opening Balance</td>
                    <td className="py-3 pl-3 text-right">{currency.format(statement.openingBalance)}</td>
                  </tr>
                  {statement.transactions.map((tx, index) => (
                    <tr key={index} className="border-t border-slate-200/70 dark:border-white/10">
                      <td className="py-3 pr-3">{tx.date}</td>
                      <td className="py-3 pr-3">{tx.document}</td>
                      <td className="py-3 pr-3">{tx.description}</td>
                      <td className="py-3 pr-3 text-right">{tx.debit > 0 ? currency.format(tx.debit) : '-'}</td>
                      <td className="py-3 pr-3 text-right">{tx.credit > 0 ? currency.format(tx.credit) : '-'}</td>
                      <td className="py-3 pl-3 text-right">{currency.format(tx.balance)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-300 font-extrabold dark:border-slate-700">
                    <td colSpan={5} className="py-3 pr-3">Closing Balance</td>
                    <td className="py-3 pl-3 text-right">{currency.format(statement.closingBalance)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        ) : generateStatement.error ? (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{(generateStatement.error as Error).message}</div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center p-6 text-center">
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">No Statement Generated</h3>
            <p className="mt-2 max-w-xs text-sm text-slate-500 dark:text-slate-400">Please select a customer and date range, then click "Generate Statement" to view the account activity.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
