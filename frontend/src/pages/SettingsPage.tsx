import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { Card } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Field } from '../components/Modal';
import { Input } from '../components/ui/input';
import { api } from '../lib/api';
import type { CompanyProfileDto, InvoiceNumberSettingsDto, SystemSettingDto, UserRoleDto } from '../lib/apiTypes';
import { useAuth } from '../context/AuthContext';

const companyProfileSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  email: z.string().email('Enter a valid email'),
  phone: z.string().min(1, 'Phone number is required'),
  address: z.string().min(1, 'Address is required'),
  country: z.string().min(1, 'Country is required'),
  currencyCode: z.string().min(3, 'Currency code must be 3 characters').max(3, 'Currency code must be 3 characters')
});

type CompanyProfileFormValues = z.infer<typeof companyProfileSchema>;

function toFormValues(profile: CompanyProfileDto): CompanyProfileFormValues {
  return {
    companyName: profile.companyName,
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    address: profile.address ?? '',
    country: profile.country ?? '',
    currencyCode: profile.currencyCode
  };
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const [invoiceSettings, setInvoiceSettings] = useState<InvoiceNumberSettingsDto | null>(null);
  const [roleMessage, setRoleMessage] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const auth = useAuth();
  const isSuperAdministrator = auth.user?.roles.includes('Super Administrator') ?? false;
  const roleOptions = ['Viewer', 'Tester', 'Sales', 'Accounts', 'Warehouse', 'Administrator', 'CEO', 'Super Administrator'];

  const profileQuery = useQuery({
    queryKey: ['companyProfile'],
    queryFn: () => api.getCompanyProfile()
  });
  const invoiceSettingsQuery = useQuery({ queryKey: ['invoiceNumberSettings'], queryFn: api.getInvoiceNumberSettings, enabled: activeTab === 'numbering' });
  const systemSettingsQuery = useQuery<SystemSettingDto[]>({ queryKey: ['systemSettings'], queryFn: api.getSystemSettings, enabled: activeTab === 'system' });
  const usersQuery = useQuery<UserRoleDto[]>({ queryKey: ['users'], queryFn: api.listUsers, enabled: activeTab === 'users' });

  const form = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileSchema)
  });

  const { handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = form;

  useEffect(() => {
    if (profileQuery.data) {
      reset(toFormValues(profileQuery.data));
    }
  }, [profileQuery.data, reset]);
  useEffect(() => { if (invoiceSettingsQuery.data) setInvoiceSettings(invoiceSettingsQuery.data); }, [invoiceSettingsQuery.data]);

  const updateProfile = useMutation({
    mutationFn: (values: CompanyProfileFormValues) => api.updateCompanyProfile(values),
    onSuccess: async (data) => {
      await queryClient.setQueryData(['companyProfile'], data);
      reset(toFormValues(data));
    }
  });

  const submitProfile = (values: CompanyProfileFormValues) => {
    updateProfile.mutate(values);
  };

  const saveInvoiceSettings = useMutation({ mutationFn: () => api.updateInvoiceNumberSettings(invoiceSettings as InvoiceNumberSettingsDto), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoiceNumberSettings'] }) });
  const updateUserRole = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) => api.updateUserRole(id, { role }),
    onSuccess: async () => {
      setRoleMessage('User role updated immediately.');
      await queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => setRoleMessage((error as Error).message || 'Unable to update that user role.')
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[0.5fr_1.5fr]">
      <Card className="p-2">
        <nav className="flex flex-col gap-1">
          <Button variant={activeTab === 'profile' ? 'secondary' : 'ghost'} className="justify-start" onClick={() => setActiveTab('profile')}>Company Profile</Button>
          <Button variant={activeTab === 'numbering' ? 'secondary' : 'ghost'} className="justify-start" onClick={() => setActiveTab('numbering')}>Invoice Numbering</Button>
          <Button variant={activeTab === 'system' ? 'secondary' : 'ghost'} className="justify-start" onClick={() => setActiveTab('system')}>System</Button>
          <Button variant={activeTab === 'users' ? 'secondary' : 'ghost'} className="justify-start" onClick={() => setActiveTab('users')}>Users & Roles</Button>
        </nav>
      </Card>
      <Card>
        {activeTab === 'profile' && (
          <form onSubmit={handleSubmit(submitProfile)}>
            <div className="p-6">
              <h2 className="text-xl font-semibold text-slate-950 dark:text-white">Company Profile</h2>
              <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Update your company's details. This information appears on invoices and statements.</p>
            </div>
            <div className="space-y-6 p-6">
              {profileQuery.isLoading && <p className="text-sm text-slate-500">Loading profile...</p>}
              {profileQuery.error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{(profileQuery.error as Error).message}</div>}
              {updateProfile.error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{(updateProfile.error as Error).message}</div>}
              {profileQuery.data && (
                <div className="grid gap-4 md:grid-cols-2">
                  <Field label="Company Name" required error={errors.companyName?.message} className="md:col-span-2">
                    <Input {...form.register('companyName')} />
                  </Field>
                  <Field label="Email" required error={errors.email?.message}>
                    <Input {...form.register('email')} type="email" />
                  </Field>
                  <Field label="Phone" required error={errors.phone?.message}>
                    <Input {...form.register('phone')} />
                  </Field>
                  <Field label="Address" required error={errors.address?.message} className="md:col-span-2">
                    <Input {...form.register('address')} />
                  </Field>
                  <Field label="Country" required error={errors.country?.message}>
                    <Input {...form.register('country')} />
                  </Field>
                  <Field label="Currency Code" required error={errors.currencyCode?.message}>
                    <Input {...form.register('currencyCode')} />
                  </Field>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-4 rounded-b-3xl border-t border-slate-200/70 bg-slate-50/50 p-6 dark:border-white/10 dark:bg-white/5">
              {updateProfile.isSuccess && !isDirty && <p className="text-sm text-emerald-600">Changes saved successfully.</p>}
              <Button type="submit" disabled={isSubmitting || updateProfile.isPending || !isDirty || !profileQuery.data}>
                {isSubmitting || updateProfile.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
        {activeTab === 'numbering' && invoiceSettings && <div><div className="p-6"><h2 className="text-xl font-semibold">Invoice Numbering</h2><p className="mt-2 text-sm text-slate-500">Control invoice prefixes and numbering rules.</p></div><div className="grid gap-4 p-6 md:grid-cols-2"><Field label="Prefix"><Input value={invoiceSettings.prefix} onChange={e => setInvoiceSettings({ ...invoiceSettings, prefix: e.target.value })} /></Field><Field label="Starting Number"><Input type="number" value={invoiceSettings.startingNumber} onChange={e => setInvoiceSettings({ ...invoiceSettings, startingNumber: Number(e.target.value) })} /></Field><Field label="Padding"><Input type="number" value={invoiceSettings.padding} onChange={e => setInvoiceSettings({ ...invoiceSettings, padding: Number(e.target.value) })} /></Field><Field label="Reset Policy"><select className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3" value={invoiceSettings.resetPolicy} onChange={e => setInvoiceSettings({ ...invoiceSettings, resetPolicy: e.target.value })}><option>Never</option><option>Yearly</option><option>Monthly</option></select></Field></div><div className="flex justify-end border-t p-6"><Button onClick={() => saveInvoiceSettings.mutate()} disabled={saveInvoiceSettings.isPending}>{saveInvoiceSettings.isPending ? 'Saving...' : 'Save Changes'}</Button></div></div>}
        {activeTab === 'numbering' && invoiceSettingsQuery.isLoading && <p className="p-6 text-sm text-slate-500">Loading invoice settings...</p>}
        {activeTab === 'system' && <div className="p-6"><h2 className="text-xl font-semibold">System Settings</h2><div className="mt-6 space-y-3">{(systemSettingsQuery.data ?? []).map(setting => <div key={setting.key} className="rounded-2xl border p-4"><div className="font-medium">{setting.key}</div><div className="text-sm text-slate-500">{setting.value}</div><div className="mt-1 text-xs text-slate-400">{setting.description}</div></div>)}</div></div>}
        {activeTab === 'users' && <div className="p-6"><h2 className="text-xl font-semibold">Users & Roles</h2><p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Roles take effect immediately for new requests. Viewers and Testers can work with records but cannot delete them.</p>{roleMessage && <p className="mt-3 text-sm text-emerald-600">{roleMessage}</p>}<div className="mt-6 overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left"><th className="py-3">Name</th><th>Email</th><th>Role</th></tr></thead><tbody>{(usersQuery.data ?? []).map(user => <tr key={user.id} className="border-b"><td className="py-3">{user.displayName}</td><td>{user.email}</td><td>{isSuperAdministrator ? <select className="h-9 rounded-xl border border-slate-200 bg-white px-2 text-sm dark:border-white/10 dark:bg-slate-900" value={user.roles[0] ?? 'Viewer'} onChange={event => { setRoleMessage(null); updateUserRole.mutate({ id: user.id, role: event.target.value }); }} disabled={updateUserRole.isPending}><option value="">Select role</option>{roleOptions.map(role => <option key={role} value={role}>{role}</option>)}</select> : user.roles.join(', ')}</td></tr>)}</tbody></table>{usersQuery.error && <p className="mt-4 text-sm text-rose-600">{(usersQuery.error as Error).message}</p>}</div></div>}
      </Card>
    </div>
  );
}
