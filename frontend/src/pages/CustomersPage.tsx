import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Plus, Pencil, Trash2, Printer } from 'lucide-react';
import { DataTable } from '../components/DataTable';
import { Field, Modal } from '../components/Modal';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import type { BranchRow, CustomerRow, TableColumn } from '../lib/types';
import { customerSchema, type CustomerFormValues } from '../lib/schemas';
import { api } from '../lib/api';
import type { CreateParentGroupRequest, ParentGroupDetailsDto } from '../lib/apiTypes';

const currency = new Intl.NumberFormat('en-KE', { maximumFractionDigits: 0 });

const branchTemplate = (): BranchRow => ({
  id: crypto.randomUUID(),
  branchName: '',
  address: '',
  contactPerson: '',
  email: '',
  phone: ''
});

const customerTemplate = (): CustomerFormValues => ({
  id: undefined,
  companyName: '',
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  kraPin: '',
  creditLimit: '0',
  status: 'Active',
  branches: [branchTemplate()]
});

function toCustomerFormValues(account: ParentGroupDetailsDto): CustomerFormValues {
  return {
    id: account.id,
    companyName: account.companyName,
    contactPerson: account.contactPerson ?? '',
    email: account.email ?? '',
    phone: account.phone ?? '',
    address: account.address ?? '',
    kraPin: account.kraPin ?? '',
    creditLimit: String(account.creditLimit),
    status: account.status === 'Inactive' ? 'Inactive' : 'Active',
    branches: account.branches.map((branch) => ({
      id: branch.id,
      branchName: branch.branchName,
      address: branch.address ?? '',
      contactPerson: branch.contactPerson ?? '',
      email: branch.email ?? '',
      phone: branch.phone ?? ''
    }))
  };
}

function toRequest(values: CustomerFormValues): CreateParentGroupRequest {
  return {
    companyName: values.companyName.trim(),
    contactPerson: values.contactPerson.trim(),
    email: values.email.trim(),
    phone: values.phone.trim(),
    address: values.address.trim(),
    kraPin: values.kraPin.trim(),
    creditLimit: Number(values.creditLimit),
    branches: values.branches.map((branch) => ({
      id: branch.id,
      branchName: branch.branchName.trim(),
      address: branch.address.trim(),
      contactPerson: branch.contactPerson.trim(),
      email: branch.email.trim(),
      phone: branch.phone.trim()
    }))
  };
}

