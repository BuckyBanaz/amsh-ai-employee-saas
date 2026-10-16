"use client";

import { useEffect, useMemo, useState } from 'react';
import { BusinessFields, PlanApi, WorkingHours, fetchPlans, fetchTenants, fetchVerticals } from '@/lib/api';
import { BTN, Card, Chip, ErrorBox, INPUT, PRIMARY, errorText } from '@/components/admin/ui';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const STATUSES = ['active', 'pending', 'paused', 'suspended'];

export interface BusinessFormValues extends Omit<BusinessFields, 'plan'> {
  plan: string;
  owner_name: string;
  owner_email: string;
  owner_password: string;
}

export const emptyBusiness = (): BusinessFormValues => ({
  name: '', vertical: 'clinic', business_type: 'healthcare', business_subtype: null, country: '', website: '', business_email: '', business_phone: '',
  city: '', address: '', postal_code: '', timezone: 'UTC', currency: 'USD',
  working_hours: Object.fromEntries(DAYS.map((d) => [d, d === 'Sunday' ? [] : [{ start: '09:00', end: '17:00' }]])),
  plan: '', status: 'active', owner_name: '', owner_email: '', owner_password: '',
});

const intlList = (kind: 'timeZone' | 'currency', fallback: string[]) => {
  const fn = (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf;
  try { return fn ? fn(kind) : fallback; } catch { return fallback; }
};

function Field({ label, hint, children, wide }: { label: string; hint?: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="text-[11px] font-semibold text-[#475569]">{label}</span>
      {children}
      {hint && <span className="text-[10px] text-[#94A3B8]">{hint}</span>}
    </label>
  );
}

function Section({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <Card className="p-4">
      <h2 className="text-sm font-bold text-[#0F172A]">{title}</h2>
      {sub && <p className="mb-3 text-xs text-[#475569]">{sub}</p>}
      <div className={`grid gap-3 sm:grid-cols-2 ${sub ? '' : 'mt-3'}`}>{children}</div>
    </Card>
  );
}

function HoursEditor({ value, onChange }: { value: WorkingHours; onChange: (v: WorkingHours) => void }) {
  const set = (day: string, ranges: { start: string; end: string }[]) => onChange({ ...value, [day]: ranges });
  return (
    <div className="sm:col-span-2 flex flex-col gap-2">
      {DAYS.map((day) => {
        const ranges = value[day] ?? [];
        const open = ranges.length > 0;
        return (
          <div key={day} className="flex flex-wrap items-center gap-2 border-b border-[#F1F5F9] pb-2 text-xs">
            <label className="flex w-28 items-center gap-2 font-semibold text-[#0F172A]">
              <input type="checkbox" checked={open} onChange={(e) => set(day, e.target.checked ? [{ start: '09:00', end: '17:00' }] : [])} />
              {day}
            </label>
            {!open && <span className="text-[#94A3B8]">Closed</span>}
            {ranges.map((r, i) => (
              <span key={i} className="flex items-center gap-1">
                <input type="time" aria-label={`${day} opens`} className={`${INPUT} w-28`} value={r.start} onChange={(e) => set(day, ranges.map((x, j) => (j === i ? { ...x, start: e.target.value } : x)))} />
                <span className="text-[#94A3B8]">to</span>
                <input type="time" aria-label={`${day} closes`} className={`${INPUT} w-28`} value={r.end} onChange={(e) => set(day, ranges.map((x, j) => (j === i ? { ...x, end: e.target.value } : x)))} />
                <button type="button" className="text-[#94A3B8] hover:text-red-600" aria-label="Remove time range" onClick={() => set(day, ranges.filter((_, j) => j !== i))}>×</button>
              </span>
            ))}
            {open && <button type="button" className="text-[11px] font-semibold text-[#2563EB] hover:underline" onClick={() => set(day, [...ranges, { start: '14:00', end: '18:00' }])}>+ Add time</button>}
          </div>
        );
      })}
    </div>
  );
}

function PlanPicker({ plans, value, onChange }: { plans: PlanApi[]; value: string; onChange: (key: string) => void }) {
  const price = (p: PlanApi) => (p.custom_pricing ? 'Custom pricing' : `${p.currency} ${p.price}/${p.cycle === 'yearly' ? 'yr' : 'mo'}`);
  const groups: { title: string; items: PlanApi[] }[] = [
    { title: 'Standard plans', items: plans.filter((p) => p.kind === 'catalog') },
    { title: 'Enterprise plans', items: plans.filter((p) => p.kind === 'enterprise') },
  ];
  return (
    <div className="sm:col-span-2 flex flex-col gap-3">
      {groups.map((g) => g.items.length > 0 && (
        <div key={g.title}>
          <p className="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">{g.title}</p>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((p) => (
              <button type="button" key={p.key} onClick={() => onChange(p.key)} aria-pressed={value === p.key}
                className={`rounded-lg border p-3 text-left text-xs transition-colors ${value === p.key ? 'border-[#0066FF] bg-[#EFF6FF]' : 'border-[#E2E8F0] bg-white hover:bg-[#F8FAFC]'}`}>
                <span className="flex items-center justify-between gap-2">
                  <span className="font-bold text-[#0F172A]">{p.name}</span>
                  {p.kind === 'enterprise' && <Chip tone="blue">Enterprise</Chip>}
                </span>
                <span className="mt-0.5 block text-[#475569]">{price(p)}</span>
                {p.client && <span className="mt-0.5 block text-[10px] text-[#94A3B8]">For {p.client}</span>}
              </button>
            ))}
          </div>
        </div>
      ))}
      {plans.length === 0 && <p className="text-xs text-[#94A3B8]">No active plans yet. Create one under Plans first.</p>}
    </div>
  );
}

