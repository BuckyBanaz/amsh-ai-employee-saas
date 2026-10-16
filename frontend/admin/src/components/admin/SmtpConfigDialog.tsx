"use client";
import React, { useEffect, useRef, useState } from 'react';
import { adminAuth, API_BASE } from '../../lib/api';

interface SmtpForm {
  display_name: string;
  from_email: string;
  username: string;
  host: string;
  port: number | string;
  security: 'starttls' | 'ssl' | 'none';
  reply_to: string;
  logo_url: string;
  has_password: boolean;
}

const EMPTY: SmtpForm = { display_name: '', from_email: '', username: '', host: '', port: 587, security: 'starttls', reply_to: '', logo_url: '', has_password: false };
const ORIGIN = API_BASE.replace(/\/api\/?$/, '');
const PRESETS = [
  { label: 'Gmail / Workspace', host: 'smtp.gmail.com', port: 587, security: 'starttls' as const },
  { label: 'Outlook / Microsoft 365', host: 'smtp.office365.com', port: 587, security: 'starttls' as const },
  { label: 'Zoho Mail', host: 'smtp.zoho.in', port: 587, security: 'starttls' as const },
  { label: 'Amazon SES (Mumbai)', host: 'email-smtp.ap-south-1.amazonaws.com', port: 587, security: 'starttls' as const },
];

function authHeaders(json = true): Record<string, string> {
  const token = adminAuth.getToken();
  return { ...(json ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

const inputClass =
  'h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-[#0066FF]/20';

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-slate-700">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-slate-400">{hint}</span>}
    </label>
  );
}

export function SmtpConfigDialog({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<SmtpForm>(EMPTY);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let alive = true;
    fetch(`${API_BASE}/admin/integrations/platform_smtp/settings`, { headers: authHeaders() })
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data) => alive && setForm({ ...EMPTY, ...data }))
      .catch(() => alive && setError('Could not load the saved settings.'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  const set = <K extends keyof SmtpForm>(key: K, value: SmtpForm[K]) => setForm((prev) => ({ ...prev, [key]: value }));

  const save = async () => {
    setSaving(true);
    setError('');
    const { has_password, ...values } = form;
    void has_password;
    const res = await fetch(`${API_BASE}/admin/integrations/platform_smtp/settings`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ ...values, port: Number(values.port), password: password || undefined }),
    }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setSaving(false);
    if (res && res.ok) {
      onSaved();
      onClose();
    } else {
      setError(data.detail || 'Could not save the settings.');
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Remove the saved SMTP settings, logo and password?')) return;
    setSaving(true);
    const res = await fetch(`${API_BASE}/admin/integrations/platform_smtp/credentials`, { method: 'DELETE', headers: authHeaders() }).catch(() => null);
    setSaving(false);
    if (res && res.ok) {
      onSaved();
      onClose();
    } else {
      setError('Could not remove the settings.');
    }
  };

  const uploadLogo = async (file: File) => {
    setUploading(true);
    setError('');
    const body = new FormData();
    body.append('file', file);
    const res = await fetch(`${API_BASE}/admin/integrations/platform_smtp/logo`, { method: 'POST', headers: authHeaders(false), body }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setUploading(false);
    if (res && res.ok) set('logo_url', data.logo_url);
    else setError(data.detail || 'Could not upload the logo.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Platform email settings"
        onClick={(e) => e.stopPropagation()}
        className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Platform email (SMTP)</h2>
            <p className="mt-0.5 text-sm text-slate-500">The sender identity for password resets, invites and notices. Entered here, stored in the database; the password is encrypted and never shown again.</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-400">Loading...</p>
        ) : (
          <div className="mt-5 space-y-5">
            <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                {form.logo_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={form.logo_url.startsWith('http') ? form.logo_url : `${ORIGIN}${form.logo_url}`} alt="Email logo" className="max-h-14 max-w-14 object-contain" />
                ) : (
                  <span className="text-xs text-slate-400">No logo</span>
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-slate-900">Email logo</p>
                <p className="text-xs text-slate-500">Shown at the top of emails. PNG, JPG, WebP or SVG, up to 1 MB.</p>
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadLogo(e.target.files[0])} />
              <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading} className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60">
                {uploading ? 'Uploading...' : form.logo_url ? 'Change' : 'Upload'}
              </button>
              {form.logo_url && (
                <button type="button" onClick={() => set('logo_url', '')} className="h-9 rounded-lg px-2 text-sm font-medium text-slate-400 hover:text-red-600">
                  Remove
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Display name" hint="What recipients see as the sender, e.g. AMSh">
                <input className={inputClass} value={form.display_name} onChange={(e) => set('display_name', e.target.value)} placeholder="AMSh" />
              </Field>
              <Field label="From email" hint="Must be allowed by your SMTP provider">
                <input className={inputClass} type="email" value={form.from_email} onChange={(e) => set('from_email', e.target.value)} placeholder="no-reply@yourdomain.com" />
              </Field>
              <Field label="Reply-to (optional)">
                <input className={inputClass} type="email" value={form.reply_to} onChange={(e) => set('reply_to', e.target.value)} placeholder="support@yourdomain.com" />
              </Field>
              <Field label="Username">
                <input className={inputClass} value={form.username} onChange={(e) => set('username', e.target.value)} autoComplete="off" />
              </Field>
              <Field label="Password" hint={form.has_password ? 'A password is saved. Leave blank to keep it.' : 'Stored encrypted.'}>
                <input className={inputClass} type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" placeholder={form.has_password ? '••••••••' : ''} />
              </Field>
            </div>

            <div>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-700">Server</span>
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, host: p.host, port: p.port, security: p.security }))}
                    className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_7rem_10rem]">
                <Field label="SMTP host">
                  <input className={inputClass} value={form.host} onChange={(e) => set('host', e.target.value)} placeholder="smtp.example.com" />
                </Field>
                <Field label="Port">
                  <input className={inputClass} type="number" value={form.port} onChange={(e) => set('port', e.target.value)} />
                </Field>
                <Field label="Security">
                  <select className={inputClass} value={form.security} onChange={(e) => set('security', e.target.value as SmtpForm['security'])}>
                    <option value="starttls">STARTTLS (587)</option>
                    <option value="ssl">SSL / TLS (465)</option>
                    <option value="none">None</option>
                  </select>
                </Field>
              </div>
            </div>

            {error && (
              <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700">
                {error}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between gap-3">
          {form.host || form.has_password ? (
            <button type="button" onClick={clearAll} disabled={saving} className="h-9 rounded-lg px-3 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60">
              Remove settings
            </button>
          ) : (
            <p className="text-xs text-slate-400">After saving, a login test runs. Nothing is sent.</p>
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="h-9 rounded-lg px-4 text-sm font-medium text-slate-600 hover:bg-slate-100">
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || loading}
              className="h-9 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0066FF] focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {saving ? 'Saving...' : 'Save settings'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
