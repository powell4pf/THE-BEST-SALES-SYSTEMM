import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { api } from '../lib/api';
import { downloadCsv } from '../lib/exportCsv';
import { Download } from 'lucide-react';

const currency = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });
const today = () => new Date().toISOString().slice(0, 10);

export function PaymentsPage() {
  const queryClient = useQueryClient();
  const paymentsQuery = useQuery({ queryKey: ['payments'], queryFn: () => api.listPayments() });
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: () => api.listCustomers() });
  const invoicesQuery = useQuery({ queryKey: ['invoices'], queryFn: () => api.listInvoices() });
  const [customerId, setCustomerId] = useState(''); const [invoiceId, setInvoiceId] = useState(''); const [date, setDate] = useState(today()); const [amount, setAmount] = useState(''); const [method, setMethod] = useState('M-Pesa'); const [reference, setReference] = useState('');
  const invoices = useMemo(() => (invoicesQuery.data?.items ?? []).filter(x => x.parentGroupId === customerId && x.status !== 'Paid' && x.status !== 'Cancelled'), [invoicesQuery.data, customerId]);
  const savePayment = useMutation({ mutationFn: () => api.createPayment({ customerId, invoiceId: invoiceId || null, paymentDate: date, amount: Number(amount), method, reference: reference || null }), onSuccess: async () => { setAmount(''); setReference(''); setInvoiceId(''); await queryClient.invalidateQueries({ queryKey: ['payments'] }); await queryClient.invalidateQueries({ queryKey: ['invoices'] }); } });
  return <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]"><Card className="p-6"><h2 className="text-xl font-semibold">Record Payment</h2><p className="mt-2 text-sm text-slate-500">Record customer receipts and optionally allocate them to an invoice.</p><div className="mt-6 space-y-4"><Select value={customerId} onChange={e => { setCustomerId(e.target.value); setInvoiceId(''); }}><option value="">Select customer</option>{(customersQuery.data?.items ?? []).map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}</Select><Select value={invoiceId} onChange={e => setInvoiceId(e.target.value)} disabled={!customerId}><option value="">Unallocated payment</option>{invoices.map(i => <option key={i.id} value={i.id}>{i.invoiceNumber} - KES {currency.format(i.grandTotal)}</option>)}</Select><Input type="date" value={date} onChange={e => setDate(e.target.value)} /><Input type="number" min="0.01" placeholder="Amount" value={amount} onChange={e => setAmount(e.target.value)} /><Select value={method} onChange={e => setMethod(e.target.value)}><option>M-Pesa</option><option>Bank Transfer</option><option>Cash</option><option>Cheque</option><option>Card</option></Select><Input placeholder="Reference" value={reference} onChange={e => setReference(e.target.value)} /><Button className="w-full" onClick={() => savePayment.mutate()} disabled={!customerId || Number(amount) <= 0 || savePayment.isPending}>{savePayment.isPending ? 'Saving...' : 'Save Payment'}</Button>{savePayment.error && <p className="text-sm text-rose-600">{(savePayment.error as Error).message}</p>}</div></Card><Card className="p-6"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">Payment History</h2><Button size="sm" variant="outline" onClick={() => downloadCsv('payments.csv', (paymentsQuery.data?.items ?? []).map(p => ({ Date: p.paymentDate, Customer: p.customerName, Method: p.method, Reference: p.reference, Amount: p.amount })))}><Download className="h-4 w-4" />Export CSV</Button></div><div className="mt-6 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-3">Date</th><th>Customer</th><th>Method</th><th>Reference</th><th className="text-right">Amount</th></tr></thead><tbody>{(paymentsQuery.data?.items ?? []).map(p => <tr key={p.id} className="border-b"><td className="py-3">{p.paymentDate}</td><td>{p.customerName}</td><td>{p.method}</td><td>{p.reference ?? '-'}</td><td className="text-right">KES {currency.format(p.amount)}</td></tr>)}</tbody></table>{paymentsQuery.error && <p className="mt-4 text-sm text-rose-600">{(paymentsQuery.error as Error).message}</p>}</div></Card></div>;
}
