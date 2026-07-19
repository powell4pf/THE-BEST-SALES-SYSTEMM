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
import type { CompanyProfileDto } from '../lib/apiTypes';

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
    email: profile.email,
    phone: profile.phone,
    address: profile.address,
    country: profile.country,
    currencyCode: profile.currencyCode
  };
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState('profile');
  const queryClient = useQueryClient();

  const profileQuery = useQuery({
    queryKey: ['companyProfile'],
    queryFn: () => api.getCompanyProfile()
  });

  const form = useForm<CompanyProfileFormValues>({
    resolver: zodResolver(companyProfileSchema)
  });

  const { handleSubmit, reset, formState: { errors, isSubmitting, isDirty } } = form;

  useEffect(() => {
    if (profileQuery.data) {
      reset(toFormValues(profileQuery.data));
    }
  }, [profileQuery.data, reset]);

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

  return (
    <div className="grid gap-6 xl:grid-cols-[0.5fr_1.5fr]">
      <Card className="p-2">
        <nav className="flex flex-col gap-1">
          <Button variant={activeTab === 'profile' ? 'secondary' : 'ghost'} className="justify-start" onClick={() => setActiveTab('profile')}>Company Profile</Button>
          <Button variant="ghost" className="justify-start" disabled>Invoice Numbering</Button>
          <Button variant="ghost" className="justify-start" disabled>System</Button>
          <Button variant="ghost" className="justify-start" disabled>Users & Roles</Button>
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
              <Button type="submit" disabled={isSubmitting || updateProfile.isPending || !isDirty}>
                {isSubmitting || updateProfile.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
