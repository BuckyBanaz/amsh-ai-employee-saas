"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

type PlanStatus = 'Active' | 'Draft' | 'Archived';
type BillingCycle = 'Monthly' | 'Yearly';

/** Catalog plans are self-serve from the website; Enterprise plans are configured per client by the AMSH team. */
type PlanKind = 'Catalog' | 'Enterprise';

type FeatureKey =
  | 'callRecording'
  | 'multiLanguage'
  | 'customVoice'
  | 'apiAccess'
  | 'advancedAnalytics'
  | 'calendarSync'
  | 'paymentsIntegration'
  | 'whatsapp'
  | 'whiteLabel'
  | 'prioritySupport';

interface PlanQuotas {
  voiceMinutes: number;
  messages: number;
  concurrentCalls: number;
  aiTokensMillions: number;
  knowledgeDocs: number;
  audioStorageGb: number;
  vectorStorageGb: number;
  conversationRetentionDays: number;
  seats: number;
}

interface PlanOverage {
  perMinute: number;
  perMessage: number;
  perGb: number;
}

interface Plan {
  id: string;
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
  { key: 'callRecording', label: 'Call Recording', hint: 'Store call audio for playback' },
  { key: 'multiLanguage', label: 'Multi-language AI', hint: 'More than one spoken language' },
  { key: 'customVoice', label: 'Custom Voice Clone', hint: 'Branded TTS voice' },
  { key: 'apiAccess', label: 'API Access', hint: 'Public REST + webhooks' },
  { key: 'advancedAnalytics', label: 'Advanced Analytics', hint: 'Cohorts and exports' },
  { key: 'calendarSync', label: 'Calendar Sync', hint: 'Google / Microsoft calendars' },
  { key: 'paymentsIntegration', label: 'Payments', hint: 'Deposits and prepayments' },
  { key: 'whatsapp', label: 'WhatsApp Channel', hint: 'Messaging on WhatsApp Business' },
  { key: 'whiteLabel', label: 'White Label', hint: 'Remove platform branding' },
  { key: 'prioritySupport', label: 'Priority Support', hint: 'SLA-backed response times' },
];

const initialPlans: Plan[] = [
  {
    id: 'plan-starter',
    name: 'Starter',
    kind: 'Catalog',
    price: 99,
    cycle: 'Monthly',
    status: 'Active',
    customPricing: false,
    subscribers: 28,
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
    overage: { perMinute: 0.22, perMessage: 0.02, perGb: 0.5 },
    features: ['calendarSync'],
  },
  {
    id: 'plan-professional',
    name: 'Professional',
    kind: 'Catalog',
    price: 199,
    cycle: 'Monthly',
    status: 'Active',
    customPricing: false,
    subscribers: 48,
    quotas: {
      voiceMinutes: 2000,
      messages: 5000,
      concurrentCalls: 5,
      aiTokensMillions: 4,
      knowledgeDocs: 250,
      audioStorageGb: 25,
      vectorStorageGb: 5,
      conversationRetentionDays: 90,
      seats: 10,
    },
    overage: { perMinute: 0.18, perMessage: 0.015, perGb: 0.4 },
    features: ['callRecording', 'multiLanguage', 'calendarSync', 'whatsapp', 'advancedAnalytics'],
  },
  {
    id: 'plan-business',
    name: 'Business',
    kind: 'Catalog',
    price: 399,
    cycle: 'Monthly',
    status: 'Active',
    customPricing: false,
    subscribers: 23,
    quotas: {
      voiceMinutes: 6000,
      messages: 20000,
      concurrentCalls: 15,
      aiTokensMillions: 12,
      knowledgeDocs: 1000,
      audioStorageGb: 100,
      vectorStorageGb: 20,
      conversationRetentionDays: 180,
      seats: 25,
    },
    overage: { perMinute: 0.15, perMessage: 0.012, perGb: 0.3 },
    features: [
      'callRecording',
      'multiLanguage',
      'customVoice',
      'apiAccess',
      'advancedAnalytics',
      'calendarSync',
      'paymentsIntegration',
      'whatsapp',
    ],
  },
  {
    id: 'plan-ent-medigroup',
    name: 'Enterprise - MediGroup NL',
    kind: 'Enterprise',
    client: 'MediGroup Netherlands',
    price: 1450,
    cycle: 'Monthly',
    status: 'Active',
    customPricing: true,
    subscribers: 4,
    quotas: {
      voiceMinutes: 25000,
      messages: 100000,
      concurrentCalls: 50,
      aiTokensMillions: 50,
      knowledgeDocs: 5000,
      audioStorageGb: 500,
      vectorStorageGb: 100,
      conversationRetentionDays: 365,
      seats: 100,
    },
    overage: { perMinute: 0.11, perMessage: 0.008, perGb: 0.2 },
    features: FEATURE_CATALOG.map((f) => f.key),
  },
  {
    id: 'plan-ent-nordic',
    name: 'Enterprise - Nordic Wellness',
    kind: 'Enterprise',
    client: 'Nordic Wellness Group',
    price: 2100,
    cycle: 'Yearly',
    status: 'Active',
    customPricing: true,
    subscribers: 6,
    quotas: {
      voiceMinutes: 40000,
      messages: 150000,
      concurrentCalls: 80,
      aiTokensMillions: 75,
      knowledgeDocs: 8000,
      audioStorageGb: 750,
      vectorStorageGb: 150,
      conversationRetentionDays: 730,
      seats: 150,
    },
    overage: { perMinute: 0.09, perMessage: 0.006, perGb: 0.18 },
    features: FEATURE_CATALOG.map((f) => f.key),
  },
];

