"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { adminAuth, createPlan, fetchOverview, fetchPlans, fetchTenants, updatePlan, Overview, PlanApi, PlanBody, TenantItem } from '../../../lib/api';

type PlanStatus = 'Active' | 'Draft' | 'Archived';
type BillingCycle = 'Monthly' | 'Yearly';

/** Catalog plans are self-serve from the website; Enterprise plans are configured per client by the AMSH team. */
type PlanKind = 'Catalog' | 'Enterprise';

type FeatureKey =
  | 'call_recording'
  | 'multi_language'
  | 'custom_voice'
  | 'api_access'
  | 'advanced_analytics'
  | 'calendar_sync'
  | 'payments_integration'
  | 'whatsapp'
  | 'email_alerts'
  | 'warm_transfer'
  | 'multi_doctor'
  | 'multi_location'
  | 'ehr_integration'
  | 'white_label'
  | 'priority_support';

interface PlanQuotas {
  voiceMinutes: number | null;
  messages: number | null;
  concurrentCalls: number | null;
  aiTokensMillions: number | null;
  knowledgeDocs: number | null;
  audioStorageGb: number | null;
  vectorStorageGb: number | null;
  conversationRetentionDays: number | null;
  seats: number | null;
}

interface PlanOverage {
  perMinute: number;
  perMessage: number;
  perGb: number;
}

interface Plan {
  id: string;
  key: string;
  description: string;
  currency: string;
  priceYearly: number | null;
  highlighted: boolean;
  sortOrder: number;
  name: string;
  kind: PlanKind;
  client?: string;
  price: number;
  cycle: BillingCycle;
  status: PlanStatus;
  customPricing: boolean;
  subscribers: number;
  quotas: PlanQuotas;
  overage: PlanOverage;
  features: FeatureKey[];
}

const FEATURE_CATALOG: { key: FeatureKey; label: string; hint: string }[] = [
  { key: 'call_recording', label: 'Call Recording', hint: 'Store call audio for playback' },
  { key: 'multi_language', label: 'Multi-language AI', hint: 'English, Hindi, Hinglish auto-switch' },
  { key: 'custom_voice', label: 'Custom Voice Clone', hint: 'Branded clinic receptionist voice' },
  { key: 'api_access', label: 'API Access', hint: 'Public REST + webhooks' },
  { key: 'advanced_analytics', label: 'Advanced Analytics', hint: 'Patient cohorts and peak call insights' },
  { key: 'calendar_sync', label: 'Calendar Sync', hint: 'Google & Microsoft calendars' },
  { key: 'payments_integration', label: 'Payments', hint: 'Online consultation fee links' },
  { key: 'whatsapp', label: 'WhatsApp Channel', hint: 'Reminders & booking confirmation pins' },
  { key: 'email_alerts', label: 'Email Alerts', hint: 'Instant appointment & call summaries' },
  { key: 'warm_transfer', label: 'Warm Call Transfer', hint: 'Forward urgent calls to doctor/front desk' },
  { key: 'multi_doctor', label: 'Multi-Doctor Scheduling', hint: 'Custom schedules & slots per doctor' },
  { key: 'multi_location', label: 'Multi-Branch Routing', hint: 'Route patient calls by clinic branch' },
  { key: 'ehr_integration', label: 'EHR / EMR Sync', hint: 'Direct hospital records integration' },
  { key: 'white_label', label: 'White Label', hint: 'Remove platform branding' },
  { key: 'priority_support', label: 'Priority Support', hint: 'Dedicated manager & 24/7 SLA' },
];

const statusStyles: Record<string, string> = {
  Active: 'bg-[#D1FAE5] text-[#065F46]',
  Paid: 'bg-[#D1FAE5] text-[#065F46]',
  Draft: 'bg-[#F1F5F9] text-[#475569]',
  Archived: 'bg-[#F1F5F9] text-[#475569]',
  Trial: 'bg-[#FEF3C7] text-[#92400E]',
  Pending: 'bg-[#FEF3C7] text-[#92400E]',
  Suspended: 'bg-[#FEE2E2] text-[#991B1B]',
  Failed: 'bg-[#FEE2E2] text-[#991B1B]',
};

const kindStyles: Record<PlanKind, string> = {
  Catalog: 'bg-[#EFF6FF] text-[#2563EB]',
  Enterprise: 'bg-[#F5F3FF] text-[#7C3AED]',
};

const emptyPlan = (kind: PlanKind = 'Catalog'): Plan => ({
  id: '',
  key: '',
  description: '',
  currency: 'USD',
  priceYearly: null,
  highlighted: false,
  sortOrder: 0,
  name: '',
  kind,
  client: '',
  price: 0,
  cycle: 'Monthly',
  status: 'Draft',
  customPricing: kind === 'Enterprise',
  subscribers: 0,
  quotas: {
    voiceMinutes: 500,
    messages: 1000,
    concurrentCalls: 2,
    aiTokensMillions: 1,
    knowledgeDocs: 50,
    audioStorageGb: 5,
    vectorStorageGb: 1,
    conversationRetentionDays: 30,
    seats: 3,
  },
  overage: { perMinute: 0.2, perMessage: 0.02, perGb: 0.5 },
  features: [],
});

