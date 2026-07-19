import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { DataTable } from '../components/DataTable';
import { Button } from '../components/ui/button';
import type { TableColumn } from '../lib/types';
import { api } from '../lib/api';
import { Field, Modal } from '../components/Modal';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import type { CreateCreditNoteRequest, CreditNoteDetailsDto, InvoiceSummaryDto, ParentGroupSummaryDto, ProductSummaryDto } from '../lib/apiTypes';

const creditNoteItemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().min(1, 'Product is required'),
  productName: z.string(),
  quantity: z.string().min(1, 'Quantity is required'),
  unitPrice: z.string().min(1, 'Price is required'),
  reason: z.string().optional()
});

const creditNoteSchema = z.object({
  id: z.string().optional(),
  creditNoteNumber: z.string().min(1, 'Credit note number is required'),
  creditNoteDate: z.string().min(1, 'Date is required'),
  customerId: z.string().min(1, 'Customer is required'),
  invoiceId: z.string().optional(),
  subject: z.string().min(1, 'Subject is required'),
  items: z.array(creditNoteItemSchema).min(1, 'At least one item is required')
});

type CreditNoteFormValues = z.infer<typeof creditNoteSchema>;

const currency = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });

function today() {
  return new Date().toISOString().slice(0, 10);
}

function toFormValues(cn: CreditNoteDetailsDto): CreditNoteFormValues {
  return {
    id: cn.id,
    creditNoteNumber: cn.creditNoteNumber,
    creditNoteDate: cn.creditNoteDate,
    customerId: cn.customerId,
    invoiceId: cn.invoiceId ?? '',
    subject: cn.subject,
    items: cn.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      productName: item.productName,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      reason: item.reason ?? ''
    }))
  };
}

function emptyValues(creditNoteNumber: string, customers: ParentGroupSummaryDto[], products: ProductSummaryDto[]): CreditNoteFormValues {
  return {
    id: undefined,
    creditNoteNumber,
    creditNoteDate: today(),
    customerId: customers[0]?.id ?? '',
    invoiceId: '',
    subject: '',
    items: [{ id: undefined, productId: products[0]?.id ?? '', productName: products[0]?.productName ?? '', quantity: '1', unitPrice: String(products[0]?.sellingPrice ?? 0), reason: '' }]
  };
}

function toRequest(values: CreditNoteFormValues): CreateCreditNoteRequest {
  return {
    creditNoteNumber: values.creditNoteNumber,
    creditNoteDate: values.creditNoteDate,
    customerId: values.customerId,
    invoiceId: values.invoiceId || null,
    subject: values.subject,
    items: values.items.map((item) => ({
      productId: item.productId,
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      reason: item.reason
    }))
  };
}

