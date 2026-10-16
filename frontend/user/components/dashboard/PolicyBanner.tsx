"use client";
import React, { useEffect, useState } from 'react';
import { PoliciesService } from '../../services/policies.service';
import { StorageService } from '../../services/storage.service';
import { PolicyAcceptance } from '../policies/PolicyAcceptance';

/** Shown to an owner or admin when a policy needs accepting (a new version that asks for it): opens the same list as onboarding. */
export function PolicyBanner() {
  const [pending, setPending] = useState(0);
  const [open, setOpen] = useState(false);
  const [businessId, setBusinessId] = useState<string | null>(null);

  useEffect(() => {
    const id = StorageService.getBusinessId();
    const role = StorageService.getUser()?.role;
    if (!id || (role && role !== 'owner' && role !== 'admin')) return;
    setBusinessId(id);
    PoliciesService.getStatus(id).then((s) => setPending(s.pending)).catch(() => undefined); // a notice is never worth an error on the dashboard
  }, []);

  if (!businessId || pending === 0) return null;
  return (
    <>
      <div role="status" className="flex flex-wrap items-center justify-between gap-2 border-b border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-900">
        <span><strong>{pending === 1 ? 'A policy needs' : `${pending} policies need`} your acceptance.</strong> Review {pending === 1 ? 'it' : 'them'} to keep using Amsh without interruption.</span>
        <button type="button" onClick={() => setOpen(true)} className="rounded-md border border-amber-300 bg-white px-3 py-1 font-bold text-amber-900 hover:bg-amber-100">Review and accept</button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true" aria-label="Policies">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-base font-bold text-gray-900">Policies</h2><button type="button" onClick={() => setOpen(false)} className="text-sm font-semibold text-gray-500 hover:text-gray-900">Close</button></div>
            <PolicyAcceptance businessId={businessId} showAi={false} onPending={setPending} />
          </div>
        </div>
      )}
    </>
  );
}
