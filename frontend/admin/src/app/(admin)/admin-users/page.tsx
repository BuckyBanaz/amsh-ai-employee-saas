"use client";

import { useCallback, useEffect, useState } from 'react';
import { StaffAccount, createStaff, fetchStaff, sendStaffSetupLink, updateStaff } from '@/lib/api';
import { BTN, Card, Chip, Empty, ErrorBox, INPUT, Loading, PRIMARY, PageHeader, errorText, label, when } from '@/components/admin/ui';

const ROLE_HELP: Record<string, string> = {
  superadmin: 'Everything, including managing staff accounts',
  admin: 'Day-to-day operation of the platform',
  support: 'Works support tickets and looks up businesses',
  analyst: 'Reads reports and analytics',
};

export default function AdminUsersPage() {
  const [items, setItems] = useState<StaffAccount[] | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [me, setMe] = useState('');
  const [error, setError] = useState('');
  const [note, setNote] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'admin' });
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => fetchStaff().then((d) => { setItems(d.items); setRoles(d.roles); setMe(d.me); setError(''); }).catch((e: unknown) => setError(errorText(e, 'Could not load staff accounts'))), []);
  useEffect(() => { void load(); }, [load]);

  async function act(id: string, fn: () => Promise<unknown>, ok: string) {
    setBusy(id); setNote(null);
    try { await fn(); setNote({ ok: true, text: ok }); await load(); } catch (e) { setNote({ ok: false, text: errorText(e) }); } finally { setBusy(null); }
  }
  async function add(e: React.FormEvent) {
    e.preventDefault(); setBusy('new'); setNote(null);
    try {
      const made = await createStaff(form);
      setNote({ ok: true, text: made.setup_email_sent ? `Invitation sent to ${made.email}.` : `Account created for ${made.email}, but the email could not be sent: use "Send setup link" once email is configured.` });
      setForm({ name: '', email: '', role: 'admin' }); setAdding(false); await load();
    } catch (err) { setNote({ ok: false, text: errorText(err) }); } finally { setBusy(null); }
  }

  if (error) return <div className="p-5"><ErrorBox message={error} /></div>;
  if (!items) return <Loading what="staff accounts" />;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <PageHeader title="Admin Users" subtitle="AMSh staff who can sign in to this portal. New people choose their own password from an emailed link.">
        <button className={PRIMARY} onClick={() => setAdding((v) => !v)}>{adding ? 'Cancel' : 'Add admin'}</button>
      </PageHeader>

      {note && <p role="status" className={`mb-3 rounded-md border px-3 py-2 text-sm ${note.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-red-200 bg-red-50 text-red-700'}`}>{note.text}</p>}

      {adding && (
        <Card className="mb-4 p-4">
          <form onSubmit={add} className="grid gap-3 sm:grid-cols-[1fr_1fr_200px_auto] sm:items-end">
            <label className="text-xs font-medium text-[#475569]">Name<input required className={`${INPUT} mt-1`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
            <label className="text-xs font-medium text-[#475569]">Email<input required type="email" className={`${INPUT} mt-1`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
            <label className="text-xs font-medium text-[#475569]">Role
              <select className={`${INPUT} mt-1`} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>{roles.map((r) => <option key={r} value={r}>{label(r)}</option>)}</select>
            </label>
            <button type="submit" className={PRIMARY} disabled={busy === 'new'}>{busy === 'new' ? 'Sending...' : 'Send invitation'}</button>
          </form>
          <p className="mt-2 text-xs text-[#64748B]">{ROLE_HELP[form.role]}.</p>
        </Card>
      )}

      <Card className="overflow-x-auto">
        {items.length === 0 ? <Empty>No staff accounts.</Empty> : (
          <table className="w-full min-w-[680px] text-left text-sm">
            <thead><tr className="border-b border-[#E2E8F0] bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-[#64748B]"><th className="px-4 py-2.5">Person</th><th className="px-3">Role</th><th className="px-3">Status</th><th className="px-3">Last active</th><th className="px-3" /></tr></thead>
            <tbody>
              {items.map((u) => (
                <tr key={u.id} className="border-t border-[#F1F5F9]">
                  <td className="px-4 py-2.5"><p className="font-medium text-[#1E293B]">{u.name}{u.id === me && <span className="ml-2 text-[11px] font-normal text-[#94A3B8]">you</span>}</p><p className="text-xs text-[#64748B]">{u.email}</p></td>
                  <td className="px-3 py-2.5">
                    <select aria-label={`Role for ${u.name}`} className={`${INPUT} !w-36 !py-1 text-xs`} value={u.role} disabled={busy === u.id || u.id === me} onChange={(e) => act(u.id, () => updateStaff(u.id, { role: e.target.value }), `${u.name} is now ${label(e.target.value)}.`)}>
                      {roles.map((r) => <option key={r} value={r}>{label(r)}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2.5"><Chip tone={!u.active ? 'red' : u.verified ? 'green' : 'amber'}>{!u.active ? 'Disabled' : u.verified ? 'Active' : 'Invited'}</Chip></td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-[#64748B]">{when(u.last_active_at)}</td>
                  <td className="px-3 py-2.5 text-right">
                    <span className="inline-flex gap-2">
                      {u.active && <button className={BTN} disabled={busy === u.id} onClick={() => act(u.id, () => sendStaffSetupLink(u.id).then((r) => { if (!r.setup_email_sent) throw new Error('The email could not be sent. Check the email settings under Integrations.'); }), `Setup link sent to ${u.email}.`)}>Send setup link</button>}
                      {u.id !== me && <button className={BTN} disabled={busy === u.id} onClick={() => act(u.id, () => updateStaff(u.id, { is_active: !u.active }), u.active ? `${u.name} can no longer sign in.` : `${u.name} can sign in again.`)}>{u.active ? 'Disable' : 'Enable'}</button>}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
      <p className="mt-3 text-xs text-[#94A3B8]">Roles are recorded and shown. Only super admins can manage staff today; other pages are open to every administrator.</p>
    </div>
  );
}
