"use client";

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api';

type HealthStatus = 'Operational' | 'Degraded' | 'Not configured' | 'Unknown';

interface ServiceHealth {
  id: string;
  name: string;
  status: HealthStatus;
  latency: string | null;
  errorRate: string | null;
  detail?: string | null;
}

function StatusBadge({ status }: { status: HealthStatus }) {
  const isOperational = status === 'Operational';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
        isOperational ? 'bg-[#D1FAE5] text-[#047857]' : status === 'Degraded' ? 'bg-[#FEF3C7] text-[#B45309]' : 'bg-[#F1F5F9] text-[#475569]'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isOperational ? 'bg-[#10B981]' : status === 'Degraded' ? 'bg-[#F59E0B]' : 'bg-[#94A3B8]'}`} />
      {status}
    </span>
  );
}

function ServiceCard({ service }: { service: ServiceHealth }) {
  return (
    <div className="rounded-lg border border-[#E2E8F0] bg-white p-3 shadow-2xs">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold tracking-tight text-[#1E293B]">{service.name}</h3>
        <StatusBadge status={service.status} />
      </div>

      <dl className="space-y-1">
        <div className="flex items-center justify-between gap-2">
          <dt className="text-[11px] text-[#94A3B8]">Latency</dt>
          <dd className="text-xs font-bold text-[#334155]">{service.latency ?? '–'}</dd>
        </div>
        {service.errorRate && (
          <div className="flex items-center justify-between gap-2">
            <dt className="text-[11px] text-[#94A3B8]">Failure rate</dt>
            <dd className="text-xs font-bold text-[#334155]">{service.errorRate}</dd>
          </div>
        )}
      </dl>
      {service.detail && <p className="mt-2 text-[11px] leading-snug text-[#64748B]">{service.detail}</p>}
    </div>
  );
}

export default function SystemHealthPage() {
  const [services, setServices] = useState<ServiceHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);

  useEffect(() => {
    async function loadHealth() {
      try {
        const response = await adminFetch<{ services?: ServiceHealth[]; generatedAt?: string | null }>('/admin/health');
        setServices(response.services || []);
        setCheckedAt(response.generatedAt || null);
      } catch (err) {
        console.error('Failed to load health:', err);
      } finally {
        setLoading(false);
      }
    }
    loadHealth();
    const timer = window.setInterval(() => document.visibilityState === 'visible' && loadHealth(), 30000);
    return () => window.clearInterval(timer);
  }, []);

  if (loading) {
    return <div className="p-5">Loading health metrics...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <header className="mb-4 pb-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#0F172A] leading-tight">System Health</h1>
          <p className="mt-0.5 text-xs text-[#475569] font-normal">Measured live: database and Redis are timed on each refresh, providers show their last real check. Refreshes every 30 seconds.</p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-[#94A3B8]">{checkedAt ? `Updated ${new Date(checkedAt).toLocaleTimeString()}` : ''}</span>

          <button
            aria-label="Notifications"
            className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#475569] shadow-2xs hover:bg-gray-50 transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>
      </header>


      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
}
