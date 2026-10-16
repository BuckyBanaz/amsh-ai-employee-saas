"use client";

import { useEffect, useState } from 'react';
import { DeletePreview, deleteTenant, fetchDeletePreview } from '@/lib/api';
import { BTN, ErrorBox, INPUT, Loading, errorText } from '@/components/admin/ui';

/** Permanent delete, the careful way: it first shows exactly what would be removed, and only the business's exact name unlocks it. */
export function DeleteBusinessDialog({ business, onClose, onDeleted }: {
  business: { id: string; name: string };
  onClose: () => void;
  onDeleted: (name: string) => void;
}) {
  const [preview, setPreview] = useState<DeletePreview | null>(null);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchDeletePreview(business.id).then(setPreview).catch((e: unknown) => setError(errorText(e, 'Could not load what would be deleted')));
  }, [business.id]);

  async function remove() {
    if (!preview) return;
    setBusy(true);
    setError('');
    try {
      await deleteTenant(business.id, typed);
      onDeleted(preview.name);
    } catch (e) {
      setError(errorText(e, 'Could not delete this business'));
      setBusy(false);
    }
  }

  const rows = preview ? Object.entries(preview.counts) : [];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label={`Delete ${business.name}`} onClick={busy ? undefined : onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-sm font-bold text-[#0F172A]">Delete {business.name} permanently?</h2>
        <p className="mt-1 text-xs text-[#475569]">This cannot be undone. {preview?.suggestion}</p>
        {error && <div className="mt-3"><ErrorBox message={error} /></div>}
        {!preview && !error && <Loading what="what would be deleted" />}
        {preview && (
          <>
            <div className="mt-3 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-3 text-xs">
              <p className="mb-1 font-semibold text-[#0F172A]">{preview.total_rows} records would be removed:</p>
              <ul className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[#475569]">
                {rows.map(([table, n]) => <li key={table} className="flex justify-between"><span>{table.replace(/_/g, ' ')}</span><span className="font-semibold">{n}</span></li>)}
              </ul>
            </div>
            <label className="mt-3 block text-[11px] font-semibold text-[#475569]">
              Type <span className="font-bold text-[#0F172A]">{preview.confirm_with}</span> to confirm
              <input className={`${INPUT} mt-1 w-full`} value={typed} onChange={(e) => setTyped(e.target.value)} autoFocus autoComplete="off" />
            </label>
          </>
        )}
        <div className="mt-4 flex justify-end gap-2">
          <button className={BTN} onClick={onClose} disabled={busy}>Cancel</button>
          <button onClick={remove} disabled={busy || !preview || typed.trim() !== preview.confirm_with.trim()}
            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40">
            {busy ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}
