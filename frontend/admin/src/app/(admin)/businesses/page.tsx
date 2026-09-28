"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { fetchPlans, fetchTenants, updateTenant, PlanApi, TenantItem, TenantList } from '../../../lib/api';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  active: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
  pending: { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]' },
  suspended: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' },
  paused: { bg: 'bg-[#E2E8F0]', text: 'text-[#334155]' },
};
const TYPE_PALETTE = [
  { bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]' },
  { bg: 'bg-[#EDE9FE]', text: 'text-[#6D28D9]' },
  { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
  { bg: 'bg-[#FEF3C7]', text: 'text-[#92400E]' },
];
const typeStyle = (type: string) => TYPE_PALETTE[[...type].reduce((n, c) => n + c.charCodeAt(0), 0) % TYPE_PALETTE.length];
const capital = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const selectClass =
  'px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]';

type DialogKind = 'suspend' | 'reactivate' | 'plan';
interface Dialog {
  tenant: TenantItem;
  kind: DialogKind;
}

export default function BusinessesPage() {
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [country, setCountry] = useState('');
  const [plan, setPlan] = useState('');
  const [status, setStatus] = useState('');
  const [type, setType] = useState('');
  const [data, setData] = useState<TenantList | null>(null);
  const [facets, setFacets] = useState<TenantList['facets'] | null>(null);
  const [answeredKey, setAnsweredKey] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [error, setError] = useState('');
  const [menuFor, setMenuFor] = useState<string | null>(null);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [planDraft, setPlanDraft] = useState('');
  const [planOptions, setPlanOptions] = useState<PlanApi[]>([]);
  const [busy, setBusy] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // One request per distinct query. State is only set in the callbacks, after the response arrives.
  const queryKey = JSON.stringify([debounced, status, plan, country, type, reloadKey]);
  const loading = answeredKey !== queryKey;
  const load = () => setReloadKey((k) => k + 1);

  useEffect(() => {
    let cancelled = false;
    fetchTenants({ search: debounced, status, plan, country, type })
      .then((res) => {
        if (cancelled) return;
        setData(res);
        setError('');
        setFacets((prev) => prev ?? res.facets); // dropdown options come from the unfiltered first load
        setAnsweredKey(queryKey);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Could not load businesses.');
        setAnsweredKey(queryKey);
      });
    return () => {
      cancelled = true;
    };
  }, [queryKey, debounced, status, plan, country, type]);

  const hasFilters = !!(search || country || plan || status || type);
  const reset = () => {
    setSearch('');
    setCountry('');
    setPlan('');
    setStatus('');
    setType('');
  };

  const openDialog = (tenant: TenantItem, kind: DialogKind) => {
    setMenuFor(null);
    setDialogError('');
    setPlanDraft(tenant.plan);
    setDialog({ tenant, kind });
    if (kind === 'plan') {
      fetchPlans()
        .then((res) => setPlanOptions(res.items))
        .catch(() => setDialogError('Could not load the plans.'));
    }
  };

  const confirm = async () => {
    if (!dialog) return;
    setBusy(true);
    setDialogError('');
    try {
      const body = dialog.kind === 'plan' ? { plan: planDraft.trim() } : { status: dialog.kind === 'suspend' ? 'suspended' : 'active' };
      await updateTenant(dialog.tenant.id, body);
      setNotice(
        dialog.kind === 'plan'
          ? `${dialog.tenant.name} is now on the ${planDraft.trim()} plan.`
          : dialog.kind === 'suspend'
            ? `${dialog.tenant.name} is suspended. Its phone calls are no longer answered.`
            : `${dialog.tenant.name} is active again.`
      );
      setDialog(null);
      load();
    } catch (err: unknown) {
      setDialogError(err instanceof Error ? err.message : 'Could not save the change.');
    } finally {
      setBusy(false);
    }
  };

  const items = data?.items ?? [];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500" onClick={() => setMenuFor(null)}>
      {/* Header */}
      <header className="mb-4 pb-3 border-b border-[#E2E8F0] flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A] tracking-tight leading-tight">Businesses</h1>
          <p className="text-xs text-[#475569] mt-0.5 font-normal">Manage all businesses using the Amsh platform.</p>
        </div>
      </header>

      {notice && (
        <div role="status" className="mb-3 flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-md px-3 py-2">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="font-semibold hover:underline">Dismiss</button>
        </div>
      )}

      {/* Filter & Action Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 mb-3.5 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-[200px]">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-[#94A3B8]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search name, owner, email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1 bg-[#F8FAFC] border border-[#E2E8F0] rounded-md text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            />
          </div>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className={selectClass} aria-label="Country">
            <option value="">Country: All</option>
            {(facets?.countries ?? []).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={plan} onChange={(e) => setPlan(e.target.value)} className={selectClass} aria-label="Plan">
            <option value="">Plan: All</option>
            {(facets?.plans ?? []).map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={selectClass} aria-label="Status">
            <option value="">Status: All</option>
            {(facets?.statuses ?? []).map((s) => <option key={s} value={s}>{capital(s)}</option>)}
          </select>
          <select value={type} onChange={(e) => setType(e.target.value)} className={selectClass} aria-label="Type">
            <option value="">Type: All</option>
            {(facets?.types ?? []).map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          {hasFilters && (
            <button onClick={reset} className="text-[11px] font-semibold text-[#2563EB] hover:underline px-1">Reset</button>
          )}
        </div>
        {/* Clinics sign themselves up through the tenant app, so there is no "add business" here. */}
        <button
          disabled
          title="Clinics create their own account in the tenant app"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E2E8F0] text-[#94A3B8] rounded-md text-xs font-semibold cursor-not-allowed"
        >
          Add Business
        </button>
      </div>

      {/* Results Count */}
      <div className="mb-2 text-[11px] font-semibold text-[#94A3B8]">
        {data && !error ? (
          <>
            Showing <span className="text-[#0F172A]">{items.length}</span> of {data.total} businesses
            {data.total > items.length && ' (narrow the filters to see the rest)'}
            {loading && ' · updating...'}
          </>
        ) : error ? (
          ''
        ) : (
          'Loading...'
        )}
      </div>

      {/* Businesses Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                {['Business Name', 'Type', 'Owner', 'Country', 'AI Receptionist', 'Plan', 'Usage (30 days)', 'Status', 'Created'].map((h) => (
                  <th key={h} className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
                <th className="px-3.5 py-2 w-8"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {error ? (
                <tr>
                  <td colSpan={10} className="px-3.5 py-8 text-center text-xs text-red-600">
                    {error}{' '}
                    <button onClick={load} className="font-semibold underline">Try again</button>
                  </td>
                </tr>
              ) : loading && !data ? (
                <tr>
                  <td colSpan={10} className="px-3.5 py-8 text-center text-xs text-[#94A3B8]">Loading businesses...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3.5 py-8 text-center text-xs text-[#94A3B8]">
                    {hasFilters ? 'No businesses match your filters.' : 'No businesses have signed up yet.'}
                  </td>
                </tr>
              ) : (
                items.map((b) => {
                  const st = STATUS_STYLES[b.status] ?? STATUS_STYLES.paused;
                  const ty = typeStyle(b.type);
                  return (
                    <tr key={b.id} className="hover:bg-[#F8FAFC]/70 transition-colors">
                      <td className="px-3.5 py-2.5 text-xs font-semibold text-[#0F172A] whitespace-nowrap">
                        <Link href={`/businesses/${b.id}`} className="hover:text-[#2563EB] transition-colors">{b.name}</Link>
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${ty.bg} ${ty.text}`}>{b.type}</span>
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-[#475569] whitespace-nowrap">
                        {b.owner_name || '—'}
                        {b.owner_email && <div className="text-[10px] text-[#94A3B8]">{b.owner_email}</div>}
                      </td>
                      <td className="px-3.5 py-2.5 text-xs text-[#475569] whitespace-nowrap">{b.country || '—'}</td>
                      <td className="px-3.5 py-2.5 text-xs font-medium whitespace-nowrap">
                        {b.ai_receptionist ? (
                          <Link href="/receptionists" className="text-[#2563EB] hover:underline flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></span>
                            {b.ai_receptionist}
                          </Link>
                        ) : (
                          <span className="text-[#94A3B8]">Not set up</span>
                        )}
                      </td>
                      <td className="px-3.5 py-2.5 text-xs font-medium text-[#475569] whitespace-nowrap capitalize">{b.plan}</td>
                      <td className="px-3.5 py-2.5 text-xs text-[#475569] whitespace-nowrap">
                        {b.calls_30d} {b.calls_30d === 1 ? 'call' : 'calls'}
                        <div className="text-[10px] text-[#94A3B8]">{b.minutes_30d} min</div>
                      </td>
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${st.bg} ${st.text}`}>{capital(b.status)}</span>
                      </td>
                      <td className="px-3.5 py-2.5 text-[11px] text-[#94A3B8] whitespace-nowrap">{b.created_at ? b.created_at.slice(0, 10) : '—'}</td>
                      <td className="px-3.5 py-2.5 text-center whitespace-nowrap relative">
                        <button
                          aria-label={`Actions for ${b.name}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuFor(menuFor === b.id ? null : b.id);
                          }}
                          className="p-1 text-[#94A3B8] hover:text-[#0F172A] hover:bg-gray-100 rounded-md transition-colors"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="19" cy="12" r="1"></circle>
                            <circle cx="5" cy="12" r="1"></circle>
                          </svg>
                        </button>
                        {menuFor === b.id && (
                          <div className="absolute right-3 top-8 z-20 w-40 bg-white border border-[#E2E8F0] rounded-md shadow-lg py-1 text-left" onClick={(e) => e.stopPropagation()}>
                            <Link href={`/businesses/${b.id}`} className="block px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F8FAFC]">View details</Link>
                            <button onClick={() => openDialog(b, 'plan')} className="block w-full text-left px-3 py-1.5 text-xs text-[#334155] hover:bg-[#F8FAFC]">Change plan</button>
                            {b.status === 'suspended' ? (
                              <button onClick={() => openDialog(b, 'reactivate')} className="block w-full text-left px-3 py-1.5 text-xs text-emerald-700 hover:bg-[#F8FAFC]">Reactivate</button>
                            ) : (
                              <button onClick={() => openDialog(b, 'suspend')} className="block w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-[#F8FAFC]">Suspend</button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation dialog (an in-page dialog: the browser's confirm() is not reliable inside embedded views) */}
      {dialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true">
          <div className="w-full max-w-sm bg-white rounded-xl border border-[#E2E8F0] shadow-xl p-5 space-y-3">
            <h2 className="text-sm font-bold text-[#0F172A]">
              {dialog.kind === 'plan' ? 'Change plan' : dialog.kind === 'suspend' ? 'Suspend this business?' : 'Reactivate this business?'}
            </h2>
            <p className="text-xs text-[#475569] leading-relaxed">
              {dialog.kind === 'plan' && <>Choose the plan for <strong>{dialog.tenant.name}</strong>. Plans are created under Billing. This is recorded in the audit log.</>}
              {dialog.kind === 'suspend' && <><strong>{dialog.tenant.name}</strong> will stop being answered by the AI: callers hear that the service is unavailable. Its users can still sign in. This is recorded in the audit log.</>}
              {dialog.kind === 'reactivate' && <><strong>{dialog.tenant.name}</strong> will be answered by the AI again. This is recorded in the audit log.</>}
            </p>
            {dialog.kind === 'plan' && (
              <select
                value={planDraft}
                onChange={(e) => setPlanDraft(e.target.value)}
                className="w-full px-3 py-1.5 rounded-md border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
                aria-label="Plan"
              >
                {!planOptions.some((p) => p.key === planDraft) && <option value={planDraft}>{planDraft}</option>}
                {planOptions
                  .filter((p) => p.status === 'active' || p.key === dialog.tenant.plan)
                  .map((p) => (
                    <option key={p.key} value={p.key}>
                      {p.name}{p.kind === 'enterprise' ? ` (enterprise: ${p.client ?? ''})` : ''}{p.status !== 'active' ? ` (${p.status})` : ''}
                    </option>
                  ))}
              </select>
            )}
            {dialogError && <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{dialogError}</div>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setDialog(null)} disabled={busy} className="px-3 py-1.5 text-xs font-semibold text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC]">Cancel</button>
              <button
                onClick={confirm}
                disabled={busy || (dialog.kind === 'plan' && !planDraft.trim())}
                className={`px-3 py-1.5 text-xs font-semibold text-white rounded-md disabled:opacity-60 ${dialog.kind === 'suspend' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#2563EB] hover:bg-blue-700'}`}
              >
                {busy ? 'Saving...' : dialog.kind === 'plan' ? 'Save plan' : dialog.kind === 'suspend' ? 'Suspend' : 'Reactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
