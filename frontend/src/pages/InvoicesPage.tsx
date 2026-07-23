import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { Field, Modal } from '../components/Modal';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import type { InvoiceFormValues } from '../lib/schemas';
import { invoiceSchema } from '../lib/schemas';
import type { InvoiceItemRow, InvoiceRow, TableColumn } from '../lib/types';
import { api } from '../lib/api';
import type { CreateInvoiceRequest, InvoiceDetailsDto, InvoiceDto, InvoiceItem, ParentGroupSummaryDto, ProductSummaryDto } from '../lib/apiTypes';
import { openLetterheadPrintWindow } from '../lib/print';

const currency = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });

function today() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(date: string, days: number) {
  const value = new Date(date);
  value.setDate(value.getDate() + days);
  return value.toISOString().slice(0, 10);
}

function toFormValues(invoice: InvoiceDetailsDto): InvoiceFormValues {
  return {
    id: invoice.id,
    invoiceNumber: invoice.invoiceNumber,
    lpoNumber: invoice.lpoNumber ?? '',
    invoiceDate: invoice.invoiceDate,
    parentGroupId: invoice.parentGroupId,
    branchId: invoice.branchId,
    salesperson: invoice.salesperson ?? '',
    paymentTerms: invoice.paymentTerms ?? '',
    dueDate: invoice.dueDate ?? '',
    notes: invoice.notes ?? '',
    items: invoice.items.map((item) => ({
      id: item.id,
      productId: item.productId ?? '',
      productName: item.productName ?? item.itemName,
      quantity: String(item.quantity),
      unitPrice: String(item.unitPrice),
      discount: String(item.discount),
      tax: String(item.tax)
    }))
  };
}

function emptyValues(invoiceNumber: string, customers: ParentGroupSummaryDto[], products: ProductSummaryDto[]): InvoiceFormValues {
  return {
    id: undefined,
    invoiceNumber,
    lpoNumber: '',
    invoiceDate: today(),
    parentGroupId: customers[0]?.id ?? '',
    branchId: '',
    salesperson: '',
    paymentTerms: '7 Days',
    dueDate: addDays(today(), 7),
    notes: '',
    items: [
      {
        id: undefined,
        productId: products[0]?.id ?? '',
        productName: products[0]?.productName ?? '',
        quantity: '1',
        unitPrice: String(products[0]?.sellingPrice ?? 0),
        discount: '0',
        tax: '0'
      }
    ]
  };
}

function computeLineTotal(item: { quantity: string; unitPrice: string; discount: string; tax: string }) {
  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.unitPrice || 0);
  const discount = Number(item.discount || 0);
  const tax = Number(item.tax || 0);
  return Math.max(quantity * unitPrice - discount + tax, 0);
}

function toRequest(values: InvoiceFormValues): CreateInvoiceRequest {
  return {
    invoiceNumber: values.invoiceNumber.trim(),
    lpoNumber: values.lpoNumber.trim(),
    invoiceDate: values.invoiceDate,
    dueDate: values.dueDate,
    parentGroupId: values.parentGroupId,
    branchId: values.branchId,
    salesperson: values.salesperson.trim(),
    paymentTerms: values.paymentTerms.trim(),
    notes: values.notes.trim(),
    items: values.items.map((item) => ({
      productId: item.productId,
      itemName: item.productName.trim() || 'Invoice item',
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
      discount: Number(item.discount),
      tax: Number(item.tax)
    }))
  };
}