export function BusinessForm({ mode, initial, busy, error, submitLabel, onSubmit, onCancel }: {
  mode: 'create' | 'edit';
  initial: BusinessFormValues;
  busy: boolean;
  error: string;
  submitLabel: string;
  onSubmit: (values: BusinessFormValues) => void;
  onCancel: () => void;
}) {
  const [v, setV] = useState<BusinessFormValues>(initial);
  const [plans, setPlans] = useState<PlanApi[]>([]);
  const [verticals, setVerticals] = useState<string[]>([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [loadError, setLoadError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const timezones = useMemo(() => intlList('timeZone', ['UTC']), []);
  const currencies = useMemo(() => intlList('currency', ['USD']), []);

  useEffect(() => { setV(initial); }, [initial]);
  useEffect(() => {
    fetchPlans().then((d) => setPlans(d.items.filter((p) => p.status === 'active'))).catch((e: unknown) => setLoadError(errorText(e, 'Could not load the plans')));
    fetchVerticals().then((d) => setVerticals(d.items.map((x) => x.name))).catch(() => setVerticals(['clinic']));
    fetchTenants({}).then((d) => setCountries(d.facets.countries.filter((c) => c && c !== 'All'))).catch(() => undefined);
  }, []);

  const up = <K extends keyof BusinessFormValues>(key: K, value: BusinessFormValues[K]) => setV((s) => ({ ...s, [key]: value }));
  const text = (key: 'name' | 'country' | 'website' | 'business_email' | 'business_phone' | 'city' | 'address' | 'postal_code') =>
    ({ className: INPUT, value: v[key] ?? '', onChange: (e: React.ChangeEvent<HTMLInputElement>) => up(key, e.target.value) });
  const canSubmit = v.name.trim() && (mode === 'edit' || (v.owner_name.trim() && v.owner_email.trim() && v.owner_password.length >= 8));

  return (
    <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); if (canSubmit) onSubmit(v); }}>
      {(error || loadError) && <ErrorBox message={error || loadError} />}

      <Section title="Business">
        <Field label="Business name *" wide><input required {...text('name')} placeholder="Name shown to callers" /></Field>
        <Field label="Vertical"><select className={INPUT} value={v.vertical} onChange={(e) => up('vertical', e.target.value)}>
          {(verticals.includes(v.vertical) || !v.vertical ? verticals : [v.vertical, ...verticals]).map((x) => <option key={x} value={x}>{x}</option>)}
        </select></Field>
        <Field label="Status"><select className={INPUT} value={v.status} onChange={(e) => up('status', e.target.value)}>
          {STATUSES.map((x) => <option key={x} value={x}>{x}</option>)}
        </select></Field>
      </Section>

      <Section title="Contact and location">
        <Field label="Business email"><input type="email" {...text('business_email')} /></Field>
        <Field label="Business phone"><input type="tel" {...text('business_phone')} placeholder="+91..." /></Field>
        <Field label="Website"><input {...text('website')} placeholder="https://" /></Field>
        <Field label="Country"><input list="admin-countries" {...text('country')} /><datalist id="admin-countries">{countries.map((c) => <option key={c} value={c} />)}</datalist></Field>
        <Field label="City"><input {...text('city')} /></Field>
        <Field label="Postal code"><input {...text('postal_code')} /></Field>
        <Field label="Address" wide><input {...text('address')} /></Field>
        <Field label="Time zone"><select className={INPUT} value={v.timezone} onChange={(e) => up('timezone', e.target.value)}>
          {(timezones.includes(v.timezone) ? timezones : [v.timezone, ...timezones]).map((x) => <option key={x} value={x}>{x}</option>)}
        </select></Field>
        <Field label="Currency"><select className={INPUT} value={v.currency} onChange={(e) => up('currency', e.target.value)}>
          {(currencies.includes(v.currency) ? currencies : [v.currency, ...currencies]).map((x) => <option key={x} value={x}>{x}</option>)}
        </select></Field>
      </Section>

      <Section title="Opening hours" sub="When the AI receptionist can book appointments.">
        <HoursEditor value={v.working_hours} onChange={(h) => up('working_hours', h)} />
      </Section>

      <Section title="Plan" sub="Standard and enterprise plans.">
        <PlanPicker plans={plans} value={v.plan} onChange={(k) => up('plan', k)} />
      </Section>

      {mode === 'create' && (
        <Section title="Owner login" sub="The person who signs in to this business's dashboard. They are marked verified.">
          <Field label="Owner name *"><input required className={INPUT} value={v.owner_name} onChange={(e) => up('owner_name', e.target.value)} autoComplete="off" /></Field>
          <Field label="Owner email *"><input required type="email" className={INPUT} value={v.owner_email} onChange={(e) => up('owner_email', e.target.value)} autoComplete="off" /></Field>
          <Field label="Temporary password *" hint="At least 8 characters. Share it with the owner and ask them to change it.">
            <span className="flex gap-2">
              <input required minLength={8} type={showPassword ? 'text' : 'password'} className={INPUT} value={v.owner_password} onChange={(e) => up('owner_password', e.target.value)} autoComplete="new-password" />
              <button type="button" className={BTN} onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? 'Hide' : 'Show'}</button>
            </span>
          </Field>
        </Section>
      )}

      <div className="flex items-center justify-end gap-2">
        <button type="button" className={BTN} onClick={onCancel} disabled={busy}>Cancel</button>
        <button type="submit" className={PRIMARY} disabled={busy || !canSubmit}>{busy ? 'Saving…' : submitLabel}</button>
      </div>
    </form>
  );
}