export function CustomersPage() {
  const queryClient = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const customersQuery = useQuery({
    queryKey: ['customers'],
    queryFn: () => api.listCustomers()
  });

  const customerDetailsQuery = useQuery({
    queryKey: ['customer', editingId],
    queryFn: () => api.getCustomer(editingId as string),
    enabled: modalOpen && Boolean(editingId)
  });

  const form = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    defaultValues: customerTemplate()
  });

  const { control, handleSubmit, reset, formState: { errors, isSubmitting } } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'branches' });

  const saveCustomer = useMutation({
    mutationFn: async (values: CustomerFormValues) => {
      const request = toRequest(values);
      if (editingId) {
        await api.updateCustomer(editingId, request);
        return editingId;
      }

      return api.createCustomer(request);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['customers'] });
      if (editingId) {
        await queryClient.invalidateQueries({ queryKey: ['customer', editingId] });
      }
      setModalOpen(false);
      setEditingId(null);
      reset(customerTemplate());
    }
  });

  const deleteCustomer = useMutation({
    mutationFn: (id: string) => api.deleteCustomer(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['customers'] })
  });

  useEffect(() => {
    if (!modalOpen) return;
    if (!editingId) {
      reset(customerTemplate());
      return;
    }

    if (customerDetailsQuery.data) {
      reset(toCustomerFormValues(customerDetailsQuery.data));
    }
  }, [customerDetailsQuery.data, editingId, modalOpen, reset]);

  const rows: CustomerRow[] = useMemo(
    () =>
      (customersQuery.data?.items ?? []).map((account) => ({
        id: account.id,
        name: account.companyName,
        contact: account.contactPerson ?? '',
        branches: account.branchCount,
        balance: `KES ${currency.format(account.creditLimit)}`,
        status: account.status
      })),
    [customersQuery.data]
  );

  const columns: TableColumn<CustomerRow>[] = [
    { key: 'name', label: 'Parent Group' },
    { key: 'contact', label: 'Contact Person' },
    { key: 'branches', label: 'Branches', align: 'center' },
    { key: 'balance', label: 'Credit Limit', align: 'right' },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <span className={row.status === 'Active' ? 'rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300' : 'rounded-full bg-rose-500/10 px-3 py-1 text-xs font-medium text-rose-700 dark:text-rose-300'}>
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
          <Button size="sm" variant="ghost" onClick={() => handleDelete(row.id)} disabled={deleteCustomer.isPending}>
            <Trash2 className="h-4 w-4" />
            Delete
          </Button>
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
    const account = customersQuery.data?.items.find((item) => item.id === id);
    if (!account) return;
    if (!window.confirm(`Delete ${account.companyName}? This will mark the customer as inactive.`)) return;
    deleteCustomer.mutate(id);
  }

  function submit(values: CustomerFormValues) {
    saveCustomer.mutate(values);
  }

  return (
    <>
      <DataTable
        title="Customer Management"
        subtitle={customersQuery.isLoading ? 'Loading customers from the API...' : 'Create parent groups, add branches, and track credit limits.'}
        columns={columns}
        rows={rows}
        emptyMessage={customersQuery.error ? (customersQuery.error as Error).message : 'No customers found.'}
        actions={
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const printWindow = window.open('', '_blank', 'width=900,height=700');
                if (!printWindow) return;
                const html = `
                  <html><head><title>Print Customers</title>
                  <style>body{font-family:Inter,sans-serif;padding:32px;color:#111827}h1{font-size:24px;font-weight:700;margin:0 0 24px}table{width:100%;border-collapse:collapse}th,td{padding:12px 10px;border:1px solid #e5e7eb;text-align:left}th{background:#f8fafc;font-size:12px;color:#374151}.text-right{text-align:right}.text-center{text-align:center}</style>
                  </head><body><h1>Customer List</h1>
                  <table><thead><tr><th>Parent Group</th><th>Contact Person</th><th class="text-center">Branches</th><th class="text-right">Credit Limit</th><th>Status</th></tr></thead>
                  <tbody>${rows
                    .map(
                      (row) => `
                    <tr><td>${row.name}</td><td>${row.contact}</td><td class="text-center">${row.branches}</td><td class="text-right">${row.balance.replace(/&nbsp;/g, ' ')}</td><td>${row.status}</td></tr>`
                    )
                    .join('')}</tbody>
                  </table></body></html>`;
                printWindow.document.open();
                printWindow.document.write(html);
                printWindow.document.close();
                printWindow.focus();
                printWindow.print();
              }}
            >
              <Printer className="h-4 w-4" />
              Print
            </Button>
            <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />Add Customer</Button>
          </div>
        }
      />

      <Modal
        open={modalOpen}
        title={editingId ? 'Edit Customer' : 'Add Customer'}
        description="Maintain the parent group profile and branch list in one place."
        onClose={() => {
          setModalOpen(false);
          setEditingId(null);
        }}
        footer={
          <>
            <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit(submit)} disabled={isSubmitting || saveCustomer.isPending || customerDetailsQuery.isLoading}>
              {editingId ? 'Save Changes' : 'Create Customer'}
            </Button>
          </>
        }
      >
        {saveCustomer.error ? <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/20 dark:bg-rose-500/10 dark:text-rose-200">{(saveCustomer.error as Error).message}</div> : null}
        <form className="space-y-8" onSubmit={handleSubmit(submit)}>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Company Name" required error={errors.companyName?.message}>
              <Input {...form.register('companyName')} placeholder="Nairobi Fresh Stores Ltd" />
            </Field>
            <Field label="Contact Person" required error={errors.contactPerson?.message}>
              <Input {...form.register('contactPerson')} placeholder="Mercy Wanjiku" />
            </Field>
            <Field label="Email" required error={errors.email?.message}>
              <Input {...form.register('email')} type="email" placeholder="contact@example.com" />
            </Field>
            <Field label="Phone" required error={errors.phone?.message}>
              <Input {...form.register('phone')} placeholder="+254700000000" />
            </Field>
            <Field label="KRA PIN" required error={errors.kraPin?.message}>
              <Input {...form.register('kraPin')} placeholder="P051234567Q" />
            </Field>
            <Field label="Credit Limit" required error={errors.creditLimit?.message}>
              <Input {...form.register('creditLimit')} inputMode="decimal" placeholder="1500000" />
            </Field>
            <Field label="Address" required error={errors.address?.message} className="md:col-span-2">
              <Input {...form.register('address')} placeholder="Enterprise Road, Nairobi" />
            </Field>
            <Field label="Status" required error={errors.status?.message}>
              <Select {...form.register('status')}>
                <option value="Active">Active</option>
                <option value="Credit Hold">Credit Hold</option>
                <option value="Inactive">Inactive</option>
              </Select>
            </Field>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h4 className="text-base font-semibold text-slate-950 dark:text-white">Branches</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400">Each branch belongs to this parent group.</p>
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => append(branchTemplate())}>
                <Plus className="h-4 w-4" />
                Add Branch
              </Button>
            </div>

            <div className="space-y-4">
              {fields.map((field, index) => (
                <div key={field.id} className="rounded-3xl border border-slate-200/70 bg-slate-50/70 p-4 dark:border-white/10 dark:bg-white/5">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div className="text-sm font-medium text-slate-700 dark:text-slate-200">Branch {index + 1}</div>
                    <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)} disabled={fields.length === 1}>
                      Remove
                    </Button>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <Field label="Branch Name" required error={errors.branches?.[index]?.branchName?.message}>
                      <Input {...form.register(`branches.${index}.branchName` as const)} placeholder="Enterprise HQ" />
                    </Field>
                    <Field label="Contact Person" required error={errors.branches?.[index]?.contactPerson?.message}>
                      <Input {...form.register(`branches.${index}.contactPerson` as const)} placeholder="John Kamau" />
                    </Field>
                    <Field label="Email" required error={errors.branches?.[index]?.email?.message}>
                      <Input {...form.register(`branches.${index}.email` as const)} type="email" placeholder="branch@example.com" />
                    </Field>
                    <Field label="Phone" required error={errors.branches?.[index]?.phone?.message}>
                      <Input {...form.register(`branches.${index}.phone` as const)} placeholder="+254700000000" />
                    </Field>
                    <Field label="Address" required error={errors.branches?.[index]?.address?.message} className="md:col-span-2">
                      <Input {...form.register(`branches.${index}.address` as const)} placeholder="Branch address" />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
            {errors.branches?.message ? <p className="text-xs text-rose-500">{errors.branches.message}</p> : null}
          </div>
        </form>
      </Modal>
    </>
  );
}
