"use client";

import { useCallback, useEffect, useState } from 'react';
import { AnnouncementBody, AnnouncementItem, createAnnouncement, deleteAnnouncement, fetchAnnouncements, updateAnnouncement } from '@/lib/api';
import { BTN, Card, Chip, Empty, ErrorBox, INPUT, Loading, PRIMARY, PageHeader, Tone, errorText, label, when } from '@/components/admin/ui';

const LEVEL_TONE: Record<string, Tone> = { info: 'blue', feature: 'green', warning: 'amber', critical: 'red' };
const BLANK: AnnouncementBody = { title: '', body: '', level: 'info', status: 'draft', plans: [], business_ids: [], starts_at: null, ends_at: null };
const toLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - new Date(iso).getTimezoneOffset() * 60000).toISOString().slice(0, 16) : '');
const fromLocal = (v: string) => (v ? new Date(v).toISOString() : null);

export default function AnnouncementsPage() {
  const [items, setItems] = useState<AnnouncementItem[] | null>(null);
  const [levels, setLevels] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<{ id: string | null; draft: AnnouncementBody; plans: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const load = useCallback(() => fetchAnnouncements().then((d) => { setItems(d.items); setLevels(d.levels); setError(''); }).catch((e: unknown) => setError(errorText(e, 'Could not load announcements'))), []);
  useEffect(() => { void load(); }, [load]);

  const start = (a?: AnnouncementItem) => { setNote(''); setEditing(a ? { id: a.id, draft: { title: a.title, body: a.body, level: a.level, status: a.status, plans: a.plans, business_ids: a.business_ids, starts_at: a.starts_at, ends_at: a.ends_at }, plans: a.plans.join(', ') } : { id: null, draft: BLANK, plans: '' }); };
  async function save(status: string) {
    if (!editing) return;
    setBusy(true); setError('');
    const body = { ...editing.draft, status, plans: editing.plans.split(',').map((p) => p.trim()).filter(Boolean) };
    try { if (editing.id) await updateAnnouncement(editing.id, body); else await createAnnouncement(body); setEditing(null); setNote(status === 'published' ? 'Published. Clinics see it in their dashboard.' : 'Saved.'); await load(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  async function remove(a: AnnouncementItem) {
    if (!window.confirm(`Delete "${a.title}"? This cannot be undone.`)) return;
    try { await deleteAnnouncement(a.id); await load(); } catch (e) { setError(errorText(e)); }
  }
  const set = (patch: Partial<AnnouncementBody>) => setEditing((x) => (x ? { ...x, draft: { ...x.draft, ...patch } } : x));

  if (!items && error) return <div className="p-5"><ErrorBox message={error} /></div>;
  if (!items) return <Loading what="announcements" />;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <PageHeader title="Announcements" subtitle="Notices shown as a banner in every clinic's dashboard while they are published and inside their dates.">
        {!editing && <button className={PRIMARY} onClick={() => start()}>New announcement</button>}
      </PageHeader>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      {note && <p role="status" className="mb-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{note}</p>}

      {editing && (
        <Card className="mb-4 p-4">
          <h2 className="mb-3 text-sm font-bold text-[#0F172A]">{editing.id ? 'Edit announcement' : 'New announcement'}</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-[#475569] sm:col-span-2">Title<input className={`${INPUT} mt-1`} maxLength={160} value={editing.draft.title} onChange={(e) => set({ title: e.target.value })} /></label>
            <label className="text-xs font-medium text-[#475569] sm:col-span-2">Message<textarea rows={3} maxLength={2000} className={`${INPUT} mt-1`} value={editing.draft.body} onChange={(e) => set({ body: e.target.value })} /></label>
            <label className="text-xs font-medium text-[#475569]">Type<select className={`${INPUT} mt-1`} value={editing.draft.level} onChange={(e) => set({ level: e.target.value })}>{levels.map((l) => <option key={l} value={l}>{label(l)}</option>)}</select></label>
            <label className="text-xs font-medium text-[#475569]">Only these plans (comma separated, empty = everyone)<input className={`${INPUT} mt-1`} value={editing.plans} onChange={(e) => setEditing({ ...editing, plans: e.target.value })} placeholder="starter, growth" /></label>
            <label className="text-xs font-medium text-[#475569]">Show from<input type="datetime-local" className={`${INPUT} mt-1`} value={toLocal(editing.draft.starts_at)} onChange={(e) => set({ starts_at: fromLocal(e.target.value) })} /></label>
            <label className="text-xs font-medium text-[#475569]">Show until<input type="datetime-local" className={`${INPUT} mt-1`} value={toLocal(editing.draft.ends_at)} onChange={(e) => set({ ends_at: fromLocal(e.target.value) })} /></label>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-[#F1F5F9] pt-3">
            <button className={PRIMARY} disabled={busy || editing.draft.title.trim().length < 3} onClick={() => save('published')}>Publish</button>
            <button className={BTN} disabled={busy || editing.draft.title.trim().length < 3} onClick={() => save('draft')}>Save as draft</button>
            <button className={BTN} disabled={busy} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </Card>
      )}

      <Card className="overflow-x-auto">
        {items.length === 0 ? <Empty>No announcements yet.</Empty> : (
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead><tr className="border-b border-[#E2E8F0] bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"><th className="px-4 py-2.5">Announcement</th><th className="px-3">Type</th><th className="px-3">Status</th><th className="px-3">Audience</th><th className="px-3">Dates</th><th className="px-3" /></tr></thead>
            <tbody>
              {items.map((a) => (
                <tr key={a.id} className="border-t border-[#F1F5F9] align-top">
                  <td className="max-w-[320px] px-4 py-2.5"><p className="font-medium text-[#0F172A]">{a.title}</p><p className="line-clamp-2 text-xs text-[#64748B]">{a.body}</p></td>
                  <td className="px-3 py-2.5"><Chip tone={LEVEL_TONE[a.level]}>{a.level}</Chip></td>
                  <td className="px-3 py-2.5"><Chip tone={a.live ? 'green' : a.status === 'published' ? 'amber' : 'grey'}>{a.live ? 'Live' : a.status === 'published' ? 'Scheduled or ended' : a.status}</Chip></td>
                  <td className="px-3 py-2.5 text-xs text-[#475569]">{a.plans.length || a.business_ids.length ? [...a.plans, ...(a.business_ids.length ? [`${a.business_ids.length} clinic(s)`] : [])].join(', ') : 'Everyone'}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-xs text-[#64748B]">{a.starts_at ? `from ${when(a.starts_at)}` : 'now'}{a.ends_at ? `, until ${when(a.ends_at)}` : ''}</td>
                  <td className="px-3 py-2.5 text-right"><span className="inline-flex gap-2"><button className={BTN} onClick={() => start(a)}>Edit</button><button className={BTN} onClick={() => remove(a)}>Delete</button></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