const quotaFields: { key: keyof PlanQuotas; label: string; unit: string; hint: string }[] = [
  { key: 'voiceMinutes', label: 'Voice Minutes', unit: 'min / month', hint: 'Inbound + outbound AI talk time' },
  { key: 'messages', label: 'Messages', unit: 'msg / month', hint: 'WhatsApp, SMS and web chat' },
  { key: 'concurrentCalls', label: 'Concurrent Calls', unit: 'channels', hint: 'Parallel calls allowed' },
  { key: 'aiTokensMillions', label: 'AI Tokens', unit: 'million / month', hint: 'LLM inference budget' },
  { key: 'knowledgeDocs', label: 'Knowledge Docs', unit: 'documents', hint: 'RAG source documents' },
  { key: 'audioStorageGb', label: 'Audio Storage', unit: 'GB', hint: 'Call recordings retained' },
  { key: 'vectorStorageGb', label: 'Vector Storage', unit: 'GB', hint: 'Embeddings index size' },
  { key: 'conversationRetentionDays', label: 'Conversation Retention', unit: 'days', hint: 'Transcript history kept' },
  { key: 'seats', label: 'Team Seats', unit: 'users', hint: 'Dashboard logins' },
];

// Locale is pinned so SSR and client hydration produce identical digit grouping.
const CURRENCY_SYMBOL: Record<string, string> = { USD: '$', INR: '₹', EUR: '€', GBP: '£' };
const money = (value: number, currency = 'USD') => `${CURRENCY_SYMBOL[currency] ?? currency + ' '}${value.toLocaleString('en-US')}`;

const numberInputClass =
  'w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]';

const QUOTA_MAP: [keyof PlanQuotas, string][] = [
  ['voiceMinutes', 'voice_minutes'],
  ['messages', 'messages'],
  ['concurrentCalls', 'concurrent_calls'],
  ['aiTokensMillions', 'ai_tokens_millions'],
  ['knowledgeDocs', 'knowledge_docs'],
  ['audioStorageGb', 'audio_storage_gb'],
  ['vectorStorageGb', 'vector_storage_gb'],
  ['conversationRetentionDays', 'conversation_retention_days'],
  ['seats', 'seats'],
];
/** A quota left empty means unlimited. */
const amount = (value: number | null, unit = '') => (value === null ? 'Unlimited' : `${value.toLocaleString('en-US')}${unit}`);
const capitalize = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);

function fromApi(p: PlanApi): Plan {
  const quotas = {} as PlanQuotas;
  QUOTA_MAP.forEach(([ui, api]) => {
    quotas[ui] = p.quotas[api] ?? null;
  });
  return {
    id: p.id,
    key: p.key,
    description: p.description ?? '',
    name: p.name,
    kind: p.kind === 'enterprise' ? 'Enterprise' : 'Catalog',
    client: p.client ?? undefined,
    currency: p.currency,
    price: p.price,
    priceYearly: p.price_yearly,
    cycle: p.cycle === 'yearly' ? 'Yearly' : 'Monthly',
    status: capitalize(p.status) as PlanStatus,
    customPricing: p.custom_pricing,
    highlighted: p.highlighted,
    sortOrder: p.sort_order,
    subscribers: p.subscribers,
    quotas,
    overage: { perMinute: p.overage.per_minute ?? 0, perMessage: p.overage.per_message ?? 0, perGb: p.overage.per_gb ?? 0 },
    features: p.features as FeatureKey[],
  };
}

function toBody(p: Plan, isNew: boolean): PlanBody {
  return {
    ...(isNew && p.key.trim() ? { key: p.key.trim() } : {}),
    name: p.name.trim(),
    description: p.description.trim(),
    kind: p.kind === 'Enterprise' ? 'enterprise' : 'catalog',
    client: p.kind === 'Enterprise' ? (p.client ?? '').trim() : '',
    price: p.price,
    cycle: p.cycle === 'Yearly' ? 'yearly' : 'monthly',
    price_yearly: p.cycle === 'Monthly' && !p.customPricing ? p.priceYearly : null,
    currency: p.currency,
    custom_pricing: p.customPricing,
    status: p.status.toLowerCase() as PlanApi['status'],
    highlighted: p.highlighted,
    sort_order: p.sortOrder,
    quotas: Object.fromEntries(QUOTA_MAP.map(([ui, api]) => [api, p.quotas[ui]])),
    overage: { per_minute: p.overage.perMinute, per_message: p.overage.perMessage, per_gb: p.overage.perGb },
    features: p.features,
  };
}

interface PlanEditorProps {
  draft: Plan;
  isNew: boolean;
  onChange: (plan: Plan) => void;
  onSave: () => void;
  onClose: () => void;
  error: string | null;
  saving: boolean;
}

