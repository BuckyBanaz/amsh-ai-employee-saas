"use client";

import { useCallback, useEffect, useState } from 'react';
import {
  PolicyAcceptanceRow, PolicyDetail, PolicyRow, addPolicyStarters, createPolicy, fetchPolicies, fetchPolicy, fetchPolicyAcceptances, publishPolicy, savePolicyDraft, setPolicyArchived,
} from '@/lib/api';
import { BTN, Card, Chip, Empty, ErrorBox, INPUT, PRIMARY, errorText, when } from '@/components/admin/ui';

const scopeText = (region: string, vertical: string) => `${region === '*' ? 'All regions' : region}${vertical === '*' ? '' : ` · ${vertical}`}`;
const BLANK = { key: '', title: '', scope_region: '*', scope_vertical: '*', requires_acceptance: true, body: '' };

export function DocumentsTab({ canEdit }: { canEdit: boolean }) {
  const [rows, setRows] = useState<PolicyRow[] | null>(null);
  const [regions, setRegions] = useState<string[]>(['*']);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const load = useCallback(() => fetchPolicies().then((d) => { setRows(d.items); setRegions(d.regions); setError(''); }).catch((e: unknown) => setError(errorText(e, 'Could not load the policies'))), []);
  useEffect(() => { void load(); }, [load]);

  async function starters() {
    setError(''); setNote('');
    try { const r = await addPolicyStarters(); setRows(r.items); setNote(r.created ? `Added ${r.created} starter draft(s). They are not published: edit them, have a lawyer review them, then publish.` : 'All starter policies already exist.'); } catch (e) { setError(errorText(e)); }
  }

  if (!rows) return error ? <ErrorBox message={error} /> : <p className="p-5 text-sm text-[#475569]">Loading policies...</p>;
  if (openId) return <PolicyEditor id={openId} canEdit={canEdit} regions={regions} onBack={() => { setOpenId(null); void load(); }} />;

  return (
    <div>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      {note && <p role="status" className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{note}</p>}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="max-w-2xl text-xs text-[#475569]">Documents clinics must accept. Each applies by region and vertical (the most specific one wins). A policy only binds anyone once it is <strong>published</strong>; owners accept it when they set up their business, and again whenever a new version asks them to.</p>
        {canEdit && <div className="flex gap-2"><button className={BTN} onClick={starters}>Add starter drafts</button><button className={PRIMARY} onClick={() => setCreating((v) => !v)}>New policy</button></div>}
      </div>
      {creating && <NewPolicyForm regions={regions} onCancel={() => setCreating(false)} onCreated={(id) => { setCreating(false); setOpenId(id); }} />}
      <Card className="overflow-hidden">
        {rows.length === 0 ? <Empty>No policies yet. {canEdit ? 'Add the starter drafts to begin.' : ''}</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead><tr className="border-b border-[#E2E8F0] bg-[#F8FAFC] text-[10px] uppercase tracking-wider text-[#94A3B8]"><th className="px-4 py-2">Policy</th><th className="px-2">Applies to</th><th className="px-2">Published</th><th className="px-2">Accepted by</th><th className="px-4">Status</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="cursor-pointer border-b border-[#F1F5F9] hover:bg-[#F8FAFC]" onClick={() => setOpenId(r.id)}>
                    <td className="px-4 py-2.5"><button className="text-left font-semibold text-[#0F172A] hover:text-[#0066FF]">{r.title}</button><span className="block text-[10px] text-[#94A3B8]">{r.key}{r.requires_acceptance ? ' · must be accepted' : ' · notice only'}</span></td>
                    <td className="px-2 text-[#475569]">{scopeText(r.scope_region, r.scope_vertical)}</td>
                    <td className="px-2 text-[#475569]">{r.published_version ? `v${r.published_version}, ${when(r.published_at)}` : <Chip tone="amber">not published</Chip>}</td>
                    <td className="px-2 text-[#475569]">{r.accepted_count}</td>
                    <td className="px-4">{r.status === 'archived' ? <Chip tone="grey">archived</Chip> : r.has_draft ? <Chip tone="blue">draft pending</Chip> : <Chip tone="green">live</Chip>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function NewPolicyForm({ regions, onCancel, onCreated }: { regions: string[]; onCancel: () => void; onCreated: (id: string) => void }) {
  const [f, setF] = useState(BLANK);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true); setError('');
    try { const d = await createPolicy({ ...f, body: f.body || '# ' + f.title }); onCreated(d.id); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  return (
    <Card className="mb-4 p-4">
      <h2 className="mb-3 text-sm font-bold text-[#0F172A]">New policy</h2>
      {error && <div className="mb-2"><ErrorBox message={error} /></div>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-[#475569]">Title<input className={`${INPUT} mt-1`} value={f.title} onChange={(e) => setF({ ...f, title: e.target.value })} placeholder="Privacy Policy" /></label>
        <label className="text-xs font-medium text-[#475569]">Key (used in links: /legal/&lt;key&gt;)<input className={`${INPUT} mt-1`} value={f.key} onChange={(e) => setF({ ...f, key: e.target.value })} placeholder="privacy" /></label>
        <label className="text-xs font-medium text-[#475569]">Region or framework<select className={`${INPUT} mt-1`} value={f.scope_region} onChange={(e) => setF({ ...f, scope_region: e.target.value })}>{regions.map((r) => <option key={r} value={r}>{r === '*' ? 'All regions' : r}</option>)}</select></label>
        <label className="text-xs font-medium text-[#475569]">Vertical (* for all)<input className={`${INPUT} mt-1`} value={f.scope_vertical} onChange={(e) => setF({ ...f, scope_vertical: e.target.value })} /></label>
        <label className="flex items-center gap-2 text-xs font-medium text-[#475569] sm:col-span-2"><input type="checkbox" checked={f.requires_acceptance} onChange={(e) => setF({ ...f, requires_acceptance: e.target.checked })} /> The business owner must accept it before launching</label>
      </div>
      <div className="mt-3 flex gap-2"><button className={PRIMARY} onClick={create} disabled={busy || !f.title.trim() || !f.key.trim()}>Create draft</button><button className={BTN} onClick={onCancel}>Cancel</button></div>
    </Card>
  );
}

function PolicyEditor({ id, canEdit, onBack }: { id: string; canEdit: boolean; regions: string[]; onBack: () => void }) {
  const [p, setP] = useState<PolicyDetail | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [summary, setSummary] = useState('');
  const [again, setAgain] = useState(true);
  const [accepts, setAccepts] = useState<PolicyAcceptanceRow[] | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const fill = useCallback((d: PolicyDetail) => {
    setP(d); setTitle(d.title);
    const edit = d.versions.find((v) => v.status === 'draft') ?? d.versions[0];
    setBody(edit?.body ?? ''); setSummary(edit?.status === 'draft' ? edit.summary : ''); setAgain(edit?.requires_reacceptance ?? true);
  }, []);
  useEffect(() => { fetchPolicy(id).then(fill).catch((e: unknown) => setError(errorText(e))); fetchPolicyAcceptances(id).then((r) => setAccepts(r.items)).catch(() => setAccepts([])); }, [id, fill]);

  async function run<T extends PolicyDetail>(fn: () => Promise<T>, done: string) {
    setBusy(true); setError(''); setNote('');
    try { const d = await fn(); fill(d); setNote(done); fetchPolicyAcceptances(id).then((r) => setAccepts(r.items)).catch(() => undefined); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  if (!p) return error ? <ErrorBox message={error} /> : <p className="p-5 text-sm text-[#475569]">Loading policy...</p>;

  const published = p.versions.find((v) => v.status === 'published');
  const draft = p.versions.find((v) => v.status === 'draft');
  const dirty = !draft || body !== draft.body || summary !== draft.summary || again !== draft.requires_reacceptance || title !== p.title;
  const archived = p.status === 'archived';

  return (
    <div>
      <button className="mb-3 text-xs font-semibold text-[#0066FF] hover:underline" onClick={onBack}>← All policies</button>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      {note && <p role="status" className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{note}</p>}
      <div className="grid gap-4 xl:grid-cols-3">
        <Card className="p-4 xl:col-span-2">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-sm font-bold text-[#0F172A]">{p.title}</h2>
            <Chip tone="blue">{scopeText(p.scope_region, p.scope_vertical)}</Chip>
            {archived && <Chip tone="grey">archived</Chip>}
            {published ? <Chip tone="green">v{published.version} live</Chip> : <Chip tone="amber">not published</Chip>}
          </div>
          <label className="text-xs font-medium text-[#475569]">Title<input className={`${INPUT} mt-1`} value={title} disabled={!canEdit} onChange={(e) => setTitle(e.target.value)} /></label>
          <label className="mt-3 block text-xs font-medium text-[#475569]">Text (Markdown: # headings, - lists, **bold**, [links](https://...))
            <textarea className={`${INPUT} mt-1 min-h-[320px] font-mono text-xs`} value={body} disabled={!canEdit} onChange={(e) => setBody(e.target.value)} />
          </label>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-[#475569]">What changed (shown to owners who must accept again)<input className={`${INPUT} mt-1`} maxLength={500} value={summary} disabled={!canEdit} onChange={(e) => setSummary(e.target.value)} /></label>
            <label className="flex items-center gap-2 pt-5 text-xs font-medium text-[#475569]"><input type="checkbox" checked={again} disabled={!canEdit} onChange={(e) => setAgain(e.target.checked)} /> People who accepted before must accept this version</label>
          </div>
          {canEdit ? (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-[#F1F5F9] pt-3">
              <button className={BTN} disabled={busy || !dirty || archived} onClick={() => run(() => savePolicyDraft(p.id, { title, body, summary, requires_reacceptance: again }), 'Draft saved. Nothing changes for clinics until you publish.')}>Save draft</button>
              <button className={PRIMARY} disabled={busy || archived || (!draft && !dirty)} onClick={() => {
                if (!window.confirm(`Publish "${title}"? ${again ? 'Owners will be asked to accept it again.' : 'Owners who accepted before are not asked again.'} This cannot be undone (you can publish a newer version).`)) return;
                void run(async () => { if (dirty) await savePolicyDraft(p.id, { title, body, summary, requires_reacceptance: again }); return publishPolicy(p.id); }, 'Published.');
              }}>{published ? 'Publish new version' : 'Publish'}</button>
              <button className={BTN} disabled={busy} onClick={() => run(() => setPolicyArchived(p.id, !archived), archived ? 'Restored.' : 'Archived: it no longer applies to anyone. Past acceptances are kept.')}>{archived ? 'Restore' : 'Archive'}</button>
            </div>
          ) : <p className="mt-3 text-xs text-[#94A3B8]">Only a super admin can change or publish policies.</p>}
        </Card>

        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-bold text-[#0F172A]">Versions</h3>
            <ul className="space-y-2 text-xs">
              {p.versions.map((v) => (
                <li key={v.id} className="rounded-md border border-[#E2E8F0] p-2">
                  <div className="flex items-center justify-between"><span className="font-semibold text-[#0F172A]">v{v.version}</span><Chip tone={v.status === 'published' ? 'green' : v.status === 'draft' ? 'blue' : 'grey'}>{v.status}</Chip></div>
                  <p className="mt-1 text-[#475569]">{v.summary || 'No summary'}</p>
                  <p className="mt-0.5 text-[10px] text-[#94A3B8]">{v.published_at ? `Published ${when(v.published_at)}` : `Created ${when(v.created_at)}`} · accepted {v.accepted_count}×</p>
                </li>
              ))}
            </ul>
          </Card>
          <Card className="p-4">
            <h3 className="mb-2 text-sm font-bold text-[#0F172A]">Who accepted</h3>
            {!accepts ? <p className="text-xs text-[#94A3B8]">Loading…</p> : accepts.length === 0 ? <p className="text-xs text-[#94A3B8]">Nobody yet.</p> : (
              <ul className="max-h-72 space-y-1.5 overflow-y-auto text-xs">
                {accepts.map((a) => <li key={a.id} className="border-b border-[#F1F5F9] pb-1.5"><span className="font-medium text-[#0F172A]">{a.email}</span> <span className="text-[#475569]">v{a.version}{a.business ? ` · ${a.business}` : ' · at sign-up'}</span><span className="block text-[10px] text-[#94A3B8]">{when(a.accepted_at)}{a.ip ? ` · ${a.ip}` : ''}</span></li>)}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
