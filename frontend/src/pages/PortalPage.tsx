import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Building, ChevronLeft, FileText, Mail, MapPin, Phone, Printer, Search, Wallet } from 'lucide-react';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { api } from '../lib/api';
import type { StatementDto } from '../lib/apiTypes';
import { openLetterheadPrintWindow, openStatementPrintWindow } from '../lib/print';

const currency = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });
const dateFormatter = new Intl.DateTimeFormat('en-KE', { dateStyle: 'medium' });

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

function printStatement(statement: StatementDto) {
  openStatementPrintWindow(statement);
  return;

  const rows = statement.transactions.map((transaction) => `
    <tr>
      <td>${escapeHtml(dateFormatter.format(new Date(transaction.date)))}</td>
      <td>${escapeHtml(transaction.document || '—')}</td>
      <td>${escapeHtml(transaction.description || '—')}</td>
      <td class="amount">${transaction.debit ? `KES ${currency.format(transaction.debit)}` : '—'}</td>
      <td class="amount">${transaction.credit ? `KES ${currency.format(transaction.credit)}` : '—'}</td>
      <td class="amount">KES ${currency.format(transaction.balance)}</td>
    </tr>`).join('');

  openLetterheadPrintWindow(
    `Statement - ${statement.customerName}`,
    `<h1>Statement of Account</h1>
      <p><strong>Customer:</strong> ${escapeHtml(statement.customerName)}</p>
      <p><strong>Period:</strong> ${escapeHtml(statement.startDate)} to ${escapeHtml(statement.endDate)}</p>
      <div class="summary"><strong>Opening balance:</strong> KES ${currency.format(statement.openingBalance)} &nbsp; <strong>Closing balance:</strong> KES ${currency.format(statement.closingBalance)}</div>
      <table><thead><tr><th>Date</th><th>Document</th><th>Description</th><th>Debit</th><th>Credit</th><th>Balance</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No transactions recorded for this period.</td></tr>'}</tbody></table>`,
    `h1{margin-bottom:8px}.summary{padding:12px;margin:20px 0;background:#f1f5f9;border-radius:8px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:9px 6px;border-bottom:1px solid #e2e8f0;text-align:left}th{background:#f8fafc}.amount{text-align:right}`
  );
}