const revenueTrend = [48, 56, 60, 72, 68, 84, 96];
const revenuePoints = ['M1', 'M2', 'M3', 'M4', 'M5', 'M6', 'M7'];

const kpis = [
  { label: 'MRR', value: '€24,680', change: '+€3,120 growth', tone: 'positive' as const },
  { label: 'ARR', value: '€296,160', change: '€300k target close', tone: 'positive' as const },
  { label: 'Active Subs', value: '109', change: '96% retention rate', tone: 'positive' as const },
  { label: 'Trials', value: '14', change: '+2 this week', tone: 'positive' as const },
  { label: 'Churn Rate', value: '2.1%', change: '-0.4% from Jan', tone: 'positive' as const },
  { label: 'Failed Payments', value: '3', change: '€420 pending dunning', tone: 'negative' as const },
];

const tenantSubscriptions = [
  { id: 't-1', tenant: 'Smile Dental Business', plan: 'Professional', status: 'Active', price: '€199', usage: 78, renewal: '2026-02-12' },
  { id: 't-2', tenant: 'Amsterdam Dental Care', plan: 'Business', status: 'Active', price: '€399', usage: 92, renewal: '2026-02-15' },
  { id: 't-3', tenant: 'Berlin Health Center', plan: 'Starter', status: 'Suspended', price: '€99', usage: 12, renewal: '2026-01-30' },
  { id: 't-4', tenant: 'Bella Rosa Ristorante', plan: 'Professional', status: 'Active', price: '€199', usage: 45, renewal: '2026-03-01' },
  { id: 't-5', tenant: 'Paris Dental Studio', plan: 'Trial', status: 'Trial', price: '€0', usage: 60, renewal: '2026-02-20' },
];

