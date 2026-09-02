import { useEffect, useMemo, useRef, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Download, Mail, MessageCircle, Pencil, Plus, Printer, Share2, Trash2 } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { Field, Modal } from '../components/Modal';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import type { InvoiceFormValues } from '../lib/schemas';
import { invoiceSchema } from '../lib/schemas';
import type { TableColumn } from '../lib/types';
import { api } from '../lib/api';
import type { CreateInvoiceRequest, InvoiceDetailsDto, InvoiceDto, InvoiceItem, ParentGroupSummaryDto, ProductSummaryDto, PagedResult } from '../lib/apiTypes';
import { openLetterheadPrintWindow } from '../lib/print';
import { downloadInvoicePdf, shareInvoiceByEmail, shareInvoiceByWhatsApp, type InvoicePdfData } from '../lib/invoiceShare';

const currency = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });
const defaultInvoiceNote = 'Thank you for doing business with us.';

function today() {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(new Date());
  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? '';
  return `${value('year')}-${value('month')}-${value('day')}`;
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
    })),
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
    dueDate: addDays(today(), 90),
    notes: defaultInvoiceNote,
    items: [
      {
        id: undefined,
        productId: products[0]?.id ?? '',
        productName: products[0]?.productName ?? '',
        quantity: '1',
        unitPrice: String(products[0]?.sellingPrice ?? 0),
      }
    ]
  };
}

function computeLineTotal(item: { quantity: string; unitPrice: string }) {
  const quantity = Number(item.quantity || 0);
  const unitPrice = Number(item.unitPrice || 0);
  return Math.max(quantity * unitPrice, 0);
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
    notes: values.notes.trim() || defaultInvoiceNote,
    items: values.items.map((item) => ({
      productId: item.productId,
      itemName: item.productName.trim() || 'Invoice item',
      quantity: Number(item.quantity),
      unitPrice: Number(item.unitPrice),
    })),
  };
}