export function PortalPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [statementStartDate, setStatementStartDate] = useState(() => `${new Date().getFullYear()}-01-01`);
  const [statementEndDate, setStatementEndDate] = useState(() => new Date().toISOString().slice(0, 10));
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: () => api.listCustomers() });
  const invoicesQuery = useQuery({ queryKey: ['invoices'], queryFn: () => api.listInvoices(), enabled: Boolean(selectedCustomerId) });
  const paymentsQuery = useQuery({ queryKey: ['payments'], queryFn: () => api.listPayments(), enabled: Boolean(selectedCustomerId) });
  const statementMutation = useMutation({
    mutationFn: () => api.generateStatement({ customerId: selectedCustomerId as string, startDate: statementStartDate, endDate: statementEndDate })
  });

  const customers = customersQuery.data?.items ?? [];
  const filteredCustomers = useMemo(() => {
    const term = searchQuery.trim().toLowerCase();
    if (!term) return customers;
    return customers.filter((customer) =>
      [customer.companyName, customer.contactPerson, customer.email, customer.phone]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(term))
    );
  }, [customers, searchQuery]);

  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) ?? null;
  const customerInvoices = (invoicesQuery.data?.items ?? []).filter((invoice) => invoice.parentGroupId === selectedCustomerId);
  const customerPayments = (paymentsQuery.data?.items ?? []).filter((payment) => payment.parentGroupId === selectedCustomerId);

  if (customersQuery.isLoading) return <div className="p-4 text-center">Loading customers...</div>;
  if (customersQuery.isError) return <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">Unable to load customers: {(customersQuery.error as Error).message}</div>;

  if (selectedCustomer) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => { setSelectedCustomerId(null); statementMutation.reset(); }}><ChevronLeft className="h-4 w-4" /> All customers</Button>
        <Card className="p-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <h2 className="flex items-center gap-2 text-2xl font-semibold text-slate-950 dark:text-white"><Building className="h-6 w-6 text-sky-600" />{selectedCustomer.companyName}</h2>
              <p className="mt-1 text-sm text-slate-500">Customer profile and account activity</p>
            </div>
            <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-sm text-emerald-700">{selectedCustomer.status}</span>
          </div>
          <div className="mt-6 grid gap-3 text-sm text-slate-600 dark:text-slate-300 md:grid-cols-2">
            {selectedCustomer.contactPerson && <p><strong>Contact:</strong> {selectedCustomer.contactPerson}</p>}
            {selectedCustomer.email && <p className="flex items-center gap-2"><Mail className="h-4 w-4" />{selectedCustomer.email}</p>}
            {selectedCustomer.phone && <p className="flex items-center gap-2"><Phone className="h-4 w-4" />{selectedCustomer.phone}</p>}
            {selectedCustomer.address && <p className="flex items-center gap-2"><MapPin className="h-4 w-4" />{selectedCustomer.address}</p>}
          </div>
        </Card>

        <div className="grid gap-6 xl:grid-cols-2">
          <Card className="p-6"><h3 className="flex items-center gap-2 text-lg font-semibold"><MapPin className="h-5 w-5 text-sky-600" />Branches</h3><div className="mt-4 space-y-3">{selectedCustomer.branches.length === 0 ? <p className="text-sm text-slate-500">No branches recorded.</p> : selectedCustomer.branches.map((branch) => <div key={branch.id} className="rounded-xl border p-3"><p className="font-medium">{branch.branchName}</p><p className="text-sm text-slate-500">{branch.address || 'No address'}{branch.contactPerson ? ` · ${branch.contactPerson}` : ''}</p></div>)}</div></Card>
          <Card className="p-6"><h3 className="flex items-center gap-2 text-lg font-semibold"><Wallet className="h-5 w-5 text-sky-600" />Payments</h3>{paymentsQuery.isLoading ? <p className="mt-4 text-sm text-slate-500">Loading payments...</p> : paymentsQuery.isError ? <p className="mt-4 text-sm text-rose-600">Unable to load payments: {(paymentsQuery.error as Error).message}</p> : <div className="mt-4 space-y-2">{customerPayments.length === 0 ? <p className="text-sm text-slate-500">No payments recorded.</p> : customerPayments.map((payment) => <div key={payment.id} className="flex justify-between border-b py-2 text-sm"><span>{payment.paymentDate} · {payment.method}</span><strong>KES {currency.format(payment.amount)}</strong></div>)}</div>}</Card>
        </div>

        <Card className="p-6"><h3 className="flex items-center gap-2 text-lg font-semibold"><FileText className="h-5 w-5 text-sky-600" />Invoices</h3>{invoicesQuery.isLoading ? <p className="mt-4 text-sm text-slate-500">Loading invoices...</p> : invoicesQuery.isError ? <p className="mt-4 text-sm text-rose-600">Unable to load invoices: {(invoicesQuery.error as Error).message}</p> : <div className="mt-4 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-3">Invoice</th><th>Date</th><th>Status</th><th className="text-right">Total</th></tr></thead><tbody>{customerInvoices.length === 0 ? <tr><td colSpan={4} className="py-4 text-slate-500">No invoices recorded.</td></tr> : customerInvoices.map((invoice) => <tr key={invoice.id} className="border-b"><td className="py-3">{invoice.invoiceNumber}</td><td>{invoice.invoiceDate}</td><td>{invoice.status}</td><td className="text-right">KES {currency.format(invoice.grandTotal)}</td></tr>)}</tbody></table></div>}</Card>
        <Card className="p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div><h3 className="flex items-center gap-2 text-lg font-semibold"><FileText className="h-5 w-5 text-sky-600" />Statement of Account</h3><p className="mt-1 text-sm text-slate-500">Generate a statement for this customer and print it for sharing.</p></div>
            <div className="flex flex-wrap items-end gap-3">
              <label className="text-xs font-medium text-slate-600">From<Input type="date" value={statementStartDate} onChange={(event) => setStatementStartDate(event.target.value)} className="mt-1" /></label>
              <label className="text-xs font-medium text-slate-600">To<Input type="date" value={statementEndDate} onChange={(event) => setStatementEndDate(event.target.value)} className="mt-1" /></label>
              <Button onClick={() => statementMutation.mutate()} disabled={statementMutation.isPending || !statementStartDate || !statementEndDate || statementStartDate > statementEndDate}>{statementMutation.isPending ? 'Generating...' : 'Generate Statement'}</Button>
            </div>
          </div>
          {statementStartDate > statementEndDate && <p className="mt-3 text-sm text-rose-600">The start date must be before the end date.</p>}
          {statementMutation.isError && <p className="mt-3 text-sm text-rose-600">Unable to generate statement: {(statementMutation.error as Error).message}</p>}
          {statementMutation.data && <div className="mt-6 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Opening balance</p><p className="mt-1 text-lg font-semibold">KES {currency.format(statementMutation.data.openingBalance)}</p></div><div className="rounded-xl bg-slate-50 p-4"><p className="text-xs text-slate-500">Closing balance</p><p className="mt-1 text-lg font-semibold">KES {currency.format(statementMutation.data.closingBalance)}</p></div></div>
            <div className="flex items-center justify-between"><p className="text-sm text-slate-500">{statementMutation.data.transactions.length} transaction(s) from {statementMutation.data.startDate} to {statementMutation.data.endDate}</p><Button variant="outline" onClick={() => printStatement(statementMutation.data as StatementDto)}><Printer className="h-4 w-4" /> Print Statement</Button></div>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-3">Date</th><th>Document</th><th>Description</th><th className="text-right">Debit</th><th className="text-right">Credit</th><th className="text-right">Balance</th></tr></thead><tbody>{statementMutation.data.transactions.length === 0 ? <tr><td colSpan={6} className="py-4 text-slate-500">No transactions recorded for this period.</td></tr> : statementMutation.data.transactions.map((transaction) => <tr key={`${transaction.date}-${transaction.document}-${transaction.balance}`} className="border-b"><td className="py-3">{transaction.date}</td><td>{transaction.document || '—'}</td><td>{transaction.description || '—'}</td><td className="text-right">{transaction.debit ? `KES ${currency.format(transaction.debit)}` : '—'}</td><td className="text-right">{transaction.credit ? `KES ${currency.format(transaction.credit)}` : '—'}</td><td className="text-right">KES {currency.format(transaction.balance)}</td></tr>)}</tbody></table></div>
          </div>}
        </Card>
      </div>
    );
  }

  return <div className="space-y-6"><div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between"><div><h2 className="text-2xl font-semibold text-slate-950 dark:text-white">Customer Portal</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Select a customer to view profile, branches, invoices, payments, and account activity.</p></div><div className="relative md:w-80"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" /><Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search customers..." className="pl-10" /></div></div><div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">{filteredCustomers.map((customer) => <Card key={customer.id} className="flex flex-col justify-between p-6"><div><h3 className="flex items-center gap-2 text-lg font-semibold text-slate-950 dark:text-white"><Building className="h-5 w-5 text-sky-600" />{customer.companyName}</h3><div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-400">{customer.contactPerson && <p>Contact: {customer.contactPerson}</p>}{customer.email && <p>{customer.email}</p>}<p>{customer.branchCount} {customer.branchCount === 1 ? 'branch' : 'branches'} · Credit limit KES {currency.format(customer.creditLimit)}</p></div></div><Button className="mt-6 w-full" onClick={() => setSelectedCustomerId(customer.id)}>View Details</Button></Card>)}</div>{customers.length === 0 ? <p className="p-4 text-center text-slate-500">No customers found.</p> : filteredCustomers.length === 0 ? <p className="p-4 text-center text-slate-500">No customers match your search.</p> : null}</div>;
}
