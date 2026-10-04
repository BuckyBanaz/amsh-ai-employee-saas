"use client";

import { useCallback, useEffect, useState } from 'react';
import { PolicyRegionView, PolicyRules, fetchPolicyRules, savePolicyRule } from '@/lib/api';
import { BTN, Card, Chip, ErrorBox, INPUT, PRIMARY, errorText } from '@/components/admin/ui';

export function RulesTab({ canEdit }: { canEdit: boolean }) {
  const [data, setData] = useState<PolicyRules | null>(null);
  const [code, setCode] = useState('IN');
  const [clause, setClause] = useState('');
  const [en, setEn] = useState('');
  const [hi, setHi] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const pick = useCallback((d: PolicyRules, c: string) => {
    const saved = d.rules.find((r) => r.scope_region === c && r.scope_vertical === '*')?.data ?? {};
    setClause(saved.compliance_clause ?? ''); setEn(saved.recording_notice?.en ?? ''); setHi(saved.recording_notice?.hi ?? ''); setEnabled(saved.recording_notice_enabled !== false);
  }, []);
  const load = useCallback(() => fetchPolicyRules().then((d) => { setData(d); pick(d, code); setError(''); }).catch((e: unknown) => setError(errorText(e, 'Could not load the AI rules'))), [code, pick]);
  useEffect(() => { void load(); }, [load]);

  async function save(clear = false) {
    setBusy(true); setError(''); setNote('');
    try {
      const d = await savePolicyRule(code, '*', clear ? {} : { compliance_clause: clause, recording_notice: { en, hi }, recording_notice_enabled: enabled });
      setData(d); pick(d, code); setNote(clear ? 'Back to the built-in text for this region.' : 'Saved. New calls and chats use it from now on.');
    } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  if (!data) return error ? <ErrorBox message={error} /> : <p className="p-5 text-sm text-[#475569]">Loading AI rules...</p>;
  const view: PolicyRegionView | undefined = data.regions.find((r) => r.code === code);
  const edited = data.rules.some((r) => r.scope_region === code && r.scope_vertical === '*');

  return (
    <div>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      {note && <p role="status" className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{note}</p>}
      <p className="mb-3 max-w-3xl text-xs text-[#475569]">What the AI does about privacy for each region. The <strong>privacy instruction</strong> is added to the AI&apos;s instructions on every turn; the <strong>recording notice</strong> is spoken at the start of every call from a business that records calls. Leave a field empty to keep the built-in text.</p>
      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Region">
        {data.regions.map((r) => (
          <button key={r.code} role="tab" aria-selected={code === r.code} onClick={() => { setCode(r.code); pick(data, r.code); setNote(''); }}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${code === r.code ? 'border-[#0066FF] bg-[#EFF6FF] text-[#0066FF]' : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]'}`}>
            {r.name}{data.rules.some((x) => x.scope_region === r.code) ? ' •' : ''}
          </button>
        ))}
      </div>
      {view && (
        <div className="grid gap-4 xl:grid-cols-3">
          <Card className="p-4 xl:col-span-2">
            <div className="mb-3 flex flex-wrap items-center gap-2"><h2 className="text-sm font-bold text-[#0F172A]">{view.name}</h2><Chip tone="blue">{view.framework}</Chip><Chip tone="grey">emergency {view.emergency}</Chip>{edited && <Chip tone="green">edited</Chip>}</div>
            <label className="text-xs font-medium text-[#475569]">Privacy instruction for the AI (900 characters at most)
              <textarea className={`${INPUT} mt-1 min-h-[120px]`} maxLength={900} disabled={!canEdit} value={clause} onChange={(e) => setClause(e.target.value)} placeholder={view.built_in_clause} />
            </label>
            <p className="mt-1 text-[10px] text-[#94A3B8]">{clause.length}/900. Emergency numbers come from the region and are not set here.</p>
            <h3 className="mb-1 mt-4 text-xs font-bold text-[#0F172A]">Recording notice</h3>
            <label className="mb-2 flex items-center gap-2 text-xs font-medium text-[#475569]"><input type="checkbox" checked={enabled} disabled={!canEdit} onChange={(e) => setEnabled(e.target.checked)} /> Say a recording notice at the start of calls (turn off only if the law in this region does not need one)</label>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-medium text-[#475569]">English (300 characters at most)<textarea className={`${INPUT} mt-1`} rows={3} maxLength={300} disabled={!canEdit || !enabled} value={en} onChange={(e) => setEn(e.target.value)} placeholder={data.built_in_notice.en} /></label>
              <label className="text-xs font-medium text-[#475569]">Hindi (falls back to English)<textarea className={`${INPUT} mt-1`} rows={3} maxLength={300} disabled={!canEdit || !enabled} value={hi} onChange={(e) => setHi(e.target.value)} placeholder={data.built_in_notice.hi} /></label>
            </div>
            {canEdit ? <div className="mt-4 flex gap-2 border-t border-[#F1F5F9] pt-3"><button className={PRIMARY} disabled={busy} onClick={() => save()}>Save</button><button className={BTN} disabled={busy || !edited} onClick={() => save(true)}>Reset to built-in</button></div> : <p className="mt-3 text-xs text-[#94A3B8]">Only a super admin can change these.</p>}
          </Card>
          <Card className="h-fit p-4">
            <h3 className="mb-2 text-sm font-bold text-[#0F172A]">What the AI uses today</h3>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Privacy instruction</p>
            <p className="mb-3 mt-1 text-xs text-[#0F172A]" data-testid="effective-clause">{view.effective_clause}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Spoken at the start of a recorded call</p>
            <p className="mt-1 text-xs text-[#0F172A]" data-testid="effective-notice">{view.notice_enabled ? view.effective_notice : 'Nothing: the notice is switched off for this region.'}</p>
            <p className="mt-3 text-[10px] text-[#94A3B8]">Clinics that turn recording off never say it. The saved text applies to every vertical in this region; a clinic can test it in the Playground.</p>
          </Card>
        </div>
      )}
    </div>
  );
}
