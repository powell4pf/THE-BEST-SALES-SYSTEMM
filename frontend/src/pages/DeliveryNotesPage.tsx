import { useEffect, useMemo, useState } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Pencil, Plus, Printer, Trash2 } from 'lucide-react';
import { z } from 'zod';
import { DataTable } from '../components/DataTable';
import { Button } from '../components/ui/button';
import { Field, Modal } from '../components/Modal';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Textarea } from '../components/ui/textarea';
import { useToast } from '../components/ToastProvider';
import { api } from '../lib/api';
import type { CreateDeliveryNoteRequest, DeliveryNoteListItemDto, ParentGroupSummaryDto, ProductSummaryDto } from '../lib/apiTypes';
import type { TableColumn } from '../lib/types';
import { openLetterheadPrintWindow } from '../lib/print';
import { hasFullAdministrativeAccess, useAuth } from '../context/AuthContext';

const itemSchema = z.object({ productId: z.string().min(1, 'Choose a product'), quantity: z.string().min(1, 'Quantity is required') });
const deliveryNoteSchema = z.object({ deliveryNoteNumber: z.string().min(1, 'Delivery note number is required'), deliveryDate: z.string().min(1, 'Delivery date is required'), customerId: z.string().min(1, 'Choose a customer'), branchId: z.string().optional(), notes: z.string().optional(), items: z.array(itemSchema).min(1, 'Add at least one product') });
type FormValues = z.infer<typeof deliveryNoteSchema>;
const today = () => new Date().toISOString().slice(0, 10);
const escapePrintHtml = (value: string) => value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);

function emptyValues(number: string, customers: ParentGroupSummaryDto[], products: ProductSummaryDto[]): FormValues {
  return { deliveryNoteNumber: number, deliveryDate: today(), customerId: customers[0]?.id ?? '', branchId: '', notes: '', items: [{ productId: products[0]?.id ?? '', quantity: '1' }] };
}

function toRequest(values: FormValues): CreateDeliveryNoteRequest {
  return { deliveryNoteNumber: values.deliveryNoteNumber, deliveryDate: values.deliveryDate, customerId: values.customerId, branchId: values.branchId || null, notes: values.notes || null, items: values.items.map((item) => ({ productId: item.productId, quantity: Number(item.quantity) })) };
}