const invoices = [
  { id: 'INV-2026-001', tenant: 'Smile Dental Business', amount: '€199.00', status: 'Paid', date: 'Jan 12, 2026' },
  { id: 'INV-2026-002', tenant: 'Amsterdam Dental Care', amount: '€399.00', status: 'Paid', date: 'Jan 15, 2026' },
  { id: 'INV-2026-003', tenant: 'Bella Rosa Ristorante', amount: '€199.00', status: 'Pending', date: 'Jan 22, 2026' },
  { id: 'INV-2026-004', tenant: 'Berlin Health Center', amount: '€99.00', status: 'Failed', date: 'Jan 10, 2026' },
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
const money = (value: number) => `€${value.toLocaleString('en-US')}`;

const numberInputClass =
  'w-full px-2.5 py-1.5 bg-white border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]';

interface PlanEditorProps {
  draft: Plan;
  isNew: boolean;
  onChange: (plan: Plan) => void;
  onSave: () => void;
  onClose: () => void;
  error: string | null;
}

function PlanEditor({ draft, isNew, onChange, onSave, onClose, error }: PlanEditorProps) {
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

  const setQuota = (key: keyof PlanQuotas, value: number) =>
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
                <span className="text-[12px] font-semibold text-[#475569]">Price (€)</span>
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
                    value={draft.quotas[field.key]}
                    onChange={(e) => setQuota(field.key, Number(e.target.value))}
                    className={`${numberInputClass} mt-1`}
                  />
                  <span className="text-[11px] text-[#94A3B8] block mt-1">
                    {field.unit} · {field.hint}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-3">Overage Rates</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <label className="block">
                <span className="text-[12px] font-semibold text-[#475569]">Per extra minute (€)</span>
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
                <span className="text-[12px] font-semibold text-[#475569]">Per extra message (€)</span>
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
                <span className="text-[12px] font-semibold text-[#475569]">Per extra GB (€)</span>
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
            className="px-3.5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-[13px] font-semibold transition-colors"
          >
            {isNew ? 'Create Plan' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Plan[]>(initialPlans);
  const [draft, setDraft] = useState<Plan | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [kindFilter, setKindFilter] = useState<'All' | PlanKind>('All');

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

  const barMax = Math.max(...revenueTrend);

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

  const savePlan = () => {
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

    setPlans((current) =>
      isNew
        ? [...current, { ...next, id: `plan-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}` }]
        : current.map((plan) => (plan.id === next.id ? next : plan))
    );
    closeEditor();
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

  const archivePlan = (id: string) => {
    setPlans((current) =>
      current.map((plan) =>
        plan.id === id ? { ...plan, status: plan.status === 'Archived' ? 'Active' : 'Archived' } : plan
      )
    );
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

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5 mb-3.5">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 sm:p-3 shadow-2xs">
            <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">{kpi.label}</div>
            <div className="text-lg font-bold text-[#0F172A] leading-none mb-1.5">{kpi.value}</div>
            <div className={`text-[11px] font-semibold ${kpi.tone === 'positive' ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
              {kpi.change}
            </div>
          </div>
        ))}
      </div>

      {/* Revenue trend + plan distribution */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-3.5 mb-3.5">
        <section className="xl:col-span-2 bg-white border border-[#E2E8F0] rounded-lg p-3.5 shadow-2xs">
          <h2 className="text-xs font-bold text-[#0F172A] mb-3">Monthly Revenue Trend (YTD)</h2>
          <div className="flex items-end justify-between gap-2.5 h-[120px]">
            {revenueTrend.map((value, index) => (
              <div key={revenuePoints[index]} className="flex-1 flex flex-col items-center justify-end gap-1.5 h-full">
                <div className="w-7 bg-[#2563EB] rounded-t-md" style={{ height: `${(value / barMax) * 100}%` }} />
                <span className="text-[10px] text-[#94A3B8]">{revenuePoints[index]}</span>
              </div>
            ))}
          </div>
        </section>

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
                      {plan.name} ({plan.customPricing ? 'Quoted' : `${money(plan.price)}/mo`})
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
                            ? `${money(plan.price)} / ${plan.cycle.toLowerCase()} (quoted)`
                            : `${money(plan.price)} / ${plan.cycle.toLowerCase()}`}
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
                  <span className="font-semibold text-[#0F172A]">{plan.quotas.voiceMinutes.toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#64748B]">Messages</span>
                  <span className="font-semibold text-[#0F172A]">{plan.quotas.messages.toLocaleString('en-US')}</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#64748B]">Audio storage</span>
                  <span className="font-semibold text-[#0F172A]">{plan.quotas.audioStorageGb} GB</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#64748B]">Vector storage</span>
                  <span className="font-semibold text-[#0F172A]">{plan.quotas.vectorStorageGb} GB</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#64748B]">Conversation history</span>
                  <span className="font-semibold text-[#0F172A]">{plan.quotas.conversationRetentionDays} days</span>
                </div>
                <div className="flex justify-between text-[11px]">
                  <span className="text-[#64748B]">Concurrent calls</span>
                  <span className="font-semibold text-[#0F172A]">{plan.quotas.concurrentCalls}</span>
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

      {/* Tenant subscriptions */}
      <section className="bg-white border border-[#E2E8F0] rounded-lg shadow-2xs overflow-hidden mb-3.5">
        <div className="p-3 border-b border-[#E2E8F0]">
          <h2 className="text-xs font-bold text-[#0F172A]">Tenant Subscriptions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Tenant</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Plan</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Status</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Price</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider w-[140px]">Quota Usage</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Renewal</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {tenantSubscriptions.map((sub) => (
                <tr key={sub.id} className="hover:bg-[#F8FAFC]/70 transition-colors">
                  <td className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] whitespace-nowrap">{sub.tenant}</td>
                  <td className="px-3.5 py-2 text-xs text-[#475569] whitespace-nowrap">{sub.plan}</td>
                  <td className="px-3.5 py-2 whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusStyles[sub.status]}`}>
                      {sub.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] whitespace-nowrap">{sub.price}</td>
                  <td className="px-3.5 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-16 h-1 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            sub.usage >= 90 ? 'bg-[#EF4444]' : sub.usage >= 70 ? 'bg-[#F59E0B]' : 'bg-[#2563EB]'
                          }`}
                          style={{ width: `${sub.usage}%` }}
                        />
                      </div>
                      <span className="text-[10px] text-[#94A3B8]">{sub.usage}%</span>
                    </div>
                  </td>
                  <td className="px-3.5 py-2 text-xs text-[#475569] whitespace-nowrap">{sub.renewal}</td>
                  <td className="px-3.5 py-2 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <button className="text-xs font-semibold text-[#2563EB] hover:underline">Manage</button>
                      <button className="text-xs font-semibold text-[#475569] hover:underline">Invoice</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Invoices */}
      <section className="bg-white border border-[#E2E8F0] rounded-lg shadow-2xs overflow-hidden">
        <div className="p-3 border-b border-[#E2E8F0]">
          <h2 className="text-xs font-bold text-[#0F172A]">Recent Invoices</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Tenant</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Invoice #</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Amount</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Status</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="hover:bg-[#F8FAFC]/70 transition-colors">
                  <td className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] whitespace-nowrap">{invoice.tenant}</td>
                  <td className="px-3.5 py-2 text-xs text-[#475569] whitespace-nowrap">{invoice.id}</td>
                  <td className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] whitespace-nowrap">{invoice.amount}</td>
                  <td className="px-3.5 py-2 whitespace-nowrap">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusStyles[invoice.status]}`}>
                      {invoice.status}
                    </span>
                  </td>
                  <td className="px-3.5 py-2 text-xs text-[#475569] whitespace-nowrap">{invoice.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {draft && (
        <PlanEditor
          draft={draft}
          isNew={isNew}
          error={error}
          onChange={setDraft}
          onSave={savePlan}
          onClose={closeEditor}
        />
      )}
    </div>
  );
}
