"use client";
import React, { useState } from 'react';
import { adminAuth, API_BASE } from '../../lib/api';
import { ProviderLogo } from './ProviderLogo';

interface ProviderSummary {
  id: string;
  name: string;
  config: Record<string, string>; // env key -> masked preview
  sources?: Record<string, string>; // env key -> portal | .env | not set
  overridden?: boolean;
}

const headers = (): Record<string, string> => {
  const token = adminAuth.getToken();
  return { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
};

const SOURCE_LABEL: Record<string, string> = { portal: 'Saved here', '.env': 'From .env', 'not set': 'Not set' };

export function CredentialsDialog({ provider, onClose, onChanged }: { provider: ProviderSummary; onClose: () => void; onChanged: () => void }) {
  const keys = Object.keys(provider.config);
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<'save' | 'reset' | null>(null);
  const [error, setError] = useState('');

  const call = async (method: 'PUT' | 'DELETE', body?: unknown) => {
    setError('');
    const res = await fetch(`${API_BASE}/admin/integrations/${provider.id}/credentials`, { method, headers: headers(), body: body ? JSON.stringify(body) : undefined }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    if (res && res.ok) {
      onChanged();
      onClose();
    } else {
      setError(data.detail || 'The change could not be saved.');
    }
  };

  const save = async () => {
    setBusy('save');
    await call('PUT', { values });
    setBusy(null);
  };
  const reset = async () => {
    if (!window.confirm(`Forget the values saved here and use .env again for ${provider.name}?`)) return;
    setBusy('reset');
    await call('DELETE');
    setBusy(null);
  };

  const filled = Object.values(values).some((v) => v.trim());

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label={`${provider.name} credentials`} onClick={(e) => e.stopPropagation()} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <div className="flex items-center gap-3">
          <ProviderLogo id={provider.id} name={provider.name} size={44} />
          <div>
            <h2 className="text-base font-semibold text-slate-900">{provider.name}</h2>
            <p className="text-xs text-slate-500">Values saved here are encrypted and used instead of .env. Existing values are never shown in full.</p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {keys.map((key) => {
            const source = provider.sources?.[key] || 'not set';
            return (
              <label key={key} className="block">
                <span className="mb-1 flex items-center justify-between text-xs font-semibold text-slate-700">
                  <code className="font-mono">{key}</code>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${source === 'portal' ? 'bg-blue-50 text-blue-700' : source === 'not set' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>
                    {SOURCE_LABEL[source] || source}
                  </span>
                </span>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={values[key] || ''}
                  onChange={(e) => setValues((prev) => ({ ...prev, [key]: e.target.value }))}
                  placeholder={provider.config[key] === 'not set' ? 'Paste the value' : `${provider.config[key]} (leave blank to keep)`}
                  className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 font-mono text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20"
                />
              </label>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
            {error}
          </p>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          {provider.overridden ? (
            <button type="button" onClick={reset} disabled={busy !== null} className="h-9 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60">
              {busy === 'reset' ? 'Resetting...' : 'Reset to .env'}
            </button>
          ) : (
            <span className="text-xs text-slate-400">A live check runs after saving.</span>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
            <button type="button" onClick={save} disabled={!filled || busy !== null} className="h-9 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2 disabled:opacity-50">
              {busy === 'save' ? 'Saving...' : 'Save and test'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
