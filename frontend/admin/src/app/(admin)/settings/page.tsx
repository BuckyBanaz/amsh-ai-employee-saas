"use client";

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api';

interface PlatformSettings {
  deployment: { environment: string; public_base_url: string | null; api_started_at: string };
  counts: { businesses: number; users: number; integrations_connected: number; integrations_total: number };
  email: { sender_name: string; from_email: string; host: string; configured: boolean };
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-[#E2E8F0] py-2.5 last:border-0">
      <span className="text-sm text-[#475569]">{label}</span>
      <span className="break-all text-right text-sm font-medium text-[#0F172A]">{value || '–'}</span>
    </div>
  );
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminFetch<PlatformSettings>('/admin/settings').then(setSettings).catch(() => setError('Could not load the platform settings.'));
  }, []);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <header className="mb-4 border-b border-[#E2E8F0] pb-3">
        <h1 className="text-lg font-bold leading-tight tracking-tight text-[#0F172A]">Settings</h1>
        <p className="mt-0.5 text-xs text-[#475569]">What this deployment is running. Provider keys and the sender email are managed under Integrations.</p>
      </header>

      {error && <p role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>}
      {!settings && !error && <p className="text-sm text-[#94A3B8]">Loading settings...</p>}

      {settings && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-2xs">
            <h3 className="mb-1 text-sm font-bold text-[#1E293B]">Deployment</h3>
            <Row label="Mode" value={settings.deployment.environment === 'production' ? 'Production' : 'Development (debug on)'} />
            <Row label="Public URL" value={settings.deployment.public_base_url} />
            <Row label="API running since" value={new Date(settings.deployment.api_started_at).toLocaleString()} />
          </section>

          <section className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-2xs">
            <h3 className="mb-1 text-sm font-bold text-[#1E293B]">Platform</h3>
            <Row label="Businesses" value={settings.counts.businesses} />
            <Row label="Users" value={settings.counts.users} />
            <Row label="Integrations connected" value={`${settings.counts.integrations_connected} of ${settings.counts.integrations_total}`} />
          </section>

          <section className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-2xs lg:col-span-2">
            <div className="mb-1 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#1E293B]">Platform email</h3>
              <a href="/integrations" className="text-xs font-medium text-[#0066FF] hover:underline">Configure in Integrations</a>
            </div>
            <Row label="Status" value={settings.email.configured ? 'SMTP configured' : 'Not configured (uses Resend from .env if set)'} />
            <Row label="Sender name" value={settings.email.sender_name} />
            <Row label="From address" value={settings.email.from_email} />
            <Row label="SMTP host" value={settings.email.host} />
          </section>
        </div>
      )}
    </div>
  );
}