export function DeliveryNotesPage() {
  const auth = useAuth();
  const canDelete = hasFullAdministrativeAccess(auth.user?.roles ?? []);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const deliveryNotesQuery = useQuery({ queryKey: ['deliveryNotes'], queryFn: () => api.listDeliveryNotes() });
  const customersQuery = useQuery({ queryKey: ['customers'], queryFn: () => api.listCustomers() });
  const productsQuery = useQuery({ queryKey: ['products'], queryFn: () => api.listProducts() });
  const detailsQuery = useQuery({ queryKey: ['deliveryNote', editingId], queryFn: () => api.getDeliveryNote(editingId as string), enabled: modalOpen && Boolean(editingId) });
  const nextNumberQuery = useQuery({ queryKey: ['nextDeliveryNoteNumber'], queryFn: () => api.getNextDeliveryNoteNumber(), enabled: modalOpen && !editingId });
  const form = useForm<FormValues>({ resolver: zodResolver(deliveryNoteSchema), defaultValues: emptyValues('', [], []) });
  const selectedCustomerId = useWatch({ control: form.control, name: 'customerId' });
  const customerDetailsQuery = useQuery({ queryKey: ['customer', selectedCustomerId], queryFn: () => api.getCustomer(selectedCustomerId), enabled: modalOpen && Boolean(selectedCustomerId) });
  const { fields, append, remove, replace } = useFieldArray({ control: form.control, name: 'items' });
  const watchedItems = useWatch({ control: form.control, name: 'items' });
  const customers = customersQuery.data?.items ?? [];
  const products = productsQuery.data?.items ?? [];
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId);
  const branches = customerDetailsQuery.data?.branches ?? selectedCustomer?.branches ?? [];

  useEffect(() => { if (modalOpen && !editingId && nextNumberQuery.data) form.reset(emptyValues(nextNumberQuery.data.nextNumber, customers, products)); }, [customers, editingId, form, modalOpen, nextNumberQuery.data, products]);
  useEffect(() => { if (modalOpen && editingId && detailsQuery.data) { const note = detailsQuery.data; form.reset({ deliveryNoteNumber: note.deliveryNoteNumber, deliveryDate: note.deliveryDate, customerId: note.customerId, branchId: note.branchId ?? '', notes: note.notes ?? '', items: note.items.map((item) => ({ productId: item.productId ?? '', quantity: String(item.quantity) })) }); } }, [detailsQuery.data, editingId, form, modalOpen]);

  const save = useMutation({ mutationFn: async (values: FormValues) => { if (editingId) { await api.updateDeliveryNote(editingId, toRequest(values)); return null; } return api.createDeliveryNote(toRequest(values)); }, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['deliveryNotes'] }); toast({ tone: 'success', title: editingId ? 'Delivery note updated' : 'Delivery note created' }); setModalOpen(false); setEditingId(null); }, onError: (error) => toast({ tone: 'error', title: 'Could not save delivery note', message: error instanceof Error ? error.message : 'Please try again.' }) });
  const removeNote = useMutation({ mutationFn: (id: string) => api.deleteDeliveryNote(id), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['deliveryNotes'] }); toast({ tone: 'success', title: 'Delivery note deleted' }); }, onError: (error) => toast({ tone: 'error', title: 'Could not delete delivery note', message: error instanceof Error ? error.message : 'Please try again.' }) });

  function openCreate() { setEditingId(null); setModalOpen(true); }
  function openEdit(id: string) { setEditingId(id); setModalOpen(true); }
  function submit(values: FormValues) { save.mutate(values); }
  async function handlePrint(id: string) {
    try {
      const note = await api.getDeliveryNote(id);
      const customer = customers.find((item) => item.id === note.customerId);
      const rows = note.items.map((item) => `<tr><td>${escapePrintHtml(item.productName)}</td><td class="amount">${item.quantity}</td></tr>`).join('');
      const branch = customer?.branches.find((item) => item.id === note.branchId);
      const body = `<div class="document-heading"><p class="customer">${escapePrintHtml(customer?.companyName ?? 'Customer')}</p>${branch ? `<p><strong>BRANCH:</strong> ${escapePrintHtml(branch.branchName)}${branch.address ? ` · ${escapePrintHtml(branch.address)}` : ''}</p>` : ''}<p><strong>DATE:</strong> ${escapePrintHtml(note.deliveryDate)}</p><h1>DELIVERY NOTE</h1><p><strong>DELIVERY NOTE NO:</strong> ${escapePrintHtml(note.deliveryNoteNumber)}</p></div><table class="delivery-table"><thead><tr><th>PRODUCT</th><th class="amount">QUANTITY</th></tr></thead><tbody>${rows || '<tr><td colspan="2">No products recorded.</td></tr>'}</tbody></table>${note.notes ? `<div class="notes"><strong>NOTES:</strong> ${escapePrintHtml(note.notes)}</div>` : ''}<div class="signature"><div>Prepared by: ____________________</div><div>Received by: ____________________</div></div>`;
      openLetterheadPrintWindow(`Delivery Note ${note.deliveryNoteNumber}`, body, '.document-heading{font-size:13px;line-height:1.4}.document-heading p{margin:0 0 8px}.document-heading .customer{font-size:15px;font-weight:700;margin-bottom:16px}.document-heading h1{font-size:18px;margin:24px 0 12px}.delivery-table{width:100%;border-collapse:collapse;font-size:12px;margin-top:18px}.delivery-table th,.delivery-table td{padding:9px 7px;border-bottom:1px solid #111;text-align:left}.delivery-table th{border-top:1px solid #111;font-size:11px;letter-spacing:.06em}.delivery-table .amount{text-align:right}.notes{margin-top:24px;font-size:12px}.signature{display:flex;justify-content:space-between;gap:24px;margin-top:70px;font-size:12px}');
    } catch (error) { toast({ tone: 'error', title: 'Could not print delivery note', message: error instanceof Error ? error.message : 'Please try again.' }); }
  }
  const rows = deliveryNotesQuery.data?.items ?? [];
  const columns = useMemo<TableColumn<DeliveryNoteListItemDto>[]>(() => [
    { key: 'deliveryNoteNumber', label: 'Delivery note', render: (row) => <span className="font-semibold text-slate-900 dark:text-white">{row.deliveryNoteNumber}</span> },
    { key: 'customerName', label: 'Customer', render: (row) => row.customerName },
    { key: 'deliveryDate', label: 'Date', render: (row) => new Date(`${row.deliveryDate}T00:00:00Z`).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) },
    { key: 'productCount', label: 'Products', align: 'right' },
    { key: 'totalQuantity', label: 'Quantity', align: 'right' },
    { key: 'status', label: 'Status', render: (row) => <span className="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-medium text-sky-700 dark:text-sky-300">{row.status}</span> },
    { key: 'id', label: 'Actions', align: 'right', render: (row) => <div className="flex justify-end gap-1"><Button size="sm" variant="ghost" onClick={() => handlePrint(row.id)} aria-label={`Print ${row.deliveryNoteNumber}`}><Printer className="h-4 w-4" /></Button><Button size="sm" variant="ghost" onClick={() => openEdit(row.id)} aria-label={`Edit ${row.deliveryNoteNumber}`}><Pencil className="h-4 w-4" /></Button>{canDelete ? <Button size="sm" variant="ghost" onClick={() => { if (window.confirm(`Delete ${row.deliveryNoteNumber}?`)) removeNote.mutate(row.id); }} aria-label={`Delete ${row.deliveryNoteNumber}`}><Trash2 className="h-4 w-4" /></Button> : null}</div> }
  ], [customers, removeNote]);
  const customerRegistration = form.register('customerId');

  return <>
    <DataTable title="Delivery Notes" subtitle={deliveryNotesQuery.isLoading ? 'Loading delivery notes from the API...' : 'Prepare and track products delivered to customers.'} columns={columns} rows={rows} isLoading={deliveryNotesQuery.isLoading} emptyMessage="Create a delivery note when products are ready to leave your store." actions={<Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />Create Delivery Note</Button>} />
    <Modal open={modalOpen} title={editingId ? 'Edit Delivery Note' : 'Create Delivery Note'} description="Choose the customer, branch, and products being delivered." onClose={() => { setModalOpen(false); setEditingId(null); }} footer={<><Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={form.handleSubmit(submit)} disabled={save.isPending || detailsQuery.isLoading || customersQuery.isLoading || productsQuery.isLoading}>{save.isPending ? 'Saving...' : editingId ? 'Save Changes' : 'Create Delivery Note'}</Button></>}>
      {detailsQuery.isLoading ? <div className="py-10 text-center text-sm text-slate-500">Loading delivery note...</div> : <form className="space-y-5" onSubmit={form.handleSubmit(submit)}>
        <div className="grid gap-4 md:grid-cols-2"><Field label="Delivery note number" required error={form.formState.errors.deliveryNoteNumber?.message}><Input {...form.register('deliveryNoteNumber')} /></Field><Field label="Delivery date" required error={form.formState.errors.deliveryDate?.message}><Input type="date" {...form.register('deliveryDate')} /></Field></div>
        <div className="grid gap-4 md:grid-cols-2"><Field label="Customer" required error={form.formState.errors.customerId?.message}><Select {...customerRegistration} onChange={(event) => { customerRegistration.onChange(event); form.setValue('branchId', ''); }}><option value="">Select customer</option>{customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.companyName}</option>)}</Select></Field><Field label="Branch / delivery location" error={form.formState.errors.branchId?.message}><Select {...form.register('branchId')} disabled={!selectedCustomer || customerDetailsQuery.isLoading || branches.length === 0}><option value="">{!selectedCustomer ? 'Select a customer first' : customerDetailsQuery.isLoading ? 'Loading branches...' : branches.length ? 'Select branch (optional)' : 'No branches recorded for this customer'}</option>{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branchName}{branch.address ? ` · ${branch.address}` : ''}</option>)}</Select></Field></div>
        <div className="space-y-3"><div className="flex items-center justify-between"><div><h4 className="font-semibold text-slate-900 dark:text-white">Products to deliver</h4><p className="text-sm text-slate-500 dark:text-slate-400">Add every product and quantity included in this delivery.</p></div><Button type="button" size="sm" variant="outline" onClick={() => append({ productId: '', quantity: '1' })}><Plus className="h-4 w-4" />Add product</Button></div>{fields.map((field, index) => <div key={field.id} className="grid gap-3 rounded-2xl border border-slate-200/70 p-3 dark:border-white/10 sm:grid-cols-[1fr_9rem_auto]"><Field label={`Product ${index + 1}`} required error={form.formState.errors.items?.[index]?.productId?.message}><Select {...form.register(`items.${index}.productId`)}><option value="">Select product</option>{products.map((product) => <option key={product.id} value={product.id}>{product.productName} · {product.sku}</option>)}</Select></Field><Field label="Quantity" required error={form.formState.errors.items?.[index]?.quantity?.message}><Input type="number" min="0.001" step="0.001" {...form.register(`items.${index}.quantity`)} /></Field><Button type="button" variant="ghost" className="mt-7" onClick={() => remove(index)} disabled={fields.length === 1} aria-label={`Remove product ${index + 1}`}><Trash2 className="h-4 w-4" /></Button></div>)}</div>
        <Field label="Notes"><Textarea {...form.register('notes')} placeholder="Optional delivery instructions or remarks" /></Field>
        {watchedItems?.length ? <p className="text-xs text-slate-500 dark:text-slate-400">{watchedItems.length} product line{watchedItems.length === 1 ? '' : 's'} included.</p> : null}
      </form>}
    </Modal>
  </>;
}
