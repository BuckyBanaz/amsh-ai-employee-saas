"use client";
import React, { useCallback, useEffect, useState } from 'react';
import { VerticalController } from '../../controllers/vertical.controller';
import { invalidateVerticalConfig, useVerticalConfig } from '../../verticals/useVerticalConfig';
import type { ReadinessProblem } from '../../verticals/types';
import { PrimaryButton, SecondaryButton } from './PageBits';

/** The server's own readiness check for this business type and its activation: what is still missing (errors block), what is
 * advisable (warnings), and the button that turns the configuration on. Nothing is judged in the browser. */
export function ActivationPanel() {
  const { config } = useVerticalConfig();
  const [problems, setProblems] = useState<ReadinessProblem[] | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const check = useCallback(async () => {
    setBusy(true);
    setMessage(null);
    try {
      const r = await VerticalController.validate();
      setProblems(r.problems);
      setReady(r.ready);
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Could not check the setup');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => { check(); }, [check]);

  const activate = async () => {
    setBusy(true);
    try {
      await VerticalController.activate();
      invalidateVerticalConfig();
      window.dispatchEvent(new Event('business_updated'));
      setMessage('Activated. Your AI receptionist now runs this configuration.');
      await check();
    } catch (e: unknown) {
      setMessage(e instanceof Error ? e.message : 'Could not activate');
    } finally {
      setBusy(false);
    }
  };

  const errors = (problems || []).filter((p) => p.level === 'error');
  const warnings = (problems || []).filter((p) => p.level === 'warning');
  return (
    <section aria-labelledby="activation-title" className="border border-gray-100 rounded-xl p-4 bg-gray-50/60">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div>
          <h2 id="activation-title" className="text-sm font-bold text-gray-900">
            {config?.vertical_name || 'Business type'}{config?.subtype_name ? ` · ${config.subtype_name}` : ''}
          </h2>
          <p className="text-[11px] text-gray-500">
            Status: <b>{config?.status === 'active' ? 'Active' : 'Not activated yet'}</b>
            {config?.workflows?.length ? ` · ${config.workflows.length} workflows: ${config.workflows.map((w) => w.title).join(', ')}` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <SecondaryButton onClick={check} disabled={busy}>Check again</SecondaryButton>
          <PrimaryButton onClick={activate} disabled={busy || !ready || config?.status === 'active'}>Activate</PrimaryButton>
        </div>
      </div>
      {problems === null ? (
        <p className="text-xs text-gray-500">Checking…</p>
      ) : (
        <ul className="space-y-1">
          {errors.map((p) => <li key={p.code + p.message} className="text-xs text-red-700">Must fix: {p.message}</li>)}
          {warnings.map((p) => <li key={p.code + p.message} className="text-xs text-amber-700">Advice: {p.message}</li>)}
          {!errors.length && !warnings.length && <li className="text-xs text-green-700">Everything needed is set up.</li>}
        </ul>
      )}
      {message && <p role="status" className="text-xs text-gray-700 mt-2">{message}</p>}
    </section>
  );
}
