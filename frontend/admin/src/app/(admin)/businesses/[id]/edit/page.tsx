"use client";

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BusinessDetails, changeBusinessPlan, fetchBusinessDetails, saveBusinessDetails } from '@/lib/api';
import { BusinessForm, BusinessFormValues, emptyBusiness } from '@/components/admin/BusinessForm';
import { ErrorBox, Loading, PageHeader, errorText } from '@/components/admin/ui';

const orNull = (s: string | null | undefined) => (s && s.trim() ? s.trim() : null);

const toValues = (b: BusinessDetails): BusinessFormValues => ({
  ...emptyBusiness(),
  name: b.name, vertical: b.vertical, business_type: b.business_type, business_subtype: b.business_subtype, country: b.country ?? '', website: b.website ?? '',
  business_email: b.business_email ?? '', business_phone: b.business_phone ?? '', city: b.city ?? '', address: b.address ?? '', postal_code: b.postal_code ?? '',
  timezone: b.timezone, currency: b.currency, working_hours: b.working_hours && Object.keys(b.working_hours).length ? b.working_hours : emptyBusiness().working_hours,
  plan: b.plan, status: b.status,
});

export default function EditBusinessPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const router = useRouter();
  const [business, setBusiness] = useState<BusinessDetails | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchBusinessDetails(id).then(setBusiness).catch((e: unknown) => setLoadError(errorText(e, 'Could not load this business')));
  }, [id]);

  const initial = useMemo(() => (business ? toValues(business) : null), [business]); // stable, so typing is not reset

  if (loadError) return <div className="p-5"><ErrorBox message={loadError} /></div>;
  if (!business || !initial) return <Loading what="business" />;

  async function submit(v: BusinessFormValues) {
    setBusy(true);
    setError('');
    try {
      await saveBusinessDetails(id, {
        name: v.name.trim(), vertical: v.vertical, business_type: v.business_type, country: orNull(v.country), website: orNull(v.website),
        business_email: orNull(v.business_email), business_phone: orNull(v.business_phone), city: orNull(v.city), address: orNull(v.address),
        postal_code: orNull(v.postal_code), timezone: v.timezone, currency: v.currency, working_hours: v.working_hours, status: v.status,
      });
      if (v.plan && v.plan !== business!.plan) await changeBusinessPlan(id, v.plan);
      router.push(`/businesses/${id}`);
    } catch (e) {
      setError(errorText(e, 'Could not save the changes'));
      setBusy(false);
    }
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <PageHeader title={`Edit ${business.name}`} subtitle="Change the business's details, opening hours, status and plan." />
      <BusinessForm mode="edit" initial={initial} busy={busy} error={error} submitLabel="Save changes" onSubmit={submit} onCancel={() => router.push(`/businesses/${id}`)} />
    </div>
  );
}
