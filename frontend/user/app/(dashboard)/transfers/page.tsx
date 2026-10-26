"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { VerticalController } from '../../../controllers/vertical.controller';
import { DataState, PageHeader, SecondaryButton, StatusChip } from '../../../components/verticals/PageBits';
import type { TransferAttempt } from '../../../verticals/types';

// Every attempt to connect a caller to a department and how it really ended (the provider's result, not the AI's words).
export default function TransfersPage() {
  const [items, setItems] = useState<TransferAttempt[]>([]);
  const [byStatus, setByStatus] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await VerticalController.transfers();
      setItems(r.items);
      setByStatus(r.by_status);
      setError(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load transfers');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-8 w-full">
      <PageHeader title="Transfers" subtitle="Calls the AI handed to a department, and what happened." action={<SecondaryButton onClick={load}>Refresh</SecondaryButton>} />
      <div className="flex flex-wrap gap-2">
        {Object.entries(byStatus).map(([s, n]) => <span key={s} className="text-xs bg-white border border-gray-100 rounded-lg px-3 py-1.5"><StatusChip value={s} /> <b className="ml-1">{n}</b></span>)}
      </div>
      <DataState loading={loading} error={error} onRetry={load} empty={items.length === 0} emptyText="No transfers yet.">
        <div className="bg-white border border-gray-100 rounded-xl overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="text-left text-gray-500 border-b border-gray-100">
              <tr><th className="p-3">When</th><th className="p-3">Department</th><th className="p-3">Asked for</th><th className="p-3">Number</th><th className="p-3">Result</th><th className="p-3">Follow-up</th></tr>
            </thead>
            <tbody>
              {items.map((t) => (
                <tr key={t.id} className="border-b border-gray-50 last:border-0">
                  <td className="p-3 text-gray-600 whitespace-nowrap">{t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</td>
                  <td className="p-3 font-semibold text-gray-900">{t.department_key.replace(/_/g, ' ')}</td>
                  <td className="p-3 text-gray-600">{t.requested_key ? t.requested_key.replace(/_/g, ' ') : '—'}</td>
                  <td className="p-3 text-gray-600">{t.destination_tail ? `…${t.destination_tail}` : '—'}</td>
                  <td className="p-3"><StatusChip value={t.status} />{t.outcome_detail && <div className="text-[10px] text-gray-400 mt-0.5">{t.outcome_detail}</div>}</td>
                  <td className="p-3 text-gray-600">{t.enquiry_id ? 'Callback task created' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DataState>
    </div>
  );
}
