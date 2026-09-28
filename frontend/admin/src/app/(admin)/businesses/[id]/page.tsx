"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { fetchTenant, fetchTenantSection, TenantDetail } from '../../../../lib/api';
import { TenantActionDialog, TenantAction } from '../../../../components/admin/TenantActionDialog';

// ---- helpers ----------------------------------------------------------------------------------------------------------

const STATUS_STYLES: Record<string, string> = {
  active: 'bg-[#D1FAE5] text-[#065F46]',
  pending: 'bg-[#FEF3C7] text-[#92400E]',
  suspended: 'bg-[#FEE2E2] text-[#991B1B]',
  paused: 'bg-[#E2E8F0] text-[#334155]',
};
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const when = (iso: string | null | undefined) => (iso ? new Date(iso).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' }) : '—');
const dash = (v: string | number | null | undefined) => (v === null || v === undefined || v === '' ? '—' : String(v));
const pill = (text: string, style = 'bg-[#F1F5F9] text-[#475569]') => (
  <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${style}`}>{text}</span>
);

interface UserRow { id: string; name: string; email: string; role: string; is_active: boolean; email_verified: boolean; last_active_at: string | null }
interface AgentRow { id: string; name: string; status: string; is_primary: boolean; voice_provider: string; voice_model: string; primary_language: string; languages: string[]; engine: string | null; recording: boolean; transfer_phone: string | null; greeting_message: string }
interface AppointmentRow { id: string; patient: string | null; phone: string | null; service: string | null; doctor: string | null; date: string | null; time: string | null; status: string; booked_on_call: boolean }
interface CallRow { id: string; channel: string; caller_number: string; caller_name: string | null; intent: string | null; outcome: string; sentiment: string | null; duration_seconds: number; summary: string | null; has_recording: boolean; started_at: string | null }
interface ServiceRow { id: string; title: string; duration_minutes: number; price: number | null; currency: string }
interface KnowledgeRow { id: string; type: string; status: string; title: string; uploaded_at: string | null }
interface IntegrationRow { id: string; provider: string; status: string; connected_at: string | null; details: Record<string, string> }
interface ActivityRow { id: string; at: string | null; action: string; actor: string | null; outcome: string; target: string; details: Record<string, unknown> }

interface Column<T> {
  label: string;
  render: (row: T) => React.ReactNode;
}

/** One tab: loads its rows from `/admin/tenants/{id}/{section}` when first shown. State is only set in the response callbacks. */
function DataTab<T extends { id: string }>({ businessId, section, columns, empty }: { businessId: string; section: string; columns: Column<T>[]; empty: string }) {
  const [result, setResult] = useState<{ key: string; rows?: T[]; error?: string } | null>(null);
  const key = `${businessId}/${section}`;

  useEffect(() => {
    let cancelled = false;
    fetchTenantSection<T>(businessId, section)
      .then((res) => {
        if (!cancelled) setResult({ key, rows: res.items });
      })
      .catch((err: unknown) => {
        if (!cancelled) setResult({ key, error: err instanceof Error ? err.message : 'Could not load this section.' });
      });
    return () => {
      cancelled = true;
    };
  }, [businessId, section, key]);

  if (!result || result.key !== key) return <p className="p-4 text-xs text-[#94A3B8]">Loading...</p>;
  if (result.error) return <p role="alert" className="p-4 text-xs text-red-600">{result.error}</p>;
  const rows = result.rows ?? [];
  if (rows.length === 0) return <p className="p-4 text-xs text-[#94A3B8]">{empty}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
            {columns.map((c) => (
              <th key={c.label} className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">{c.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E2E8F0]">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-[#F8FAFC]/70">
              {columns.map((c) => (
                <td key={c.label} className="px-3.5 py-2 text-xs text-[#475569] align-top">{c.render(row)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const TABS = ['Overview', 'Users', 'AI Receptionist', 'Appointments', 'Calls', 'Services', 'Knowledge Base', 'Integrations', 'Activity'] as const;
type Tab = (typeof TABS)[number];

// ---- page -------------------------------------------------------------------------------------------------------------

export default function BusinessDetailPage() {
  const params = useParams<{ id: string }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const [tab, setTab] = useState<Tab>('Overview');
  const [reload, setReload] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; tenant?: TenantDetail; error?: string } | null>(null);
  const [action, setAction] = useState<TenantAction | null>(null);
  const [notice, setNotice] = useState('');
  const key = `${id}#${reload}`;

  useEffect(() => {
    let cancelled = false;
    fetchTenant(id)
      .then((tenant) => {
        if (!cancelled) setLoaded({ key, tenant });
      })
      .catch((err: unknown) => {
        if (!cancelled) setLoaded({ key, error: err instanceof Error ? err.message : 'Could not load this business.' });
      });
    return () => {
      cancelled = true;
    };
  }, [id, key]);

  const tenant = loaded?.tenant;

  if (!loaded && !tenant) return <div className="flex-1 p-6 text-xs text-[#94A3B8]">Loading business...</div>;
  if (!tenant) {
    return (
      <div className="flex-1 p-6 space-y-2">
        <p role="alert" className="text-xs text-red-600">{loaded?.error}</p>
        <Link href="/businesses" className="text-xs font-semibold text-[#2563EB] hover:underline">Back to businesses</Link>
      </div>
    );
  }

  const info: [string, string][] = [
    ['Type', tenant.type],
    ['Owner', tenant.owner_name ? `${tenant.owner_name} (${tenant.owner_email})` : '—'],
    ['Country', dash(tenant.country)],
    ['City', dash(tenant.city)],
    ['Address', dash(tenant.address)],
    ['Phone', dash(tenant.phone)],
    ['Email', dash(tenant.email)],
    ['Website', dash(tenant.website)],
    ['Time zone', tenant.timezone],
    ['Signed up', when(tenant.created_at)],
  ];
  const stats: [string, string][] = [
    ['Calls (30 days)', String(tenant.calls_30d)],
    ['Minutes (30 days)', String(tenant.minutes_30d)],
    ['Calls in total', String(tenant.totals.calls)],
    ['Appointments', String(tenant.totals.appointments)],
    ['Users', String(tenant.users_count)],
    ['Last call', when(tenant.last_call_at)],
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <div className="mb-3 text-[11px] text-[#94A3B8]">
        <Link href="/businesses" className="hover:text-[#2563EB]">Businesses</Link> / <span className="text-[#475569]">{tenant.name}</span>
      </div>

      <header className="mb-4 pb-3 border-b border-[#E2E8F0] flex flex-wrap justify-between items-start gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-[#0F172A] tracking-tight leading-tight">{tenant.name}</h1>
            {pill(capital(tenant.status), STATUS_STYLES[tenant.status] ?? STATUS_STYLES.paused)}
            {pill(`${tenant.plan} plan`)}
          </div>
          <p className="text-[11px] text-[#94A3B8] mt-1">Business ID {tenant.id}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAction('plan')} className="px-3 py-1.5 text-xs font-semibold text-[#475569] border border-[#E2E8F0] bg-white rounded-md hover:bg-[#F8FAFC]">Change plan</button>
          {tenant.status === 'suspended' ? (
            <button onClick={() => setAction('reactivate')} className="px-3 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-md">Reactivate</button>
          ) : (
            <button onClick={() => setAction('suspend')} className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-md">Suspend</button>
          )}
        </div>
      </header>

      {notice && (
        <div role="status" className="mb-3 flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="font-semibold hover:underline">Dismiss</button>
        </div>
      )}

      <div className="flex flex-wrap gap-1 mb-3" role="tablist">
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${tab === t ? 'bg-[#2563EB] text-white' : 'bg-white border border-[#E2E8F0] text-[#475569] hover:bg-[#F8FAFC]'}`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-2xs overflow-hidden">
        {tab === 'Overview' && (
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
              {stats.map(([label, value]) => (
                <div key={label} className="border border-[#E2E8F0] rounded-lg p-2.5">
                  <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">{label}</div>
                  <div className="text-sm font-bold text-[#0F172A]">{value}</div>
                </div>
              ))}
            </div>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
              {info.map(([label, value]) => (
                <div key={label} className="flex gap-3 text-xs">
                  <dt className="w-24 shrink-0 text-[#94A3B8]">{label}</dt>
                  <dd className="text-[#0F172A] break-words min-w-0">{value}</dd>
                </div>
              ))}
            </dl>
            <div>
              <h3 className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1.5">AI receptionist</h3>
              {tenant.agents.length === 0 ? (
                <p className="text-xs text-[#94A3B8]">Not set up yet.</p>
              ) : (
                <ul className="text-xs text-[#475569] space-y-1">
                  {tenant.agents.map((a, i) => (
                    <li key={a.id}>{a.name} {pill(a.status)} {i === 0 && pill('answers calls', 'bg-[#DBEAFE] text-[#1D4ED8]')}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {tab === 'Users' && (
          <DataTab<UserRow> businessId={id} section="users" empty="This business has no users." columns={[
            { label: 'Name', render: (r) => <span className="font-semibold text-[#0F172A]">{r.name}</span> },
            { label: 'Email', render: (r) => <>{r.email} {!r.email_verified && pill('unverified', 'bg-[#FEF3C7] text-[#92400E]')}</> },
            { label: 'Role', render: (r) => <span className="capitalize">{r.role}</span> },
            { label: 'Status', render: (r) => (r.is_active ? pill('Active', STATUS_STYLES.active) : pill('Invited', STATUS_STYLES.pending)) },
            { label: 'Last active', render: (r) => when(r.last_active_at) },
          ]} />
        )}

        {tab === 'AI Receptionist' && (
          <DataTab<AgentRow> businessId={id} section="agents" empty="No AI receptionist has been created." columns={[
            { label: 'Name', render: (r) => <>{r.name} {r.is_primary && pill('answers calls', 'bg-[#DBEAFE] text-[#1D4ED8]')}</> },
            { label: 'Status', render: (r) => pill(r.status) },
            { label: 'Languages', render: (r) => (r.languages.length ? r.languages.join(', ') : r.primary_language) },
            { label: 'Voice', render: (r) => `${r.voice_provider} / ${r.voice_model}` },
            { label: 'Engine', render: (r) => dash(r.engine) },
            { label: 'Recording', render: (r) => (r.recording ? 'On' : 'Off') },
            { label: 'Transfer to', render: (r) => dash(r.transfer_phone) },
            { label: 'Greeting', render: (r) => <span className="line-clamp-2 max-w-[260px] block">{dash(r.greeting_message)}</span> },
          ]} />
        )}

        {tab === 'Appointments' && (
          <DataTab<AppointmentRow> businessId={id} section="appointments" empty="No appointments yet." columns={[
            { label: 'Patient', render: (r) => <span className="font-semibold text-[#0F172A]">{dash(r.patient)}</span> },
            { label: 'Phone', render: (r) => dash(r.phone) },
            { label: 'Service', render: (r) => dash(r.service) },
            { label: 'Doctor', render: (r) => dash(r.doctor) },
            { label: 'When', render: (r) => `${dash(r.date)} ${r.time ?? ''}` },
            { label: 'Status', render: (r) => <>{pill(capital(r.status))} {r.booked_on_call && pill('booked by AI', 'bg-[#DBEAFE] text-[#1D4ED8]')}</> },
          ]} />
        )}

        {tab === 'Calls' && (
          <DataTab<CallRow> businessId={id} section="calls" empty="No calls yet." columns={[
            { label: 'When', render: (r) => when(r.started_at) },
            { label: 'Channel', render: (r) => capital(r.channel) },
            { label: 'Caller', render: (r) => `${r.caller_name || ''} ${r.caller_number}`.trim() },
            { label: 'Intent', render: (r) => (r.intent ? capital(r.intent) : 'Analysing...') },
            { label: 'Outcome', render: (r) => capital(r.outcome) },
            { label: 'Mood', render: (r) => dash(r.sentiment) },
            { label: 'Duration', render: (r) => `${r.duration_seconds}s` },
            { label: 'Summary', render: (r) => <span className="line-clamp-2 max-w-[280px] block">{dash(r.summary)}</span> },
            { label: 'Audio', render: (r) => (r.has_recording ? 'Yes' : '—') },
          ]} />
        )}

        {tab === 'Services' && (
          <DataTab<ServiceRow> businessId={id} section="services" empty="No services listed." columns={[
            { label: 'Service', render: (r) => <span className="font-semibold text-[#0F172A]">{r.title}</span> },
            { label: 'Duration', render: (r) => `${r.duration_minutes} min` },
            { label: 'Price', render: (r) => (r.price === null ? '—' : `${r.price} ${r.currency}`) },
          ]} />
        )}

        {tab === 'Knowledge Base' && (
          <DataTab<KnowledgeRow> businessId={id} section="knowledge" empty="No knowledge sources yet." columns={[
            { label: 'Source', render: (r) => <span className="text-[#0F172A]">{dash(r.title)}</span> },
            { label: 'Type', render: (r) => capital(r.type) },
            { label: 'Status', render: (r) => pill(capital(r.status)) },
            { label: 'Added', render: (r) => when(r.uploaded_at) },
          ]} />
        )}

        {tab === 'Integrations' && (
          <DataTab<IntegrationRow> businessId={id} section="integrations" empty="No integrations connected." columns={[
            { label: 'Provider', render: (r) => <span className="font-semibold text-[#0F172A] capitalize">{r.provider.replace('_', ' ')}</span> },
            { label: 'Status', render: (r) => pill(capital(r.status), r.status === 'connected' ? STATUS_STYLES.active : undefined) },
            { label: 'Connected', render: (r) => when(r.connected_at) },
            { label: 'Details', render: (r) => (Object.values(r.details).join(' · ') || '—') },
          ]} />
        )}

        {tab === 'Activity' && (
          <DataTab<ActivityRow> businessId={id} section="activity" empty="No recorded activity for this business yet." columns={[
            { label: 'When', render: (r) => when(r.at) },
            { label: 'Action', render: (r) => <span className="font-mono text-[11px] text-[#0F172A]">{r.action}</span> },
            { label: 'By', render: (r) => dash(r.actor) },
            { label: 'Result', render: (r) => pill(capital(r.outcome), r.outcome === 'success' ? STATUS_STYLES.active : STATUS_STYLES.suspended) },
            { label: 'Details', render: (r) => <span className="font-mono text-[10px] break-all">{Object.keys(r.details).length ? JSON.stringify(r.details) : ''}</span> },
          ]} />
        )}
      </div>

      {action && (
        <TenantActionDialog
          tenant={tenant}
          action={action}
          onClose={() => setAction(null)}
          onDone={(message) => {
            setAction(null);
            setNotice(message);
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}