export function InvoicesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const invoicesQuery = useQuery({ queryKey: ['invoices'], queryFn: () => api.listInvoices() });
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: () => api.listCustomers() });
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => api.listProducts() });

  const invoiceDetailsQuery = useQuery({
    queryKey: ['invoice', editingId],
    queryFn: () => api.getInvoice(editingId as string),
    enabled: modalOpen && Boolean(editingId)
  });

  const nextInvoiceNumberQuery = useQuery({
    queryKey: ['nextInvoiceNumber'],
    queryFn: () => api.getNextInvoiceNumber(),
    enabled: modalOpen && !editingId
  });

  const customers = useMemo(() => customersQuery.data?.items ?? [], [customersQuery.data]);
  const products = useMemo(() => productsQuery.data?.items ?? [], [productsQuery.data]);

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: emptyValues('', customers, products)
  });

  const { control, handleSubmit, reset, setValue, getValues, watch, formState: { errors, isSubmitting } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const parentGroupId = useWatch({ control, name: 'parentGroupId' });
  const watchedItems = useWatch({ control, name: 'items' }) ?? [];

  const findCustomer = (id: string) => customers.find((c) => c.id === id);
  const findProduct = (id: string) => products.find((p) => p.id === id);

  const selectedCustomer = useMemo(() => findCustomer(parentGroupId), [parentGroupId, customers]);
  const branchOptions = selectedCustomer?.branches ?? [];

  useEffect(() => {
    if (!modalOpen) return;
    if (editingId && invoiceDetailsQuery.data) {
      reset(toFormValues(invoiceDetailsQuery.data));
      return;
    }

    if (!editingId && nextInvoiceNumberQuery.data) {
      reset(emptyValues(nextInvoiceNumberQuery.data.nextNumber, customers, products));
    }
  }, [editingId, modalOpen, reset, invoiceDetailsQuery.data, nextInvoiceNumberQuery.data, customers, products]);

  useEffect(() => {
    if (!modalOpen) return;
    if (branchOptions.length === 0) return;
    const currentBranchId = getValues('branchId');
    if (!branchOptions.some((branch) => branch.id === currentBranchId)) {
      setValue('branchId', branchOptions[0].id, { shouldValidate: true });
    }
  }, [branchOptions, getValues, modalOpen, setValue]);

  const rows: (InvoiceDto & { grandTotal: number })[] = useMemo(
    () =>
      (invoicesQuery.data?.items ?? []).map((invoice) => {
        return {
          ...invoice,
          total: `KES ${currency.format(invoice.grandTotal)}`
        };
      }),
    [invoicesQuery.data]
  );

  const columns: TableColumn<(typeof rows)[number]>[] = [
    { key: 'invoiceNumber', label: 'Invoice Number' },
    { key: 'customerName', label: 'Customer' },
    { key: 'branch', label: 'Branch' },
    { key: 'invoiceDate', label: 'Date' },
    { key: 'total', label: 'Grand Total', align: 'right' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={row.status === 'Paid' ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300' : row.status === 'Finalized' ? 'rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-700 dark:text-sky-300' : 'rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300'}>
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
          <Button size="sm" variant="outline" onClick={() => openEdit(row.id)}>
            <Pencil className="h-4 w-4" />
            Edit
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handlePrint(row.id)}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)} disabled={deleteInvoice.isPending}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
        </div>
      )
    }
  ];

  const saveInvoice = useMutation({
    mutationFn: async (values: InvoiceFormValues) => {
      const request = toRequest(values);
      if (editingId) {
        await api.updateInvoice(editingId, request);
        return editingId;
      }
      return api.createInvoice(request);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      if (editingId) {
        await queryClient.invalidateQueries({ queryKey: ['invoice', editingId] });
      }
      await queryClient.invalidateQueries({ queryKey: ['nextInvoiceNumber'] });
      setModalOpen(false);
      setEditingId(null);
      reset(emptyValues('', customers, products));
    }
  });

  const deleteInvoice = useMutation({
    mutationFn: (id: string) => api.deleteInvoice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] })
  });

  const totals = useMemo(() => {
    const subtotal = watchedItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
    const discountTotal = watchedItems.reduce((sum, item) => sum + Number(item.discount || 0), 0);
    const taxTotal = watchedItems.reduce((sum, item) => sum + Number(item.tax || 0), 0);
    const grandTotal = watchedItems.reduce((sum, item) => sum + computeLineTotal(item), 0);
    return { subtotal, discountTotal, taxTotal, grandTotal };
  }, [watchedItems]);

  function openCreate() {
    setEditingId(null);
    setModalOpen(true);
  }

  function openEdit(id: string) {
    setEditingId(id);
    setModalOpen(true);
  }

  function handleDelete(id: string) {
    const invoice = invoicesQuery.data?.items.find((item) => item.id === id);
    if (!invoice) return;
    if (!window.confirm(`Delete ${invoice.invoiceNumber}?`)) return;
    deleteInvoice.mutate(id);
  }

  async function handlePrint(id: string) {
    const invoice = await queryClient.fetchQuery({ queryKey: ['invoice', id], queryFn: () => api.getInvoice(id) });

    const customer = findCustomer(invoice.parentGroupId);
    const branch = customer?.branches.find((item) => item.id === invoice.branchId);

    const styles = `
            body { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; color: #111827; background: #fff; }
            .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
            .invoice-title { font-size: 28px; font-weight: 700; margin: 0; }
            .invoice-meta { text-align: right; }
            .label { font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: #6b7280; margin-bottom: 4px; }
            .value { font-size: 14px; font-weight: 600; color: #111827; margin: 0; }
            .section { margin-bottom: 24px; }
            .section h3 { margin: 0 0 12px 0; font-size: 14px; letter-spacing: 0.08em; text-transform: uppercase; color: #111827; }
            .grid { display: grid; gap: 16px; grid-template-columns: repeat(2, minmax(0, 1fr)); }
            .details { padding: 16px; border: 1px solid #e5e7eb; border-radius: 16px; }
            table { width: 100%; border-collapse: collapse; margin-top: 16px; }
            th, td { padding: 12px 10px; border: 1px solid #e5e7eb; }
            th { background: #f8fafc; font-size: 12px; text-align: left; color: #374151; }
            td { font-size: 13px; color: #111827; }
            .text-right { text-align: right; }
            .summary { width: 320px; margin-left: auto; margin-top: 16px; }
            .summary-row { display: flex; justify-content: space-between; margin-bottom: 12px; }
            .summary-row strong { color: #111827; }
            .notes { margin-top: 24px; padding: 16px; border: 1px solid #e5e7eb; border-radius: 16px; background: #f8fafc; }
            .invoice-header { margin-bottom: 20px; }
            .section { margin-bottom: 16px; }
            th, td { padding: 8px 7px; }
            td { font-size: 11px; }
            .details { padding: 12px; }
            .notes { margin-top: 16px; padding: 12px; }
          `;
    const body = `
          <div class="invoice-header">
            <div>
              <p class="label">Invoice</p>
              <h1 class="invoice-title">${invoice.invoiceNumber}</h1>
            </div>
            <div class="invoice-meta">
              <p class="label">Date</p>
              <p class="value">${invoice.invoiceDate}</p>
              <p class="label">Due</p>
              <p class="value">${invoice.dueDate}</p>
            </div>
          </div>

          <div class="grid">
            <div class="details">
              <h3>Bill To</h3>
              <p class="value">${customer?.companyName ?? 'Unknown customer'}</p>
              <p class="value">${customer?.contactPerson ?? ''}</p>
              <p class="value">${customer?.email ?? ''}</p>
              <p class="value">${customer?.phone ?? ''}</p>
              <p class="value">${customer?.address ?? ''}</p>
            </div>
            <div class="details">
              <h3>Branch</h3>
              <p class="value">${branch?.branchName ?? 'Unknown branch'}</p>
              <p class="value">${branch?.address ?? ''}</p>
              <p class="value">${branch?.contactPerson ?? ''}</p>
              <p class="value">${invoice.salesperson}</p>
            </div>
          </div>

          <div class="section">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th class="text-right">Qty</th>
                  <th class="text-right">Unit Price</th>
                  <th class="text-right">Discount</th>
                  <th class="text-right">Tax</th>
                  <th class="text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items.map((item) => `
                  <tr>
                    <td>${item.productName}</td>
                    <td class="text-right">${item.quantity}</td>
                    <td class="text-right">KES ${currency.format(item.unitPrice)}</td>
                    <td class="text-right">KES ${currency.format(item.discount)}</td>
                    <td class="text-right">KES ${currency.format(item.tax)}</td>
                    <td class="text-right">KES ${currency.format(item.lineTotal)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="summary">
            <div class="summary-row"><span>Subtotal</span><strong>KES ${currency.format(invoice.subtotal)}</strong></div>
            <div class="summary-row"><span>Discount</span><strong>KES ${currency.format(invoice.discountTotal)}</strong></div>
            <div class="summary-row"><span>Tax</span><strong>KES ${currency.format(invoice.taxTotal)}</strong></div>
            <div class="summary-row"><span>Total</span><strong>KES ${currency.format(invoice.grandTotal)}</strong></div>
          </div>

          <div class="notes">
            <p><strong>Notes</strong></p>
            <p>${invoice.notes || 'No additional notes.'}</p>
          </div>
    `;
    openLetterheadPrintWindow(`Print Invoice ${invoice.invoiceNumber}`, body, styles);
  }

  function submit(values: InvoiceFormValues) {
    saveInvoice.mutate(values);
  }

  const isLoading = invoicesQuery.isLoading || customersQuery.isLoading || productsQuery.isLoading;
  const hasError = invoicesQuery.error || customersQuery.error || productsQuery.error;
  const errorMessage = (invoicesQuery.error as Error)?.message ?? (customersQuery.error as Error)?.message ?? (productsQuery.error as Error)?.message;

  return (
    <>
      <DataTable
        title="Invoice Management"
        subtitle={isLoading ? 'Loading invoices from the API...' : 'Create, edit, and validate customer invoices.'}
        columns={columns}
        rows={rows}
        actions={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />Generate Invoice</Button>}
      />

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Invoice' : 'Generate Invoice'}
        description="Invoice number stays editable before finalization, and branch options follow the selected customer."
        onClose={() => {
          setModalOpen(false);
          setEditingId(null);
        }}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(submit)} disabled={isSubmitting || saveInvoice.isPending || invoiceDetailsQuery.isLoading || nextInvoiceNumberQuery.isLoading}>
              {editingId ? 'Save Draft' : 'Create Draft'}
            </Button>
          </>
        }
      >
        {saveInvoice.error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{(saveInvoice.error as Error).message}</div> : null}
        <form className="space-y-8" onSubmit={handleSubmit(submit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Invoice Number" required error={errors.invoiceNumber?.message}>
              <Input {...form.register('invoiceNumber')} />
            </Field>
            <Field label="LPO Number" error={errors.lpoNumber?.message}>
              <Input {...form.register('lpoNumber')} />
            </Field>
            <Field label="Invoice Date" required error={errors.invoiceDate?.message}>
              <Input {...form.register('invoiceDate')} type="date" />
            </Field>
            <Field label="Due Date" required error={errors.dueDate?.message}>
              <Input {...form.register('dueDate')} type="date" />
            </Field>
            <Field label="Parent Group" required error={errors.parentGroupId?.message}>
              <Select {...form.register('parentGroupId')}>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>{customer.companyName}</option>
                ))}
              </Select>
            </Field>
            <Field label="Branch" required error={errors.branchId?.message}>
              <Select {...form.register('branchId')}>
                {branchOptions.map((branch) => (
                  <option key={branch.id} value={branch.id}>{branch.branchName}</option>
                ))}
              </Select>
            </Field>
            <Field label="Salesperson" required error={errors.salesperson?.message}>
              <Input {...form.register('salesperson')} />
            </Field>
            <Field label="Payment Terms" required error={errors.paymentTerms?.message}>
              <Input {...form.register('paymentTerms')} />
            </Field>
            <Field label="Notes" error={errors.notes?.message} className="md:col-span-2">
              <Textarea {...form.register('notes')} placeholder="Deliver in the morning." />
            </Field>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-slate-950 dark:text-white">Invoice Items</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Pick a product and the price will seed automatically.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ id: undefined, productId: '', productName: '', quantity: '1', unitPrice: '0', discount: '0', tax: '0' })}
              >
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
                    <Field label="Product" required error={errors.items?.[index]?.productId?.message}>
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
                        {products.map((product) => (
                          <option key={product.id} value={product.id}>{product.productName}</option>
                        ))}
                      </Select>
                    </Field>
                    <Field label="Quantity" required error={errors.items?.[index]?.quantity?.message}>
                      <Input {...form.register(`items.${index}.quantity` as const)} inputMode="decimal" />
                    </Field>
                    <Field label="Unit Price" required error={errors.items?.[index]?.unitPrice?.message}>
                      <Input {...form.register(`items.${index}.unitPrice` as const)} inputMode="decimal" />
                    </Field>
                    <Field label="Discount" required error={errors.items?.[index]?.discount?.message}>
                      <Input {...form.register(`items.${index}.discount` as const)} inputMode="decimal" />
                    </Field>
                    <Field label="Tax" required error={errors.items?.[index]?.tax?.message}>
                      <Input {...form.register(`items.${index}.tax` as const)} inputMode="decimal" />
                    </Field>
                    <Field label="Line Total">
                      <Input readOnly value={`KES ${currency.format(computeLineTotal(watchedItems[index] ?? { quantity: '0', unitPrice: '0', discount: '0', tax: '0' }))}`} />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-slate-200/70 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/5 md:grid-cols-4">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Subtotal</div>
              <div className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">KES {currency.format(totals.subtotal)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Discount</div>
              <div className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">KES {currency.format(totals.discountTotal)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Tax</div>
              <div className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">KES {currency.format(totals.taxTotal)}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Grand Total</div>
              <div className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">KES {currency.format(totals.grandTotal)}</div>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
