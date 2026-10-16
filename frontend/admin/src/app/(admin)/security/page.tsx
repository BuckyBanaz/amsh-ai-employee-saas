"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { SecurityOverview, fetchSecurity } from '@/lib/api';
import { Card, Chip, ErrorBox, Loading, PageHeader, errorText, label, when } from '@/components/admin/ui';

function Stat({ title, value, tone }: { title: string; value: number; tone: 'red' | 'amber' | 'grey' }) {
  const colour = value === 0 ? 'text-[#0F172A]' : tone === 'red' ? 'text-red-600' : tone === 'amber' ? 'text-amber-600' : 'text-[#0F172A]';
  return <Card className="p-3"><p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">{title}</p><p className={`mt-1 text-2xl font-extrabold ${colour}`}>{value}</p></Card>;
}

export default function SecurityPage() {
  const [data, setData] = useState<SecurityOverview | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { fetchSecurity().then(setData).catch((e: unknown) => setError(errorText(e, 'Could not load the security overview'))); }, []);

  if (error) return <div className="p-5"><ErrorBox message={error} /></div>;
  if (!data) return <Loading what="security overview" />;
  const c = data.counters;
  const failing = data.checks.filter((x) => !x.ok);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <PageHeader title="Security" subtitle="Sign-in activity and whether the server is configured safely. Read from the live audit trail and settings; secrets are never shown.">
        <Link href="/audit" className="rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-slate-50">Open audit log</Link>
      </PageHeader>

      <section aria-label="Sign-in activity" className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat title="Failed sign-ins, 24h" value={c.failed_logins_24h} tone="red" />
        <Stat title="Failed sign-ins, 7d" value={c.failed_logins_7d} tone="amber" />
        <Stat title="Lockouts, 24h" value={c.lockouts_24h} tone="red" />
        <Stat title="Lockouts, 7d" value={c.lockouts_7d} tone="amber" />
        <Stat title="Password changes, 7d" value={c.password_changes_7d} tone="grey" />
        <Stat title="Admin actions, 7d" value={c.admin_actions_7d} tone="grey" />
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-bold text-[#0F172A]">Server configuration</h2>
            <Chip tone={failing.length === 0 ? 'green' : 'amber'}>{failing.length === 0 ? 'All checks pass' : `${failing.length} to fix`}</Chip></div>
          <ul className="divide-y divide-[#F1F5F9]">
            {data.checks.map((k) => (
              <li key={k.key} className="flex items-start gap-3 py-2.5">
                <span aria-hidden="true" className={`mt-1 h-2 w-2 shrink-0 rounded-full ${k.ok ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <div className="min-w-0 flex-1"><p className="text-sm text-[#1E293B]">{k.label}</p>{!k.ok && <p className="text-xs text-[#64748B]">{k.fix}</p>}</div>
                <Chip tone={k.ok ? 'green' : 'amber'}>{k.ok ? 'OK' : 'Fix'}</Chip>
              </li>
            ))}
          </ul>
          {data.problems.length > 0 && data.policy.environment === 'production' && <p className="mt-2 text-xs text-red-600">This server is marked production but has unsafe settings.</p>}
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h2 className="mb-2 text-sm font-bold text-[#0F172A]">Where sign-in failures come from (7 days)</h2>
            {data.top_ips.length === 0 && data.top_accounts.length === 0 ? <p className="text-sm text-[#64748B]">No failed sign-ins in the last 7 days.</p> : (
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">IP address</p><ul className="space-y-1">{data.top_ips.map((i) => <li key={i.ip} className="flex justify-between gap-2"><span className="font-mono text-xs">{i.ip}</span><span className="font-semibold text-red-600">{i.failures}</span></li>)}</ul></div>
                <div><p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">Account</p><ul className="space-y-1">{data.top_accounts.map((i) => <li key={i.email} className="flex justify-between gap-2"><span className="truncate text-xs">{i.email}</span><span className="font-semibold text-red-600">{i.failures}</span></li>)}</ul></div>
              </div>
            )}
          </Card>
          <Card className="p-4">
            <div className="mb-2 flex items-center justify-between"><h2 className="text-sm font-bold text-[#0F172A]">Platform administrators</h2><Link href="/admin-users" className="text-xs font-medium text-[#0066FF] hover:underline">Manage</Link></div>
            <ul className="divide-y divide-[#F1F5F9]">
              {data.admins.map((a) => (
                <li key={a.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-2">
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-[#1E293B]">{a.name}</p><p className="truncate text-xs text-[#64748B]">{a.email}</p></div>
                  <Chip tone="blue">{label(a.role)}</Chip>
                  {!a.active && <Chip tone="red">Disabled</Chip>}
                  <span className="text-xs text-[#94A3B8]">{when(a.last_active_at)}</span>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-4 text-sm text-[#475569]">
            <h2 className="mb-2 text-sm font-bold text-[#0F172A]">Policy in force</h2>
            <p>Accounts lock after {data.policy.login_max_failures} failed sign-ins. Sessions last {Math.round(data.policy.token_lifetime_minutes / 60 / 24)} days. Environment: <strong>{data.policy.environment}</strong>.</p>
            <p className="mt-1 text-xs text-[#94A3B8]">Browsers allowed to call the API: {data.policy.cors_origins.join(', ')}</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
