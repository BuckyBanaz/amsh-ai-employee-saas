"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { VerticalController } from '../../controllers/vertical.controller';
import type { Department } from '../../verticals/types';
import { DataState, Field, PrimaryButton, SecondaryButton, StatusChip, inputClass } from './PageBits';

type Draft = { id?: string; name: string; transfer_phone: string; intents: string; fallback_key: string; priority: number; timeout_seconds: number; may_answer: boolean; active: boolean };
const EMPTY: Draft = { name: '', transfer_phone: '', intents: '', fallback_key: '', priority: 50, timeout_seconds: 20, may_answer: true, active: true };

/** The tenant's department directory: where each kind of call is transferred, and what is tried when nobody answers.
 * Numbers are entered by the business (never invented); a department without one gets callbacks instead of transfers. */
export function DepartmentsManager({ compact = false }: { compact?: boolean }) {
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await VerticalController.departments());
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load departments');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const seed = async () => {
    setSaving(true);
    try {
      await VerticalController.departmentsFromTemplate();
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not add the suggested departments');
    } finally {
      setSaving(false);
    }
  };

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    setFormError(null);
    const body = {
      name: draft.name.trim(),
      transfer_phone: draft.transfer_phone.trim() || null,
      intents: draft.intents.split(',').map((s) => s.trim()).filter(Boolean),
      fallback_key: draft.fallback_key || null,
      priority: Number(draft.priority),
      timeout_seconds: Number(draft.timeout_seconds),
      may_answer: draft.may_answer,
      active: draft.active,
    };
    try {
      if (draft.id) await VerticalController.updateDepartment(draft.id, body);
      else await VerticalController.createDepartment(body);
      setDraft(null);
      await load();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (d: Department) => {
    if (!window.confirm(`Remove ${d.name}? Calls will no longer be transferred there.`)) return;
    try {
      await VerticalController.deleteDepartment(d.id);
      await load();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not remove');
    }
  };

  const edit = (d: Department) =>
    setDraft({ id: d.id, name: d.name, transfer_phone: d.transfer_phone || '', intents: d.intents.join(', '), fallback_key: d.fallback_key || '',
               priority: d.priority, timeout_seconds: d.timeout_seconds, may_answer: d.may_answer, active: d.active });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <PrimaryButton onClick={() => { setDraft({ ...EMPTY }); setFormError(null); }} disabled={saving}>Add department</PrimaryButton>
        <SecondaryButton onClick={seed} disabled={saving}>Add suggested departments</SecondaryButton>
      </div>

      {draft && (
        <form
          className="bg-white border border-gray-100 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 gap-3"
          onSubmit={(e) => { e.preventDefault(); save(); }}
          aria-label={draft.id ? 'Edit department' : 'New department'}
        >
          <Field label="Name" htmlFor="dept-name">
            <input id="dept-name" required className={inputClass} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </Field>
          <Field label="Transfer number" htmlFor="dept-phone" hint="Full international number, e.g. +14155550123. Leave empty to take callbacks instead.">
            <input id="dept-phone" inputMode="tel" className={inputClass} value={draft.transfer_phone} onChange={(e) => setDraft({ ...draft, transfer_phone: e.target.value })} />
          </Field>
          <Field label="Handles (comma separated)" htmlFor="dept-intents" hint="e.g. admissions, fees, complaint">
            <input id="dept-intents" className={inputClass} value={draft.intents} onChange={(e) => setDraft({ ...draft, intents: e.target.value })} />
          </Field>
          <Field label="If unavailable, try" htmlFor="dept-fallback">
            <select id="dept-fallback" className={inputClass} value={draft.fallback_key} onChange={(e) => setDraft({ ...draft, fallback_key: e.target.value })}>
              <option value="">Nobody (offer a callback)</option>
              {items.filter((d) => d.id !== draft.id).map((d) => <option key={d.id} value={d.key}>{d.name}</option>)}
            </select>
          </Field>
          <Field label="Priority (0-100)" htmlFor="dept-priority">
            <input id="dept-priority" type="number" min={0} max={100} className={inputClass} value={draft.priority} onChange={(e) => setDraft({ ...draft, priority: Number(e.target.value) })} />
          </Field>
          <Field label="Ring for (seconds)" htmlFor="dept-timeout">
            <input id="dept-timeout" type="number" min={5} max={60} className={inputClass} value={draft.timeout_seconds} onChange={(e) => setDraft({ ...draft, timeout_seconds: Number(e.target.value) })} />
          </Field>
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={draft.may_answer} onChange={(e) => setDraft({ ...draft, may_answer: e.target.checked })} />
            The AI may answer these questions itself before offering a transfer
          </label>
          <label className="flex items-center gap-2 text-xs text-gray-700">
            <input type="checkbox" checked={draft.active} onChange={(e) => setDraft({ ...draft, active: e.target.checked })} />
            Active
          </label>
          {formError && <p role="alert" className="sm:col-span-2 text-xs text-red-600">{formError}</p>}
          <div className="sm:col-span-2 flex gap-2">
            <PrimaryButton type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save'}</PrimaryButton>
            <SecondaryButton type="button" onClick={() => setDraft(null)}>Cancel</SecondaryButton>
          </div>
        </form>
      )}

      <DataState loading={loading} error={error} onRetry={load} empty={items.length === 0}
        emptyText="No departments yet. Without them every transfer rings your main line.">
        <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-gray-500 border-b border-gray-100">
              <tr><th className="p-3">Department</th><th className="p-3">Handles</th><th className="p-3">Number</th>{!compact && <th className="p-3">Fallback</th>}<th className="p-3">Status</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="border-b border-gray-50 last:border-0">
                  <td className="p-3 font-semibold text-gray-900">{d.name}<div className="text-[10px] text-gray-400 font-normal">{d.key}</div></td>
                  <td className="p-3 text-gray-600">{d.intents.join(', ') || '—'}</td>
                  <td className="p-3">{d.transfer_phone || <span className="text-amber-600">Callbacks only</span>}</td>
                  {!compact && <td className="p-3 text-gray-600">{items.find((x) => x.key === d.fallback_key)?.name || '—'}</td>}
                  <td className="p-3"><StatusChip value={d.active ? 'active' : 'inactive'} /></td>
                  <td className="p-3 text-right whitespace-nowrap">
                    <SecondaryButton onClick={() => edit(d)}>Edit</SecondaryButton>{' '}
                    <SecondaryButton onClick={() => remove(d)}>Remove</SecondaryButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
    </div>
  );
}
