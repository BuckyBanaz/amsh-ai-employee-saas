"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { VerticalController } from '../../../controllers/vertical.controller';
import { DataState, PageHeader, SecondaryButton, StatusChip } from '../../../components/verticals/PageBits';
import type { Enquiry, EnquiryStatus } from '../../../verticals/types';

const TABS: { key: EnquiryStatus | ''; label: string }[] = [
  { key: 'new', label: 'New' }, { key: 'contacted', label: 'Contacted' }, { key: 'closed', label: 'Closed' }, { key: '', label: 'All' },
];
const KIND_LABEL: Record<string, string> = { enquiry: 'Enquiry', admission: 'Admission', callback: 'Callback', demo_request: 'Demo request', support: 'Support' };

// Leads and follow-ups the AI captured (or staff added): staff work them from New to Contacted to Closed.
export default function EnquiriesPage() {
  const [tab, setTab] = useState<EnquiryStatus | ''>('new');
  const [items, setItems] = useState<Enquiry[]>([]);
  const [counts, setCounts] = useState<Partial<Record<EnquiryStatus, number>>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await VerticalController.enquiries(tab || undefined);
      setItems(r.items);
      setCounts(r.counts);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load enquiries');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  const move = async (e: Enquiry, status: EnquiryStatus) => {
    setBusy(e.id);
    try {
      await VerticalController.updateEnquiry(e.id, { status });
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not update');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-8 w-full">
      <PageHeader title="Enquiries" subtitle="Admission enquiries, callback requests and demo requests to follow up." action={<SecondaryButton onClick={load}>Refresh</SecondaryButton>} />
      <div role="tablist" aria-label="Enquiry status" className="flex gap-1.5">
        {TABS.map((t) => (
          <button key={t.label} role="tab" aria-selected={tab === t.key} onClick={() => setTab(t.key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${tab === t.key ? 'bg-[#0066FF] text-white border-[#0066FF]' : 'bg-white text-gray-700 border-gray-200'}`}>
            {t.label}{t.key && counts[t.key] !== undefined ? ` (${counts[t.key]})` : ''}
          </button>
        ))}
      </div>
      <DataState loading={loading} error={error} onRetry={load} empty={items.length === 0} emptyText="Nothing here.">
        <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-gray-500 border-b border-gray-100">
              <tr><th className="p-3">Received</th><th className="p-3">Contact</th><th className="p-3">About</th><th className="p-3">Type</th><th className="p-3">Department</th><th className="p-3">Status</th><th className="p-3" /></tr>
            </thead>
            <tbody>
              {items.map((e) => (
                <tr key={e.id} className="border-b border-gray-50 last:border-0 align-top">
                  <td className="p-3 text-gray-600 whitespace-nowrap">{e.created_at ? new Date(e.created_at).toLocaleString() : '—'}<div className="text-[10px] text-gray-400">{e.source === 'ai' ? 'AI receptionist' : 'Staff'}</div></td>
                  <td className="p-3"><div className="font-semibold text-gray-900">{e.contact_name}</div><div className="text-gray-500">{e.contact_phone}</div>{e.contact_email && <div className="text-gray-500">{e.contact_email}</div>}</td>
                  <td className="p-3 text-gray-700">{e.subject || e.topic || '—'}
                    {Object.keys(e.details || {}).length > 0 && <div className="text-[10px] text-gray-400 mt-0.5">{Object.entries(e.details).map(([k, v]) => `${k.replace(/_/g, ' ')}: ${v}`).join(' · ')}</div>}
                    {e.notes && <div className="text-[10px] text-gray-500 mt-0.5">{e.notes}</div>}
                  </td>
                  <td className="p-3 text-gray-600">{KIND_LABEL[e.kind] || e.kind}</td>
                  <td className="p-3 text-gray-600">{e.department_key ? e.department_key.replace(/_/g, ' ') : '—'}</td>
                  <td className="p-3"><StatusChip value={e.status} /></td>
                  <td className="p-3 text-right whitespace-nowrap">
                    {e.status === 'new' && <SecondaryButton disabled={busy === e.id} onClick={() => move(e, 'contacted')}>Mark contacted</SecondaryButton>}
                    {e.status !== 'closed' && <SecondaryButton disabled={busy === e.id} onClick={() => move(e, 'closed')} className="ml-1">Close</SecondaryButton>}
                    {e.status === 'closed' && <SecondaryButton disabled={busy === e.id} onClick={() => move(e, 'new')}>Reopen</SecondaryButton>}
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
