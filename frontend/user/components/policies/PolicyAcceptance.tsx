"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { Markdown } from '../legal/Markdown';
import { PolicyStatus, PoliciesService } from '../../services/policies.service';

interface Props {
  businessId: string;
  /** Called with how many required policies are still not accepted, after every load. */
  onPending?: (pending: number) => void;
  /** Hide the "how your AI follows the rules" card (the dashboard modal only needs the documents). */
  showAi?: boolean;
}

/** What applies to this business: the documents (read, then accept) and a plain statement of what the AI does for the business's region. */
export function PolicyAcceptance({ businessId, onPending, showAi = true }: Props) {
  const [status, setStatus] = useState<PolicyStatus | null>(null);
  const [ticked, setTicked] = useState<Record<string, boolean>>({});
  const [open, setOpen] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => PoliciesService.getStatus(businessId).then((s) => { setStatus(s); onPending?.(s.pending); setError(''); }).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load the policies')), [businessId, onPending]);
  useEffect(() => { void load(); }, [load]);

  if (!status) return error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p> : null;

  const needs = status.items.filter((i) => i.requires_acceptance && !i.accepted);
  const chosen = needs.filter((i) => ticked[i.version_id]);
  const ai = status.ai;

  async function accept() {
    setBusy(true); setError('');
    try { const s = await PoliciesService.accept(businessId, chosen.map((i) => i.version_id)); setStatus(s); onPending?.(s.pending); setTicked({}); } catch (e) { setError(e instanceof Error ? e.message : 'Could not record your acceptance'); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3" data-testid="policy-acceptance">
      {showAi && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-4">
          <h3 className="text-sm font-bold text-gray-900">How your AI follows the rules for {ai.region}</h3>
          <ul className="mt-2 space-y-1 text-xs text-gray-700">
            <li><strong>Privacy framework:</strong> {ai.framework}</li>
            <li><strong>Emergencies:</strong> the AI sends callers to {ai.emergency}, and never gives medical advice.</li>
            <li><strong>Privacy instruction:</strong> {ai.privacy_instruction ? 'built into the AI’s instructions' + (ai.custom_privacy_instruction ? ' (customised by Amsh for your region)' : '') : 'none for this region yet'}.</li>
            <li><strong>Recording:</strong> {ai.recording_on ? <>calls are recorded and the AI says: <em>&ldquo;{ai.recording_notice || 'nothing (no notice is needed in your region)'}&rdquo;</em></> : 'call recording is off, so no notice is needed. If you turn it on, the AI will say a notice first.'}</li>
          </ul>
        </div>
      )}

      {status.items.length === 0 ? (
        <p className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">There are no policies to accept for your region right now.</p>
      ) : (
        <ul className="space-y-2">
          {status.items.map((p) => (
            <li key={p.version_id} className="rounded-xl border border-gray-200 bg-white p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-sm font-bold text-gray-900">{p.title}</span>
                  <span className="ml-2 text-[10px] text-gray-500">version {p.version}</span>
                  {p.summary && !p.accepted && <p className="mt-0.5 text-xs text-amber-800">What changed: {p.summary}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" className="text-xs font-semibold text-[#0066FF] hover:underline" onClick={() => setOpen(open === p.version_id ? null : p.version_id)}>{open === p.version_id ? 'Hide' : 'Read'}</button>
                  {p.accepted ? <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">Accepted</span>
                    : p.requires_acceptance ? (
                      <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-gray-700"><input type="checkbox" checked={!!ticked[p.version_id]} onChange={(e) => setTicked({ ...ticked, [p.version_id]: e.target.checked })} /> I accept</label>
                    ) : <span className="text-[10px] text-gray-500">For your information</span>}
                </div>
              </div>
              {open === p.version_id && <div className="mt-2 max-h-80 overflow-y-auto rounded-lg bg-gray-50 px-4 py-2 text-sm"><Markdown source={p.body} /></div>}
            </li>
          ))}
        </ul>
      )}

      {error && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">{error}</p>}
      {needs.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-gray-600">{needs.length} to accept. Only the business owner or an admin can accept.</p>
          <button type="button" disabled={busy || chosen.length === 0} onClick={accept}
            className="rounded-lg bg-[#0066FF] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#0052cc] disabled:cursor-not-allowed disabled:opacity-50">
            {chosen.length === needs.length ? 'Accept all' : `Accept ${chosen.length || ''}`.trim()}
          </button>
        </div>
      )}
    </div>
  );
}