function PlanEditor({ draft, isNew, onChange, onSave, onClose, error, saving }: PlanEditorProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const setQuota = (key: keyof PlanQuotas, value: number | null) =>
    onChange({ ...draft, quotas: { ...draft.quotas, [key]: value } });

  const toggleFeature = (key: FeatureKey) =>
    onChange({
      ...draft,
      features: draft.features.includes(key)
        ? draft.features.filter((f) => f !== key)
        : [...draft.features, key],
    });

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isNew ? 'Create plan' : `Edit ${draft.name}`}
        onClick={(e) => e.stopPropagation()}
        className="bg-white w-full max-w-3xl rounded-xl shadow-xl border border-[#E2E8F0] max-h-[90vh] flex flex-col"
      >
        <div className="flex items-center justify-between p-5 border-b border-[#E2E8F0] flex-shrink-0">
          <div>
            <h2 className="text-[16px] font-bold text-[#0F172A]">{isNew ? 'Create Plan' : `Edit ${draft.name}`}</h2>
            <p className="text-[12px] text-[#64748B] mt-0.5">
              Define price, quotas, storage and features. Tenants are billed against these limits.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg text-[#64748B] hover:bg-gray-100 flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-6 overflow-y-auto flex-1">
          {error && (
            <div className="rounded-lg border border-[#EF4444] bg-[#FEE2E2] px-3 py-2 text-[13px] font-semibold text-[#991B1B]">
              {error}
            </div>
          )}

          <div>
            <h3 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Availability</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {([
                { kind: 'Catalog' as PlanKind, title: 'Catalog (self-serve)', hint: 'Listed publicly. Any customer can buy it from the website.' },
                { kind: 'Enterprise' as PlanKind, title: 'Enterprise (sales-led)', hint: 'Configured individually by the AMSH team and sold to one client.' },
              ]).map((option) => (
                <label
                  key={option.kind}
                  className={`flex items-start gap-2.5 p-3 border rounded-lg cursor-pointer transition-colors ${
                    draft.kind === option.kind ? 'border-[#2563EB] bg-[#EFF6FF]' : 'border-[#E2E8F0] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <input
                    type="radio"
                    name="plan-kind"
                    checked={draft.kind === option.kind}
                    onChange={() =>
                      onChange({
                        ...draft,
                        kind: option.kind,
                        customPricing: option.kind === 'Enterprise' ? true : draft.customPricing,
                        client: option.kind === 'Catalog' ? '' : draft.client,
                      })
                    }
                    className="w-4 h-4 mt-0.5 accent-[#2563EB]"
                  />
                  <span>
                    <span className="text-[13px] font-semibold text-[#0F172A] block">{option.title}</span>
                    <span className="text-[11px] text-[#94A3B8]">{option.hint}</span>
                  </span>
                </label>
              ))}
            </div>
            {draft.kind === 'Enterprise' && (
              <label className="block mt-3">
                <span className="text-[12px] font-semibold text-[#475569]">Client / Account</span>
                <input
                  type="text"
                  value={draft.client ?? ''}
                  onChange={(e) => onChange({ ...draft, client: e.target.value })}
                  placeholder="e.g. MediGroup Netherlands"
                  className={`${numberInputClass} mt-1`}
                />
                <span className="text-[11px] text-[#94A3B8] block mt-1">
                  This deal is not shown on the public pricing page.
                </span>
              </label>
            )}
          </div>

          <div>
            <h3 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Plan Basics</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="md:col-span-2 block">
                <span className="text-[12px] font-semibold text-[#475569]">Plan Name</span>
                <input
                  type="text"
                  value={draft.name}
                  onChange={(e) => onChange({ ...draft, name: e.target.value })}
                  placeholder="e.g. Growth"
                  className={`${numberInputClass} mt-1`}
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-[#475569]">Price ({draft.currency})</span>
                <input
                  type="number"
                  min={0}
                  disabled={draft.customPricing}
                  value={draft.customPricing ? '' : draft.price}
                  onChange={(e) => onChange({ ...draft, price: Number(e.target.value) })}
                  className={`${numberInputClass} mt-1 disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]`}
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-[#475569]">Billing Cycle</span>
                <select
                  value={draft.cycle}
                  onChange={(e) => onChange({ ...draft, cycle: e.target.value as BillingCycle })}
                  className={`${numberInputClass} mt-1`}
                >
                  <option value="Monthly">Monthly</option>
                  <option value="Yearly">Yearly</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-[#475569]">Status</span>
                <select
                  value={draft.status}
                  onChange={(e) => onChange({ ...draft, status: e.target.value as PlanStatus })}
                  className={`${numberInputClass} mt-1`}
                >
                  <option value="Draft">Draft</option>
                  <option value="Active">Active</option>
                  <option value="Archived">Archived</option>
                </select>
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-[#475569]">Currency</span>
                <select
                  value={draft.currency}
                  onChange={(e) => onChange({ ...draft, currency: e.target.value })}
                  className={`${numberInputClass} mt-1`}
                >
                  {['USD', 'INR', 'EUR', 'GBP'].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </label>
              {draft.cycle === 'Monthly' && !draft.customPricing && (
                <label className="block">
                  <span className="text-[12px] font-semibold text-[#475569]">Yearly price ({draft.currency}, optional)</span>
                  <input
                    type="number"
                    min={0}
                    value={draft.priceYearly ?? ''}
                    placeholder="No yearly option"
                    onChange={(e) => onChange({ ...draft, priceYearly: e.target.value === '' ? null : Number(e.target.value) })}
                    className={`${numberInputClass} mt-1`}
                  />
                </label>
              )}
              <label className="block">
                <span className="text-[12px] font-semibold text-[#475569]">Plan key {isNew ? '' : '(fixed)'}</span>
                <input
                  type="text"
                  value={draft.key}
                  disabled={!isNew}
                  onChange={(e) => onChange({ ...draft, key: e.target.value.toLowerCase() })}
                  placeholder="auto from the name"
                  className={`${numberInputClass} mt-1 disabled:bg-[#F1F5F9] disabled:text-[#94A3B8]`}
                />
              </label>
              <label className="md:col-span-4 block">
                <span className="text-[12px] font-semibold text-[#475569]">Description (shown on pricing screens)</span>
                <input
                  type="text"
                  maxLength={300}
                  value={draft.description}
                  onChange={(e) => onChange({ ...draft, description: e.target.value })}
                  placeholder="One line about who this plan is for"
                  className={`${numberInputClass} mt-1`}
                />
              </label>
              <label className="md:col-span-4 flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={draft.highlighted}
                  onChange={(e) => onChange({ ...draft, highlighted: e.target.checked })}
                  className="w-4 h-4 accent-[#2563EB]"
                />
                <span className="text-[13px] text-[#475569]">Show as &quot;Most popular&quot; on pricing screens</span>
              </label>
              <label className="md:col-span-3 flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={draft.customPricing}
                  onChange={(e) => onChange({ ...draft, customPricing: e.target.checked })}
                  className="w-4 h-4 accent-[#2563EB]"
                />
                <span className="text-[13px] text-[#475569]">Quoted price (hide from public pricing page)</span>
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">
              Quotas, Storage &amp; Retention
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {quotaFields.map((field) => (
                <label key={field.key} className="block">
                  <span className="text-[12px] font-semibold text-[#475569]">{field.label}</span>
                  <input
                    type="number"
                    min={0}
                    value={draft.quotas[field.key] ?? ''}
                    placeholder="Unlimited"
                    onChange={(e) => setQuota(field.key, e.target.value === '' ? null : Number(e.target.value))}
                    className={`${numberInputClass} mt-1`}
                  />
                  <span className="text-[11px] text-[#94A3B8] block mt-1">
                    {field.unit} · {field.hint} · leave empty for unlimited
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Overage Rates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="block">
                <span className="text-[12px] font-semibold text-[#475569]">Per extra minute ({draft.currency})</span>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={draft.overage.perMinute}
                  onChange={(e) => onChange({ ...draft, overage: { ...draft.overage, perMinute: Number(e.target.value) } })}
                  className={`${numberInputClass} mt-1`}
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-[#475569]">Per extra message ({draft.currency})</span>
                <input
                  type="number"
                  min={0}
                  step={0.001}
                  value={draft.overage.perMessage}
                  onChange={(e) => onChange({ ...draft, overage: { ...draft.overage, perMessage: Number(e.target.value) } })}
                  className={`${numberInputClass} mt-1`}
                />
              </label>
              <label className="block">
                <span className="text-[12px] font-semibold text-[#475569]">Per extra GB ({draft.currency})</span>
                <input
                  type="number"
                  min={0}
                  step={0.05}
                  value={draft.overage.perGb}
                  onChange={(e) => onChange({ ...draft, overage: { ...draft.overage, perGb: Number(e.target.value) } })}
                  className={`${numberInputClass} mt-1`}
                />
              </label>
            </div>
          </div>

          <div>
            <h3 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Features</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {FEATURE_CATALOG.map((feature) => (
                <label
                  key={feature.key}
                  className="flex items-start gap-2.5 p-2.5 border border-[#E2E8F0] rounded-lg hover:bg-[#F8FAFC] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={draft.features.includes(feature.key)}
                    onChange={() => toggleFeature(feature.key)}
                    className="w-4 h-4 mt-0.5 accent-[#2563EB]"
                  />
                  <span>
                    <span className="text-[13px] font-semibold text-[#0F172A] block">{feature.label}</span>
                    <span className="text-[11px] text-[#94A3B8]">{feature.hint}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-[#E2E8F0] bg-[#F8FAFC] rounded-b-xl flex-shrink-0">
          <button
            onClick={onClose}
            className="px-3.5 py-2 border border-[#E2E8F0] bg-white text-[#475569] rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="px-3.5 py-2 bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 text-white rounded-lg text-[13px] font-semibold transition-colors"
          >
            {saving ? 'Saving...' : isNew ? 'Create Plan' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [loadError, setLoadError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [saving, setSaving] = useState(false);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [subs, setSubs] = useState<TenantItem[] | null>(null);
  const [draft, setDraft] = useState<Plan | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<'All' | PlanKind>('All');

  // Dynamic Free / Paid Trial Configuration
  const [trialConfig, setTrialConfig] = useState({
    enabled: true,
    is_free: true,
    price: 0,
    currency: 'USD',
    duration_days: 14,
    voice_minutes: 50,
    messages: 100,
    banner_headline: '{days}-Day Free Trial is Active ({days_left} days remaining)',
    banner_description: 'You have full access to automated patient call handling and calendar sync. Choose any subscription plan below to upgrade anytime!',
  });
  const [trialSaving, setTrialSaving] = useState(false);
  const [trialSavedMsg, setTrialSavedMsg] = useState('');

  useEffect(() => {
    fetch('http://localhost:8010/api/billing/trial-config')
      .then((r) => r.json())
      .then((data) => {
        if (data && typeof data === 'object') {
          setTrialConfig((prev) => ({ ...prev, ...data }));
        }
      })
      .catch((e) => console.warn('Could not load trial config:', e));
  }, []);

  const handleSaveTrial = async () => {
    setTrialSaving(true);
    setTrialSavedMsg('');
    try {
      const token = adminAuth.getToken();
      const res = await fetch('http://localhost:8010/api/billing/trial-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify(trialConfig),
      });
      if (res.ok) {
        setTrialSavedMsg('✓ Saved & active on user app!');
        setTimeout(() => setTrialSavedMsg(''), 4000);
      }
    } catch (err) {
      console.error('Failed to save trial settings:', err);
    } finally {
      setTrialSaving(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    fetchPlans()
      .then((res) => {
        if (cancelled) return;
        setPlans(res.items.map(fromApi));
        setLoadState('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setLoadError(err instanceof Error ? err.message : 'Could not load plans.');
        setLoadState('error');
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchOverview(), fetchTenants({})])
      .then(([o, t]) => {
        if (cancelled) return;
        setOverview(o);
        setSubs(t.items);
      })
      .catch(() => {
        /* the plan catalog above has its own error banner; these numbers just stay empty */
      });
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const visibleGroups = useMemo(() => {
    const groups: { kind: PlanKind; description: string; plans: Plan[] }[] = [
      {
        kind: 'Catalog',
        description: 'Public pricing page. Self-serve signup, no sales call needed.',
        plans: plans.filter((plan) => plan.kind === 'Catalog'),
      },
      {
        kind: 'Enterprise',
        description: 'Configured individually by the AMSH team and sold per client.',
        plans: plans.filter((plan) => plan.kind === 'Enterprise'),
      },
    ];
    return kindFilter === 'All' ? groups : groups.filter((group) => group.kind === kindFilter);
  }, [plans, kindFilter]);

  const totalSubscribers = useMemo(
    () => plans.reduce((sum, plan) => sum + plan.subscribers, 0),
    [plans]
  );

  const openCreate = (kind: PlanKind = 'Catalog') => {
    setDraft(emptyPlan(kind));
    setIsNew(true);
    setError(null);
  };

  const openEdit = (plan: Plan) => {
    setDraft({ ...plan, quotas: { ...plan.quotas }, overage: { ...plan.overage }, features: [...plan.features] });
    setIsNew(false);
    setError(null);
  };

  const closeEditor = () => {
    setDraft(null);
    setError(null);
  };

  const savePlan = async () => {
    if (!draft) return;
    const name = draft.name.trim();
    if (!name) {
      setError('Plan name is required.');
      return;
    }
    const duplicate = plans.some((p) => p.name.toLowerCase() === name.toLowerCase() && p.id !== draft.id);
    if (duplicate) {
      setError('A plan with this name already exists.');
      return;
    }
    if (!draft.customPricing && draft.price < 0) {
      setError('Price cannot be negative.');
      return;
    }
    if (draft.kind === 'Enterprise' && !(draft.client ?? '').trim()) {
      setError('Enterprise plans must name the client they are configured for.');
      return;
    }

    const next: Plan = {
      ...draft,
      name,
      client: draft.kind === 'Enterprise' ? (draft.client ?? '').trim() : undefined,
    };

    setSaving(true);
    try {
      if (isNew) await createPlan(toBody(next, true));
      else await updatePlan(next.id, toBody(next, false));
      closeEditor();
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save the plan.');
    } finally {
      setSaving(false);
    }
  };

  const duplicatePlan = (plan: Plan) => {
    setDraft({
      ...plan,
      id: '',
      name: `${plan.name} Copy`,
      status: 'Draft',
      subscribers: 0,
      quotas: { ...plan.quotas },
      overage: { ...plan.overage },
      features: [...plan.features],
    });
    setIsNew(true);
    setError(null);
  };

  const archivePlan = async (id: string) => {
    const plan = plans.find((p) => p.id === id);
    if (!plan) return;
    try {
      await updatePlan(id, { status: plan.status === 'Archived' ? 'active' : 'archived' });
      setReloadKey((k) => k + 1);
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'Could not change the plan.');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <header className="mb-4 pb-3 border-b border-[#E2E8F0] flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A] tracking-tight leading-tight">
            Billing &amp; Subscriptions
          </h1>
          <p className="text-xs text-[#475569] mt-0.5 font-normal">
            Subscription, plan catalog and revenue management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 border border-[#E2E8F0] rounded-lg py-1.5 px-2.5 text-xs font-medium text-[#475569] bg-white shadow-2xs hover:bg-gray-50 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Jan 1 - Jan 30, 2026
          </button>
          <button
            onClick={() => openCreate('Catalog')}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Create Plan
          </button>
        </div>
      </header>

      {loadState === 'error' && (
        <div role="alert" className="mb-3 flex items-center justify-between text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
          <span>{loadError}</span>
          <button type="button" onClick={() => { setLoadState('loading'); setReloadKey((k) => k + 1); }} className="font-semibold underline">Try again</button>
        </div>
      )}
      {loadState === 'loading' && <div className="mb-3 text-xs text-[#94A3B8]">Loading plans...</div>}
      {/* Numbers read from the catalog and the businesses (no payments are recorded yet, so revenue is an estimate) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 mb-3.5">
        {[
          { label: 'Active plans', value: String(plans.filter((p) => p.status === 'Active').length), note: `${plans.length} plans in total` },
          { label: 'Businesses on a plan', value: String(totalSubscribers), note: 'all statuses' },
          { label: 'Active on a paid plan', value: overview ? String(overview.revenue.paying_businesses) : '—', note: 'active businesses whose plan has a price' },
          {
            label: 'Est. monthly revenue',
            value: overview
              ? Object.entries(overview.revenue.monthly_estimate).map(([c, v]) => money(Math.round(v), c)).join(' · ') || '—'
              : '—',
            note: 'estimate from plan prices, not payments',
          },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 sm:p-3 shadow-2xs">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">{kpi.label}</div>
            <div className="text-lg font-bold text-[#0F172A] leading-none mb-1.5">{kpi.value}</div>
            <div className="text-[11px] text-[#64748B]">{kpi.note}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-3.5 mb-3.5">
        <section className="bg-white border border-[#E2E8F0] rounded-lg p-3.5 shadow-2xs">
          <h2 className="text-xs font-bold text-[#0F172A] mb-0.5">Plan Distribution</h2>
          <p className="text-[11px] text-[#64748B] mb-3">{totalSubscribers} paying tenants across {plans.length} plans.</p>
          <div className="space-y-2">
            {plans.map((plan) => {
              const share = totalSubscribers === 0 ? 0 : Math.round((plan.subscribers / totalSubscribers) * 100);
              return (
                <div key={plan.id} className="space-y-1">
                  <div className="flex justify-between text-[11px]">
                    <span className="text-[#475569]">
                      {plan.name} ({plan.customPricing ? 'Quoted' : `${money(plan.price, plan.currency)}/mo`})
                    </span>
                    <span className="font-bold text-[#0F172A]">
                      {plan.subscribers} ({share}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
                    <div className="h-full bg-[#2563EB] rounded-full" style={{ width: `${share}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* Plan catalog */}
      <section className="bg-white border border-[#E2E8F0] rounded-lg shadow-2xs mb-3.5">
        <div className="p-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2.5">
          <div>
            <h2 className="text-xs font-bold text-[#0F172A]">Plan Catalog</h2>
            <p className="text-[11px] text-[#64748B] mt-0.5">
              Catalog plans sell themselves from the website. Enterprise plans are configured per client by the AMSH team.
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="inline-flex items-center gap-1 bg-[#F1F5F9] rounded-lg p-1">
              {(['All', 'Catalog', 'Enterprise'] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setKindFilter(option)}
                  className={`px-2.5 py-0.5 rounded-md text-[11px] font-semibold transition-colors ${
                    kindFilter === option ? 'bg-white text-[#2563EB] shadow-2xs' : 'text-[#475569] hover:text-[#0F172A]'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
            <button
              onClick={() => openCreate('Catalog')}
              className="flex items-center gap-1 px-2.5 py-1 border border-[#2563EB] text-[#2563EB] rounded-lg text-xs font-semibold hover:bg-[#EFF6FF] transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New Catalog Plan
            </button>
            <button
              onClick={() => openCreate('Enterprise')}
              className="flex items-center gap-1 px-2.5 py-1 border border-[#7C3AED] text-[#7C3AED] rounded-lg text-xs font-semibold hover:bg-[#F5F3FF] transition-colors"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New Enterprise Deal
            </button>
          </div>
        </div>

        {/* Dynamic Free & Paid Trial Configuration Card */}
        <div className="m-3 p-4 bg-gradient-to-r from-amber-50/70 via-white to-orange-50/50 border border-amber-200 rounded-xl shadow-2xs space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-100 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center text-amber-800 text-sm font-bold">
                🎁
              </span>
              <div>
                <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  Trial Settings & Promotion Manager
                  <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                    {trialConfig.enabled ? (trialConfig.is_free ? '100% Free Trial' : `Paid Trial ($${trialConfig.price})`) : 'Disabled'}
                  </span>
                </h3>
                <p className="text-[11px] text-gray-500">
                  Control how new clinics experience AMSh: completely free ($0) or nominal commitment fee.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {trialSavedMsg && (
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 animate-in fade-in">
                  {trialSavedMsg}
                </span>
              )}
              <button
                type="button"
                onClick={handleSaveTrial}
                disabled={trialSaving}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
              >
                {trialSaving ? 'Saving...' : 'Save Trial Settings'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {/* Enable Trial Toggle */}
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Trial Status</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="checkbox"
                  id="admin-trial-enabled"
                  checked={trialConfig.enabled}
                  onChange={(e) => setTrialConfig({ ...trialConfig, enabled: e.target.checked })}
                  className="w-4 h-4 accent-amber-600 cursor-pointer"
                />
                <label htmlFor="admin-trial-enabled" className="text-xs font-semibold text-gray-800 cursor-pointer">
                  {trialConfig.enabled ? 'Active for new clinics' : 'Disabled'}
                </label>
              </div>
            </div>

            {/* Trial Pricing Mode: Free vs Paid */}
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Trial Pricing Mode</label>
              <div className="flex items-center gap-3 mt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="trial-pricing-mode"
                    checked={trialConfig.is_free}
                    onChange={() => setTrialConfig({ ...trialConfig, is_free: true, price: 0 })}
                    className="accent-amber-600"
                  />
                  <span className="font-semibold text-gray-800 text-[11px]">Free ($0)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="trial-pricing-mode"
                    checked={!trialConfig.is_free}
                    onChange={() => setTrialConfig({ ...trialConfig, is_free: false, price: trialConfig.price || 1.0 })}
                    className="accent-amber-600"
                  />
                  <span className="font-semibold text-gray-800 text-[11px]">Paid Fee</span>
                </label>
              </div>
              {!trialConfig.is_free && (
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-xs text-gray-500 font-bold">$</span>
                  <input
                    type="number"
                    min={0.5}
                    step={0.5}
                    value={trialConfig.price}
                    onChange={(e) => setTrialConfig({ ...trialConfig, price: Number(e.target.value) })}
                    className="w-20 px-2 py-0.5 border border-gray-300 rounded text-xs font-mono font-bold"
                  />
                  <span className="text-[10px] text-gray-500">charge fee</span>
                </div>
              )}
            </div>

            {/* Duration Days */}
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Trial Duration (Days)</label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={trialConfig.duration_days}
                  onChange={(e) => setTrialConfig({ ...trialConfig, duration_days: Number(e.target.value) })}
                  className="w-20 px-2 py-1 border border-gray-300 rounded text-xs font-bold font-mono"
                />
                <span className="text-gray-500 text-[11px]">days access</span>
              </div>
            </div>

            {/* Trial Quotas */}
            <div className="bg-white p-3 rounded-lg border border-gray-200">
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Included Quotas</label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div>
                  <span className="text-[10px] text-gray-400 block">Voice Mins</span>
                  <input
                    type="number"
                    min={5}
                    value={trialConfig.voice_minutes}
                    onChange={(e) => setTrialConfig({ ...trialConfig, voice_minutes: Number(e.target.value) })}
                    className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs font-bold font-mono"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 block">Messages</span>
                  <input
                    type="number"
                    min={10}
                    value={trialConfig.messages}
                    onChange={(e) => setTrialConfig({ ...trialConfig, messages: Number(e.target.value) })}
                    className="w-full px-1.5 py-0.5 border border-gray-300 rounded text-xs font-bold font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Banner Text Customization */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs bg-white p-3 rounded-lg border border-gray-200">
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">
                Banner Headline <span className="font-normal text-gray-400">(tags: {'{days}'}, {'{days_left}'})</span>
              </label>
              <input
                type="text"
                value={trialConfig.banner_headline}
                onChange={(e) => setTrialConfig({ ...trialConfig, banner_headline: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs font-medium"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Banner Description</label>
              <input
                type="text"
                value={trialConfig.banner_description}
                onChange={(e) => setTrialConfig({ ...trialConfig, banner_description: e.target.value })}
                className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs font-medium"
              />
            </div>
          </div>
        </div>

        {visibleGroups.map((group) => (
          <div key={group.kind}>
            <div className="px-3 pt-3 flex items-center gap-2">
              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${kindStyles[group.kind]}`}>
                {group.kind === 'Catalog' ? 'CATALOG' : 'ENTERPRISE'}
              </span>
              <span className="text-[11px] text-[#64748B]">{group.description}</span>
              <span className="text-[11px] font-semibold text-[#94A3B8] ml-auto">
                {group.plans.length} {group.plans.length === 1 ? 'plan' : 'plans'}
              </span>
            </div>

            {group.plans.length === 0 ? (
              <p className="px-3 py-4 text-xs text-[#94A3B8]">Nothing here yet.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3 p-3">
                {group.plans.map((plan) => (
                  <div
                    key={plan.id}
                    className={`border rounded-lg p-3 flex flex-col gap-2 ${
                      plan.status === 'Archived' ? 'border-[#E2E8F0] bg-[#F8FAFC] opacity-70' : 'border-[#E2E8F0] bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-[#0F172A]">{plan.name}</div>
                        <div className="text-[11px] text-[#64748B]">
                          {plan.customPricing
                            ? `${money(plan.price, plan.currency)} / ${plan.cycle.toLowerCase()} (quoted)`
                            : `${money(plan.price, plan.currency)} / ${plan.cycle.toLowerCase()}`}
                        </div>
                        {plan.client && (
                          <div className="text-[10px] font-semibold text-[#7C3AED] mt-0.5">{plan.client}</div>
                        )}
                      </div>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusStyles[plan.status]}`}>
                        {plan.status}
                      </span>
                    </div>

              <div className="bg-[#F8FAFC] rounded-md p-2 space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#64748B]">Minutes</span>
                  <span className="font-semibold text-[#0F172A]">{amount(plan.quotas.voiceMinutes)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#64748B]">Messages</span>
                  <span className="font-semibold text-[#0F172A]">{amount(plan.quotas.messages)}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#64748B]">Audio storage</span>
                  <span className="font-semibold text-[#0F172A]">{amount(plan.quotas.audioStorageGb, ' GB')}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#64748B]">Vector storage</span>
                  <span className="font-semibold text-[#0F172A]">{amount(plan.quotas.vectorStorageGb, ' GB')}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#64748B]">Conversation history</span>
                  <span className="font-semibold text-[#0F172A]">{amount(plan.quotas.conversationRetentionDays, ' days')}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#64748B]">Concurrent calls</span>
                  <span className="font-semibold text-[#0F172A]">{amount(plan.quotas.concurrentCalls)}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1">
                {plan.features.length === 0 ? (
                  <span className="text-[10px] text-[#94A3B8]">No add-on features</span>
                ) : (
                  <>
                    {plan.features.slice(0, 3).map((key) => (
                      <span key={key} className="px-1.5 py-0.5 rounded bg-[#EFF6FF] text-[#2563EB] text-[10px] font-medium">
                        {FEATURE_CATALOG.find((f) => f.key === key)?.label}
                      </span>
                    ))}
                    {plan.features.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded bg-[#F1F5F9] text-[#475569] text-[10px] font-medium">
                        +{plan.features.length - 3} more
                      </span>
                    )}
                  </>
                )}
              </div>

              <div className="text-[10px] text-[#94A3B8]">
                Overage €{plan.overage.perMinute}/min · €{plan.overage.perMessage}/msg · €{plan.overage.perGb}/GB
              </div>

              <div className="mt-auto pt-2 border-t border-[#E2E8F0] flex items-center justify-between">
                <span className="text-[10px] text-[#64748B]">{plan.subscribers} subscribers</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(plan)}
                    className="px-1.5 py-0.5 text-[10px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF] rounded transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => duplicatePlan(plan)}
                    className="px-1.5 py-0.5 text-[10px] font-semibold text-[#475569] hover:bg-gray-100 rounded transition-colors"
                  >
                    Duplicate
                  </button>
                  <button
                    onClick={() => archivePlan(plan.id)}
                    className="px-1.5 py-0.5 text-[10px] font-semibold text-[#991B1B] hover:bg-[#FEE2E2] rounded transition-colors"
                  >
                    {plan.status === 'Archived' ? 'Restore' : 'Archive'}
                  </button>
                </div>
              </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </section>

      {/* Businesses and the plan each is on */}
      <section className="bg-white border border-[#E2E8F0] rounded-lg shadow-2xs overflow-hidden">
        <div className="p-3 border-b border-[#E2E8F0]">
          <h2 className="text-xs font-bold text-[#0F172A]">Business Subscriptions</h2>
          <p className="text-[11px] text-[#64748B] mt-0.5">Which plan each business is on. Payments and invoices are not recorded yet, so none are shown.</p>
        </div>
        {subs === null ? (
          <p className="p-4 text-xs text-[#94A3B8]">Loading...</p>
        ) : subs.length === 0 ? (
          <p className="p-4 text-xs text-[#94A3B8]">No businesses yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  {['Business', 'Plan', 'Status', 'Plan price', 'Minutes (30 days)'].map((h) => (
                    <th key={h} className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {subs.map((sub) => {
                  const plan = plans.find((p) => p.key.toLowerCase() === sub.plan.toLowerCase());
                  return (
                    <tr key={sub.id} className="hover:bg-[#F8FAFC]/70">
                      <td className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] whitespace-nowrap">{sub.name}</td>
                      <td className="px-3.5 py-2 text-xs text-[#475569] whitespace-nowrap">{plan ? plan.name : `${sub.plan} (no such plan)`}</td>
                      <td className="px-3.5 py-2 text-xs text-[#475569] whitespace-nowrap capitalize">{sub.status}</td>
                      <td className="px-3.5 py-2 text-xs text-[#475569] whitespace-nowrap">
                        {plan ? `${money(plan.price, plan.currency)} / ${plan.cycle.toLowerCase()}${plan.customPricing ? ' (quoted)' : ''}` : '—'}
                      </td>
                      <td className="px-3.5 py-2 text-xs text-[#475569] whitespace-nowrap">{sub.minutes_30d}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {draft && (
        <PlanEditor
          draft={draft}
          isNew={isNew}
          error={error}
          onChange={setDraft}
          onSave={savePlan}
          onClose={closeEditor}
          saving={saving}
        />
      )}
    </div>
  );
}
