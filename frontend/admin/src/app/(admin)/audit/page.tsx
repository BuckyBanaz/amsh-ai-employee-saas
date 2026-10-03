"use client";

import { Fragment, useCallback, useEffect, useState } from 'react';
import { AuditList, downloadAuditCsv, fetchAudit } from '@/lib/api';
import { BTN, Card, Chip, Empty, ErrorBox, INPUT, PageHeader, errorText, label, when } from '@/components/admin/ui';

const RANGES: { id: string; label: string; hours: number | null }[] = [
  { id: '24h', label: 'Last 24 hours', hours: 24 },
  { id: '7d', label: 'Last 7 days', hours: 24 * 7 },
  { id: '30d', label: 'Last 30 days', hours: 24 * 30 },
  { id: 'all', label: 'All time', hours: null },
];
const PAGE = 50;

export default function AuditPage() {
  const [data, setData] = useState<AuditList | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [q, setQ] = useState('');
  const [action, setAction] = useState('');
  const [outcome, setOutcome] = useState('');
  const [range, setRange] = useState('7d');
  const [offset, setOffset] = useState(0);
  const [open, setOpen] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const params = useCallback(() => {
    const hours = RANGES.find((r) => r.id === range)?.hours;
    return { action, outcome, q, since: hours ? new Date(Date.now() - hours * 3600_000).toISOString() : undefined };
  }, [action, outcome, q, range]);

  useEffect(() => {
    let cancelled = false;
    fetchAudit({ ...params(), limit: PAGE, offset })
      .then((d) => { if (!cancelled) { setData(d); setError(''); } })
      .catch((e: unknown) => { if (!cancelled) setError(errorText(e, 'Could not load the audit log')); });
    return () => { cancelled = true; };
  }, [params, offset]);

  const change = (fn: () => void) => { fn(); setOffset(0); };
  async function exportCsv() {
    setBusy(true);
    try { await downloadAuditCsv(params()); } catch (e) { setError(errorText(e, 'Export failed')); } finally { setBusy(false); }
  }

  const total = data?.total ?? 0;
  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <PageHeader title="Audit Logs" subtitle="Who did what, from sign-ins to plan changes. Kept as written; nothing here can be edited.">
        <button className={BTN} onClick={exportCsv} disabled={busy || total === 0}>{busy ? 'Preparing...' : 'Export CSV'}</button>
      </PageHeader>

      <Card className="mb-4 p-3">
        <form className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); change(() => setQ(search.trim())); }}>
          <label className="min-w-[200px] flex-1 text-xs font-medium text-[#475569]">Search
            <input className={`${INPUT} mt-1`} value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Email, IP, action or ID" />
          </label>
          <label className="text-xs font-medium text-[#475569]">Action
            <select className={`${INPUT} mt-1`} value={action} onChange={(e) => change(() => setAction(e.target.value))}>
              <option value="">Everything</option>
              <option value="auth.">Sign-in and passwords</option>
              <option value="admin.">Admin actions</option>
              {(data?.facets.actions ?? []).map((a) => <option key={a} value={a}>{a}</option>)}
            </select>
          </label>
          <label className="text-xs font-medium text-[#475569]">Outcome
            <select className={`${INPUT} mt-1`} value={outcome} onChange={(e) => change(() => setOutcome(e.target.value))}>
              <option value="">Any</option><option value="success">Success</option><option value="failure">Failure</option>
            </select>
          </label>
          <label className="text-xs font-medium text-[#475569]">Period
            <select className={`${INPUT} mt-1`} value={range} onChange={(e) => change(() => setRange(e.target.value))}>
              {RANGES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </label>
          <button type="submit" className={BTN}>Search</button>
        </form>
      </Card>

      {error && <ErrorBox message={error} />}
      {!error && !data && <p className="p-5 text-sm text-[#475569]">Loading audit log...</p>}
      {data && (
        <Card className="overflow-x-auto">
          {data.items.length === 0 ? <Empty>No events match these filters.</Empty> : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead><tr className="border-b border-[#E2E8F0] bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]">
                <th className="px-4 py-2.5">When</th><th className="px-3">Who</th><th className="px-3">Action</th><th className="px-3">Business</th><th className="px-3">IP</th><th className="px-3">Result</th><th className="px-3" />
              </tr></thead>
              <tbody>
                {data.items.map((r) => (
                  <Fragment key={r.id}>
                    <tr className="border-t border-[#F1F5F9] align-top">
                      <td className="whitespace-nowrap px-4 py-2.5 text-[#475569]">{when(r.created_at)}</td>
                      <td className="max-w-[200px] truncate px-3 py-2.5 text-[#1E293B]">{r.actor_email ?? 'System'}</td>
                      <td className="px-3 py-2.5"><span className="font-mono text-xs text-[#0F172A]">{r.action}</span>{r.target_id && <span className="block max-w-[180px] truncate font-mono text-[11px] text-[#94A3B8]">{r.target_type}: {r.target_id}</span>}</td>
                      <td className="max-w-[160px] truncate px-3 py-2.5 text-[#475569]">{r.business_name ?? ''}</td>
                      <td className="px-3 py-2.5 font-mono text-xs text-[#64748B]">{r.ip ?? ''}</td>
                      <td className="px-3 py-2.5"><Chip tone={r.outcome === 'success' ? 'green' : 'red'}>{label(r.outcome)}</Chip></td>
                      <td className="px-3 py-2.5 text-right">{Object.keys(r.meta).length > 0 && <button className="text-xs font-medium text-[#0066FF] hover:underline" aria-expanded={open === r.id} onClick={() => setOpen(open === r.id ? null : r.id)}>{open === r.id ? 'Hide' : 'Details'}</button>}</td>
                    </tr>
                    {open === r.id && <tr className="bg-slate-50"><td colSpan={7} className="px-4 py-3"><pre className="overflow-x-auto font-mono text-[12px] leading-relaxed text-[#1E293B]">{JSON.stringify(r.meta, null, 2)}</pre></td></tr>}
                  </Fragment>
                ))}
              </tbody>
            </table>
          )}
          <div className="flex items-center justify-between border-t border-[#F1F5F9] px-4 py-2.5 text-xs text-[#64748B]">
            <span>{total === 0 ? '0 events' : `${offset + 1}-${Math.min(offset + PAGE, total)} of ${total}`}</span>
            <span className="flex gap-2">
              <button className={BTN} disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - PAGE))}>Newer</button>
              <button className={BTN} disabled={offset + PAGE >= total} onClick={() => setOffset(offset + PAGE)}>Older</button>
            </span>
          </div>
        </Card>
      )}
    </div>
  );
}
