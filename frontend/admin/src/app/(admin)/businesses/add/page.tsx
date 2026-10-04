"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createTenant } from '@/lib/api';
import { BusinessForm, BusinessFormValues, emptyBusiness } from '@/components/admin/BusinessForm';
import { PageHeader, errorText } from '@/components/admin/ui';

const orNull = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

export default function AddBusinessPage() {
  const router = useRouter();
  const [initial] = useState(emptyBusiness);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(v: BusinessFormValues) {
    setBusy(true);
    setError('');
    try {
      const made = await createTenant({
        name: v.name.trim(), vertical: v.vertical, business_type: v.business_type, country: orNull(v.country), website: orNull(v.website),
        business_email: orNull(v.business_email), business_phone: orNull(v.business_phone), city: orNull(v.city), address: orNull(v.address),
        postal_code: orNull(v.postal_code), timezone: v.timezone, currency: v.currency, working_hours: v.working_hours,
        plan: v.plan || null, status: v.status, owner: { name: v.owner_name.trim(), email: v.owner_email.trim(), password: v.owner_password },
      });
      router.push(`/businesses/${made.id}`);
    } catch (e) {
      setError(errorText(e, 'Could not create the business'));
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <PageHeader title="Add business" subtitle="Set a business up on its behalf: details, opening hours, plan and the owner's login." />
      <BusinessForm mode="create" initial={initial} busy={busy} error={error} submitLabel="Create business" onSubmit={submit} onCancel={() => router.push('/businesses')} />
    </div>
  );
}
