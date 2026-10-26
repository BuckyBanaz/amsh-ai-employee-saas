"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { VerticalController } from '../../controllers/vertical.controller';
import type { Resource } from '../../verticals/types';
import { DataState, Field, PrimaryButton, SecondaryButton, StatusChip, inputClass } from './PageBits';

/** Rooms (or stations / visit slots) a booking holds. A treatment whose kind needs a room books only when one is free. */
export function ResourcesManager({ kinds }: { kinds: { key: string; name: string }[] }) {
  const usable = kinds.filter((k) => k.key !== 'staff');
  const [items, setItems] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [kindChoice, setKind] = useState('');
  const kind = kindChoice || usable[0]?.key || ''; // the vertical's first kind until the user picks one
  const [capacity, setCapacity] = useState(1);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await VerticalController.resources());
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load resources');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await VerticalController.createResource({ name: name.trim(), kind, capacity });
      setName('');
      setCapacity(1);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not add');
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (r: Resource) => {
    try {
      await VerticalController.updateResource(r.id, { active: !r.active });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update');
    }
  };

  if (!usable.length) return <p className="text-xs text-gray-500">This business type books people only; it has no rooms or stations to set up.</p>;
  return (
    <div className="space-y-3">
      <form onSubmit={add} className="bg-white border border-gray-100 rounded-xl p-4 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end" aria-label="Add a resource">
        <Field label="Name" htmlFor="res-name"><input id="res-name" required className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Room 1" /></Field>
        <Field label="Kind" htmlFor="res-kind">
          <select id="res-kind" className={inputClass} value={kind} onChange={(e) => setKind(e.target.value)}>
            {usable.map((k) => <option key={k.key} value={k.key}>{k.name}</option>)}
          </select>
        </Field>
        <Field label="Bookings at once" htmlFor="res-cap"><input id="res-cap" type="number" min={1} max={50} className={inputClass} value={capacity} onChange={(e) => setCapacity(Number(e.target.value))} /></Field>
        <PrimaryButton type="submit" disabled={saving || !name.trim()}>{saving ? 'Adding…' : 'Add'}</PrimaryButton>
      </form>
      <DataState loading={loading} error={error} onRetry={load} empty={items.length === 0} emptyText="Nothing set up yet.">
        <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-gray-500 border-b border-gray-100"><tr><th className="p-3">Name</th><th className="p-3">Kind</th><th className="p-3">At once</th><th className="p-3">Status</th><th className="p-3" /></tr></thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0">
                  <td className="p-3 font-semibold text-gray-900">{r.name}</td>
                  <td className="p-3 text-gray-600">{usable.find((k) => k.key === r.kind)?.name || r.kind}</td>
                  <td className="p-3">{r.capacity}</td>
                  <td className="p-3"><StatusChip value={r.active ? 'active' : 'inactive'} /></td>
                  <td className="p-3 text-right"><SecondaryButton onClick={() => toggle(r)}>{r.active ? 'Deactivate' : 'Activate'}</SecondaryButton></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
    </div>
  );
}
