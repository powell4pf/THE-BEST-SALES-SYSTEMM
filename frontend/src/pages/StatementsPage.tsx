import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Printer } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Select } from '../components/ui/select';
import { Input } from '../components/ui/input';
import { api } from '../lib/api';
import type { StatementDto } from '../lib/apiTypes';
import { openStatementPrintWindow } from '../lib/print';

const currency = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });

function today() {
  return new Date().toISOString().slice(0, 10);
}

function firstDayOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
}

function statementDate(value: string) {
  const [year, month, day] = value.split('-');
  return `${Number(day)}/${Number(month)}/${year}`;
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
  const invoiceRows = statement?.transactions.filter((transaction) => transaction.document !== 'OPENING' && transaction.debit > 0) ?? [];
  const invoiceTotal = invoiceRows.reduce((sum, transaction) => sum + transaction.debit, 0);

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
                  For the period: {statementDate(statement.startDate)} to {statementDate(statement.endDate)}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => openStatementPrintWindow(statement)}>
                <Printer className="h-4 w-4" />
                Print
              </Button>
            </div>

            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b-2 border-slate-300 dark:border-slate-700">
                  <tr className="text-left text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <th className="py-3 pr-3">Date</th>
                    <th className="py-3 pr-3">Invoice No</th>
                    <th className="py-3 pr-3">Branch</th>
                    <th className="py-3 pl-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {invoiceRows.map((tx, index) => (
                    <tr key={index} className="border-t border-slate-200/70 dark:border-white/10">
                      <td className="py-3 pr-3">{statementDate(tx.date)}</td>
                      <td className="py-3 pr-3 font-semibold text-slate-950 dark:text-white">{tx.document}</td>
                      <td className="py-3 pr-3">{tx.description || '-'}</td>
                      <td className="py-3 pl-3 text-right font-semibold">{currency.format(tx.debit)}</td>
                    </tr>
                  ))}
                  <tr className="border-t-2 border-slate-300 font-extrabold dark:border-slate-700">
                    <td colSpan={3} className="py-3 pr-3">Total</td>
                    <td className="py-3 pl-3 text-right">{currency.format(invoiceTotal)}</td>
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