export function InvoicesPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [submissionMessage, setSubmissionMessage] = useState<string | null>(null);
  const [shareMessage, setShareMessage] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

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

  type InvoiceTableRow = InvoiceDto & { total: string };
  const rows: InvoiceTableRow[] = useMemo(
    () => (invoicesQuery.data?.items ?? []).map((invoice) => ({
      ...invoice,
      total: `KES ${currency.format(invoice.grandTotal)}`
    })),
    [invoicesQuery.data, currency]
  );

  const columns: TableColumn<InvoiceTableRow>[] = [
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
          {row.status === 'Draft' && (
            <Button size="sm" variant="outline" onClick={() => finalizeInvoice.mutate(row.id)} disabled={finalizeInvoice.isPending}>
              <CheckCircle2 className="h-4 w-4" />
              Finalize
            </Button>
          )}
          {row.status === 'Draft' ? (
            <Button size="sm" variant="outline" onClick={() => openEdit(row.id)}>
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => handlePrint(row.id)}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDownloadPdf(row.id)} aria-label={`Download ${row.invoiceNumber} as PDF`}>
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleWhatsAppShare(row.id)} aria-label={`Share ${row.invoiceNumber} by WhatsApp`}>
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleEmailShare(row.id)} aria-label={`Share ${row.invoiceNumber} by email`}>
            <Mail className="h-4 w-4" />
            Email
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
    mutationFn: async ({ values, finalize }: { values: InvoiceFormValues; finalize: boolean }) => {
      const request = toRequest(values);
      if (editingId) {
        await api.updateInvoice(editingId, request);
        return editingId;
      }
      const invoiceId = await api.createInvoice(request);
      if (finalize) await api.finalizeInvoice(invoiceId);
      return invoiceId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      if (editingId) {
        await queryClient.invalidateQueries({ queryKey: ['invoice', editingId] });
      }
      await queryClient.invalidateQueries({ queryKey: ['nextInvoiceNumber'] });
      setModalOpen(false);
      setEditingId(null);
      setSubmissionMessage(null);
      reset(emptyValues('', customers, products));
    },
    onError: (error) => setSubmissionMessage((error as Error).message || 'The invoice could not be saved. Please try again.')
  });

  const finalizeInvoice = useMutation({
    mutationFn: (id: string) => api.finalizeInvoice(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['invoices'] });
      await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  const deleteInvoice = useMutation({
    mutationFn: (id: string) => api.deleteInvoice(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['invoices'] });
      const previous = queryClient.getQueryData<PagedResult<InvoiceDto>>(['invoices']);
      if (previous) {
        queryClient.setQueryData<PagedResult<InvoiceDto>>(['invoices'], {
          ...previous,
          items: previous.items.filter((invoice) => invoice.id !== id),
          totalCount: Math.max(0, previous.totalCount - 1)
        });
      }
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(['invoices'], context.previous);
    },
    onSettled: async () => { await queryClient.invalidateQueries({ queryKey: ['invoices'] }); await queryClient.invalidateQueries({ queryKey: ['dashboard'] }); }
  });

  const totals = useMemo(() => {
    const subtotal = watchedItems.reduce((sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0), 0);
    return { subtotal, grandTotal: watchedItems.reduce((sum, item) => sum + computeLineTotal(item), 0) };
  }, [watchedItems]);

  function openCreate() {
    setEditingId(null);
    setSubmissionMessage(null);
    setModalOpen(true);
  }

  function openEdit(id: string) {
    setEditingId(id);
    setSubmissionMessage(null);
    setModalOpen(true);
  }

  function handleDelete(id: string) {
    const invoice = invoicesQuery.data?.items.find((item) => item.id === id);
    if (!invoice) return;
    if (!window.confirm(`Permanently delete invoice ${invoice.invoiceNumber}? Its invoice number will become available again. This cannot be undone.`)) return;
    deleteInvoice.mutate(id);
  }

  async function handlePrint(id: string) {
    const invoice = await queryClient.fetchQuery({ queryKey: ['invoice', id], queryFn: () => api.getInvoice(id) });

    const customer = findCustomer(invoice.parentGroupId);
    const branch = customer?.branches.find((item) => item.id === invoice.branchId);
    const invoiceTotal = invoice.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    const styles = `
            body { font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 0; padding: 0; color: #111827; background: #fff; }
            .invoice-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 32px; }
            .invoice-title { font-size: 28px; font-weight: 700; margin: 0; }
            .lpo-number { margin: 5px 0 0; font-size: 11px; font-weight: 700; color: #475569; }
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
            .product-name { font-weight: 700; color: #111827; }
            .details { padding: 12px; }
            .notes { margin-top: 16px; padding: 12px; }
          `;
    const body = `
          <div class="invoice-header">
            <div>
              <p class="label">Invoice</p>
              <h1 class="invoice-title">${invoice.invoiceNumber}</h1>
              <p class="lpo-number">LPO No: ${invoice.lpoNumber || 'Not provided'}</p>
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
                  <th style="text-align: right; width: 15%;">Qty</th>
                  <th style="text-align: right; width: 20%;">Unit Price</th>
                  <th style="text-align: right; width: 20%;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${invoice.items.map((item) => `
                  <tr>
                    <td class="product-name">${item.itemName}</td>
                    <td style="text-align: right;">${item.quantity}</td>
                    <td style="text-align: right;">KES ${currency.format(item.unitPrice)}</td>
                    <td style="text-align: right;">KES ${currency.format(item.quantity * item.unitPrice)}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>

          <div class="summary">
            <div class="summary-row"><span>Total</span><strong>KES ${currency.format(invoiceTotal)}</strong></div>
          </div>

          <div class="notes">
            <p><strong>Notes</strong></p>
            <p>${invoice.notes || defaultInvoiceNote}</p>
          </div>
    `;
    openLetterheadPrintWindow(`Print Invoice ${invoice.invoiceNumber}`, body, styles);
  }

  async function getInvoicePdfData(id: string): Promise<InvoicePdfData> {
    const invoice = await queryClient.fetchQuery({ queryKey: ['invoice', id], queryFn: () => api.getInvoice(id) });
    const customer = findCustomer(invoice.parentGroupId);
    const branch = customer?.branches.find((item) => item.id === invoice.branchId);
    return { invoice, customer, branch };
  }

  function handleShareError(error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') return;
    setShareMessage(error instanceof Error ? `Unable to prepare the invoice PDF: ${error.message}` : 'Unable to prepare the invoice PDF. Please try again.');
  }

  async function handleDownloadPdf(id: string) {
    setShareMessage(null);
    try {
      await downloadInvoicePdf(await getInvoicePdfData(id));
      setShareMessage('Invoice PDF downloaded.');
    } catch (error) {
      handleShareError(error);
    }
  }

  async function handleWhatsAppShare(id: string) {
    setShareMessage(null);
    try {
      const result = await shareInvoiceByWhatsApp(await getInvoicePdfData(id));
      setShareMessage(result === 'shared' ? 'Choose WhatsApp in the share sheet to send the attached invoice PDF.' : 'Invoice PDF downloaded and a WhatsApp message is ready. Attach the downloaded PDF before sending.');
    } catch (error) {
      handleShareError(error);
    }
  }

  async function handleEmailShare(id: string) {
    setShareMessage(null);
    try {
      const result = await shareInvoiceByEmail(await getInvoicePdfData(id));
      setShareMessage(result === 'shared' ? 'Choose your email app in the share sheet to send the attached invoice PDF.' : 'Invoice PDF downloaded and an email is ready. Attach the downloaded PDF before sending.');
    } catch (error) {
      handleShareError(error);
    }
  }

  function submit(values: InvoiceFormValues, finalize = false) {
    setSubmissionMessage(null);
    saveInvoice.mutate({ values, finalize });
  }

  function showValidationErrors() {
    setSubmissionMessage('Please complete the required invoice details before finalizing this sale.');
    formRef.current?.parentElement?.scrollTo({ top: 0, behavior: 'smooth' });
  }

  const isLoading = invoicesQuery.isLoading || customersQuery.isLoading || productsQuery.isLoading;
  const hasError = invoicesQuery.error || customersQuery.error || productsQuery.error;
  const errorMessage = (invoicesQuery.error as Error)?.message ?? (customersQuery.error as Error)?.message ?? (productsQuery.error as Error)?.message;

  return (
    <>
      {shareMessage && (
        <div className="mx-auto mb-4 max-w-7xl rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/60 dark:bg-sky-950/40 dark:text-sky-100">
          <Share2 className="mr-2 inline h-4 w-4" />
          {shareMessage}
        </div>
      )}
      <DataTable
        title="Invoice Management"
        subtitle={isLoading ? 'Loading invoices from the API...' : 'Create, edit, and validate customer invoices.'}
        columns={columns}
        rows={rows}
        isLoading={isLoading}
        actions={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />Generate Invoice</Button>}
      />

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Invoice' : 'Generate Invoice'}
        description="Invoice number stays editable before finalization, and branch options follow the selected customer."
        onClose={() => {
          setModalOpen(false);
          setEditingId(null);
          setSubmissionMessage(null);
        }}
        footer={
          <>
            {submissionMessage ? <div role="alert" className="w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{submissionMessage}</div> : null}
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            {editingId ? (
              <Button onClick={handleSubmit((values) => submit(values), showValidationErrors)} disabled={isSubmitting || saveInvoice.isPending || invoiceDetailsQuery.isLoading || nextInvoiceNumberQuery.isLoading}>{saveInvoice.isPending ? 'Saving…' : 'Save Draft'}</Button>
            ) : (
              <>
                <Button variant="outline" onClick={handleSubmit((values) => submit(values), showValidationErrors)} disabled={isSubmitting || saveInvoice.isPending || nextInvoiceNumberQuery.isLoading}>Save Draft</Button>
                <Button onClick={handleSubmit((values) => submit(values, true), showValidationErrors)} disabled={isSubmitting || saveInvoice.isPending || nextInvoiceNumberQuery.isLoading}>{saveInvoice.isPending ? 'Finalizing sale…' : 'Create & Finalize Sale'}</Button>
              </>
            )}
          </>
        }
      >
        {saveInvoice.error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{(saveInvoice.error as Error).message}</div> : null}
        {Object.keys(errors).length > 0 ? <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">Please correct the highlighted invoice fields before creating the draft.</div> : null}
        <form ref={formRef} className="space-y-8" onSubmit={handleSubmit((values) => submit(values), showValidationErrors)}>
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
              <Textarea {...form.register('notes')} placeholder="Thank you for doing business with us." />
            </Field>
          </div>

          <div className="space-y-4">
            <div className="invoice-items-toolbar sticky top-0 z-20 flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/95 px-3 py-2 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-slate-950/95">
              <div>
                <h4 className="text-base font-semibold text-slate-950 dark:text-white">Invoice Items</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Pick a product and the price will seed automatically.</p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ id: undefined, productId: '', productName: '', quantity: '1', unitPrice: '0' })}
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
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
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
                    <Field label="Line Total">
                      <Input readOnly value={`KES ${currency.format(computeLineTotal(watchedItems[index] ?? { quantity: '0', unitPrice: '0' }))}`} />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid gap-4 rounded-3xl border border-slate-200/70 bg-slate-50/70 p-5 dark:border-white/10 dark:bg-white/5 md:grid-cols-2">
            <div>
              <div className="text-xs uppercase tracking-[0.25em] text-slate-400">Subtotal</div>
              <div className="mt-2 text-xl font-semibold text-slate-950 dark:text-white">KES {currency.format(totals.subtotal)}</div>
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
