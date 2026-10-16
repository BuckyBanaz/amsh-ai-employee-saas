"use client";
import React, { useEffect, useState } from 'react';
import { fetchPlans, updateTenant, PlanApi } from '../../lib/api';

export type TenantAction = 'suspend' | 'reactivate' | 'plan';

interface Props {
  tenant: { id: string; name: string; plan: string };
  action: TenantAction;
  onClose: () => void;
  onDone: (message: string) => void;
}

/** Confirmation dialog for suspending, reactivating or changing the plan of one business. Every change is audited by the server. */
export function TenantActionDialog({ tenant, action, onClose, onDone }: Props) {
  const [plans, setPlans] = useState<PlanApi[]>([]);
  const [plan, setPlan] = useState(tenant.plan);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (action !== 'plan') return;
    let cancelled = false;
    fetchPlans()
      .then((res) => {
        if (!cancelled) setPlans(res.items);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load the plans.');
      });
    return () => {
      cancelled = true;
    };
  }, [action]);

  const confirm = async () => {
    setBusy(true);
    setError('');
    try {
      await updateTenant(tenant.id, action === 'plan' ? { plan } : { status: action === 'suspend' ? 'suspended' : 'active' });
      onDone(
        action === 'plan'
          ? `${tenant.name} is now on the ${plan} plan.`
          : action === 'suspend'
            ? `${tenant.name} is suspended. Its phone calls are no longer answered.`
            : `${tenant.name} is active again.`
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save the change.');
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4" role="dialog" aria-modal="true">
      <div className="w-full max-w-sm bg-white rounded-xl border border-[#E2E8F0] shadow-xl p-5 space-y-3">
        <h2 className="text-sm font-bold text-[#0F172A]">
          {action === 'plan' ? 'Change plan' : action === 'suspend' ? 'Suspend this business?' : 'Reactivate this business?'}
        </h2>
        <p className="text-xs text-[#475569] leading-relaxed">
          {action === 'plan' && <>Choose the plan for <strong>{tenant.name}</strong>. Plans are created under Billing. This is recorded in the audit log.</>}
          {action === 'suspend' && <><strong>{tenant.name}</strong> will stop being answered by the AI: callers hear that the service is unavailable. Its users can still sign in. This is recorded in the audit log.</>}
          {action === 'reactivate' && <><strong>{tenant.name}</strong> will be answered by the AI again. This is recorded in the audit log.</>}
        </p>
        {action === 'plan' && (
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="w-full px-3 py-1.5 rounded-md border border-[#CBD5E1] text-xs text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]"
            aria-label="Plan"
          >
            {!plans.some((p) => p.key === plan) && <option value={plan}>{plan}</option>}
            {plans
              .filter((p) => p.status === 'active' || p.key === tenant.plan)
              .map((p) => (
                <option key={p.key} value={p.key}>
                  {p.name}{p.kind === 'enterprise' ? ` (enterprise: ${p.client ?? ''})` : ''}{p.status !== 'active' ? ` (${p.status})` : ''}
                </option>
              ))}
          </select>
        )}
        {error && <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">{error}</div>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} disabled={busy} className="px-3 py-1.5 text-xs font-semibold text-[#475569] border border-[#E2E8F0] rounded-md hover:bg-[#F8FAFC]">Cancel</button>
          <button
            onClick={confirm}
            disabled={busy}
            className={`px-3 py-1.5 text-xs font-semibold text-white rounded-md disabled:opacity-60 ${action === 'suspend' ? 'bg-red-600 hover:bg-red-700' : 'bg-[#2563EB] hover:bg-blue-700'}`}
          >
            {busy ? 'Saving...' : action === 'plan' ? 'Save plan' : action === 'suspend' ? 'Suspend' : 'Reactivate'}
          </button>
        </div>
      </div>
    </div>
  );
}