export function CreditNotesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const creditNotesQuery = useQuery({ queryKey: ['creditNotes'], queryFn: () => api.listCreditNotes() });
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: () => api.listCustomers() });
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => api.listProducts() });
  const invoicesQuery = useQuery({ queryKey: ['invoices'], queryFn: () => api.listInvoices() });

  const creditNoteDetailsQuery = useQuery({
    queryKey: ['creditNote', editingId],
    queryFn: () => api.getCreditNote(editingId as string),
    enabled: modalOpen && Boolean(editingId)
  });

  const nextCreditNoteNumberQuery = useQuery({
    queryKey: ['nextCreditNoteNumber'],
    queryFn: () => api.getNextCreditNoteNumber(),
    enabled: modalOpen && !editingId
  });

  const deleteCreditNote = useMutation({
    mutationFn: (id: string) => api.deleteCreditNote(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['creditNotes'] })
  });

  const rows = useMemo(() => (creditNotesQuery.data?.items ?? []).map((cn) => ({ ...cn, totalFormatted: `KES ${currency.format(cn.total)}` })), [creditNotesQuery.data]);
  const customers = useMemo(() => customersQuery.data?.items ?? [], [customersQuery.data]);
  const products = useMemo(() => productsQuery.data?.items ?? [], [productsQuery.data]);
  const invoices = useMemo(() => invoicesQuery.data?.items ?? [], [invoicesQuery.data]);

  const form = useForm<CreditNoteFormValues>({
    resolver: zodResolver(creditNoteSchema),
    defaultValues: emptyValues('', customers, products)
  });

  const { control, handleSubmit, reset, setValue, watch, formState: { errors, isSubmitting } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });
  const customerId = useWatch({ control, name: 'customerId' });

  const customerInvoices = useMemo(() => invoices.filter((inv) => inv.parentGroupId === customerId), [invoices, customerId]);
  const findProduct = (id: string) => products.find((p) => p.id === id);

  useEffect(() => {
    if (!modalOpen) return;
    if (editingId && creditNoteDetailsQuery.data) {
      reset(toFormValues(creditNoteDetailsQuery.data));
      return;
    }

    if (!editingId && nextCreditNoteNumberQuery.data) {
      reset(emptyValues(nextCreditNoteNumberQuery.data.nextNumber, customers, products));
    }
  }, [editingId, modalOpen, reset, creditNoteDetailsQuery.data, nextCreditNoteNumberQuery.data, customers, products]);

  const saveCreditNote = useMutation({
    mutationFn: async (values: CreditNoteFormValues) => {
      const request = toRequest(values);
      if (editingId) {
        await api.updateCreditNote(editingId, request);
        return editingId;
      }
      return api.createCreditNote(request);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['creditNotes'] });
      if (editingId) {
        await queryClient.invalidateQueries({ queryKey: ['creditNote', editingId] });
      }
      await queryClient.invalidateQueries({ queryKey: ['nextCreditNoteNumber'] });
      setModalOpen(false);
      setEditingId(null);
      reset(emptyValues('', customers, products));
    }
  });

  const submit = (values: CreditNoteFormValues) => saveCreditNote.mutate(values);

  const columns: TableColumn<(typeof rows)[number]>[] = [
    { key: 'creditNoteNumber', label: 'Credit Note #' },
    { key: 'customerName', label: 'Customer' },
    { key: 'invoiceNumber', label: 'Invoice #' },
    { key: 'creditNoteDate', label: 'Date' },
    { key: 'totalFormatted', label: 'Total', align: 'right' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span
          className={
            row.status === 'Applied' ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300'
            : row.status === 'Issued' ? 'rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-700 dark:text-sky-300'
            : 'rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300'
          }
        >
          {row.status}
        </span>
      )
    },
    {
      key: 'id',
      label: 'Actions',
      align: 'right',
      render: (row) => (
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="outline" onClick={() => openEdit(row.id)}><Pencil className="h-4 w-4" />Edit</Button>
          <Button size="sm" variant="ghost" onClick={() => handlePrint(row.id)}><Printer className="h-4 w-4" />Print</Button>
          <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)} disabled={deleteCreditNote.isPending}><Trash2 className="h-4 w-4" />Delete</Button>
        </div>
      )
    }
  ];

  function openCreate() {
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(id: string) {
    setEditingId(id);
    setModalOpen(true);
  }

  function handleDelete(id: string) {
    const creditNote = creditNotesQuery.data?.items.find((item) => item.id === id);
    if (!creditNote) return;
    if (!window.confirm(`Delete ${creditNote.creditNoteNumber}? This action cannot be undone.`)) return;
    deleteCreditNote.mutate(id);
  }

  async function handlePrint(id: string) {
    const creditNote = await queryClient.fetchQuery({ queryKey: ['creditNote', id], queryFn: () => api.getCreditNote(id) });
    const customer = customers.find((c) => c.id === creditNote.customerId);

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) return;

    const html = `
      <html><head><title>Credit Note ${creditNote.creditNoteNumber}</title>
      <style>body{font-family:Inter,sans-serif;padding:32px;color:#111827}h1{font-size:24px;font-weight:700}table{width:100%;border-collapse:collapse;margin-top:24px}th,td{padding:12px 10px;border:1px solid #e5e7eb;text-align:left}th{background:#f8fafc;font-size:12px;color:#374151}.text-right{text-align:right}</style>
      </head><body>
      <h1>Credit Note: ${creditNote.creditNoteNumber}</h1>
      <p><strong>Customer:</strong> ${customer?.companyName ?? 'N/A'}</p>
      <p><strong>Date:</strong> ${creditNote.creditNoteDate}</p>
      <p><strong>Subject:</strong> ${creditNote.subject}</p>
      <table>
        <thead><tr><th>Product</th><th>Reason</th><th class="text-right">Qty</th><th class="text-right">Unit Price</th><th class="text-right">Total</th></tr></thead>
        <tbody>
          ${creditNote.items.map((item) => `<tr><td>${item.productName}</td><td>${item.reason ?? ''}</td><td class="text-right">${item.quantity}</td><td class="text-right">${currency.format(item.unitPrice)}</td><td class="text-right">${currency.format(item.quantity * item.unitPrice)}</td></tr>`).join('')}
        </tbody>
        <tfoot><tr><td colspan="4" class="text-right"><strong>Total</strong></td><td class="text-right"><strong>${currency.format(creditNote.total)}</strong></td></tr></tfoot>
      </table>
      </body></html>`;

    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <>
      <DataTable
        title="Credit Notes"
        subtitle={creditNotesQuery.isLoading || customersQuery.isLoading || productsQuery.isLoading ? 'Loading data...' : 'Issue and audit credit notes against invoices.'}
        columns={columns}
        rows={rows}
        emptyMessage={creditNotesQuery.error ? (creditNotesQuery.error as Error).message : 'No credit notes found.'}
        actions={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />Issue Credit Note</Button>}
      />
      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Credit Note' : 'Issue Credit Note'}
        description="Create a credit note to adjust a customer's balance, often linked to a specific invoice."
        onClose={() => {
          setModalOpen(false);
          setEditingId(null);
        }}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(submit)} disabled={isSubmitting || saveCreditNote.isPending || creditNoteDetailsQuery.isLoading || nextCreditNoteNumberQuery.isLoading}>
              {editingId ? 'Save Changes' : 'Issue Credit Note'}
            </Button>
          </>
        }
      >
        {saveCreditNote.error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{(saveCreditNote.error as Error).message}</div> : null}
        <form className="space-y-8" onSubmit={handleSubmit(submit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Credit Note #" required error={errors.creditNoteNumber?.message}>
              <Input {...form.register('creditNoteNumber')} />
            </Field>
            <Field label="Date" required error={errors.creditNoteDate?.message}>
              <Input {...form.register('creditNoteDate')} type="date" />
            </Field>
            <Field label="Customer" required error={errors.customerId?.message}>
              <Select {...form.register('customerId')}>
                <option value="">Select a customer</option>
                {customers.map((c) => (<option key={c.id} value={c.id}>{c.companyName}</option>))}
              </Select>
            </Field>
            <Field label="Reference Invoice" error={errors.invoiceId?.message}>
              <Select {...form.register('invoiceId')} disabled={!customerId}>
                <option value="">None</option>
                {customerInvoices.map((inv) => (<option key={inv.id} value={inv.id}>{inv.invoiceNumber}</option>))}
              </Select>
            </Field>
            <Field label="Subject" required error={errors.subject?.message} className="md:col-span-2">
              <Textarea {...form.register('subject')} placeholder="e.g., Credit for returned goods" />
            </Field>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-slate-950 dark:text-white">Credit Items</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Add products being credited.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => append({ id: undefined, productId: '', productName: '', quantity: '1', unitPrice: '0', reason: '' })}>
                <Plus className="h-4 w-4" />
                Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-3xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="mb-4 flex items-center justify-between">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Line {index + 1}</div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} disabled={fields.length === 1}>Remove</Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    <Field label="Product" required error={errors.items?.[index]?.productId?.message} className="xl:col-span-3">
                      <Select
                        {...form.register(`items.${index}.productId` as const)}
                        onChange={(event) => {
                          const productId = event.target.value;
                          const product = findProduct(productId);
                          setValue(`items.${index}.productId`, productId, { shouldValidate: true });
                          setValue(`items.${index}.productName`, product?.productName ?? '', { shouldValidate: true });
                          setValue(`items.${index}.unitPrice`, String(product?.sellingPrice ?? 0), { shouldValidate: true });
                        }}
                      >
                        <option value="">Select a product</option>
                        {products.map((p) => (<option key={p.id} value={p.id}>{p.productName}</option>))}
                      </Select>
                    </Field>
                    <Field label="Quantity" required error={errors.items?.[index]?.quantity?.message}>
                      <Input {...form.register(`items.${index}.quantity` as const)} inputMode="decimal" />
                    </Field>
                    <Field label="Unit Price" required error={errors.items?.[index]?.unitPrice?.message}>
                      <Input {...form.register(`items.${index}.unitPrice` as const)} inputMode="decimal" />
                    </Field>
                    <Field label="Reason" error={errors.items?.[index]?.reason?.message} className="xl:col-span-3">
                      <Input {...form.register(`items.${index}.reason` as const)} placeholder="e.g., Damaged in transit" />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
            {errors.items?.message ? <p className="text-xs text-rose-500">{errors.items.message}</p> : null}
          </div>
        </form>
      </Modal>
    </>
  );
}
