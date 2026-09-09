"use client";

import React from 'react';

type HealthStatus = 'Operational' | 'Degraded';

interface ServiceHealth {
  id: string;
  name: string;
  status: HealthStatus;
  latency: string;
  errorRate: string;
  requestsPerMinute: string;
  uptime: string;
}

const services: ServiceHealth[] = [
  {
    id: 'api-server',
    name: 'API Server',
    status: 'Operational',
    latency: '12ms',
    errorRate: '0.1%',
    requestsPerMinute: '2.4K',
    uptime: '99.99%',
  },
  {
    id: 'database',
    name: 'Database',
    status: 'Operational',
    latency: '8ms',
    errorRate: '0.0%',
    requestsPerMinute: '1.8K',
    uptime: '99.99%',
  },
  {
    id: 'redis-cache',
    name: 'Redis Cache',
    status: 'Operational',
    latency: '2ms',
    errorRate: '0.0%',
    requestsPerMinute: '5.2K',
    uptime: '100%',
  },
  {
    id: 'ai-gateway',
    name: 'AI Gateway',
    status: 'Operational',
    latency: '145ms',
    errorRate: '0.12%',
    requestsPerMinute: '90',
    uptime: '99.95%',
  },
  {
    id: 'voice-gateway',
    name: 'Voice Gateway',
    status: 'Operational',
    latency: '34ms',
    errorRate: '0.02%',
    requestsPerMinute: '320',
    uptime: '99.98%',
  },
  {
    id: 'whatsapp-gateway',
    name: 'WhatsApp Gateway',
    status: 'Degraded',
    latency: '182ms',
    errorRate: '1.2%',
    requestsPerMinute: '150',
    uptime: '98.2%',
  },
  {
    id: 'notification-service',
    name: 'Notification Service',
    status: 'Operational',
    latency: '18ms',
    errorRate: '0.01%',
    requestsPerMinute: '420',
    uptime: '99.99%',
  },
  {
    id: 'appointment-service',
    name: 'Appointment Service',
    status: 'Operational',
    latency: '22ms',
    errorRate: '0.00%',
    requestsPerMinute: '680',
    uptime: '100%',
  },
  {
    id: 'knowledge-processing',
    name: 'Knowledge Processing',
    status: 'Operational',
    latency: '89ms',
    errorRate: '0.05%',
    requestsPerMinute: '240',
    uptime: '99.97%',
  },
  {
    id: 'storage',
    name: 'Storage',
    status: 'Operational',
    latency: '15ms',
    errorRate: '0.00%',
    requestsPerMinute: '3.1K',
    uptime: '100%',
  },
];

function StatusBadge({ status }: { status: HealthStatus }) {
  const isOperational = status === 'Operational';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold ${
        isOperational ? 'bg-[#D1FAE5] text-[#047857]' : 'bg-[#FEF3C7] text-[#B45309]'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${isOperational ? 'bg-[#10B981]' : 'bg-[#F59E0B]'}`} />
      {status}
    </span>
  );
}

function ServiceCard({ service }: { service: ServiceHealth }) {
  return (
    <div className="rounded-xl border border-[#E2E8F0] bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[19px] font-bold tracking-tight text-[#1E293B]">{service.name}</h3>
        <StatusBadge status={service.status} />
      </div>

      <dl className="space-y-1.5">
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[12px] text-[#94A3B8]">Latency</dt>
          <dd className="text-[13px] font-bold text-[#334155]">{service.latency}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[12px] text-[#94A3B8]">Error Rate</dt>
          <dd className="text-[13px] font-bold text-[#10B981]">{service.errorRate}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[12px] text-[#94A3B8]">Requests/min</dt>
          <dd className="text-[13px] font-bold text-[#334155]">{service.requestsPerMinute}</dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt className="text-[12px] text-[#94A3B8]">Uptime</dt>
          <dd className="text-[13px] font-bold text-[#334155]">{service.uptime}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function SystemHealthPage() {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-6 md:p-8 animate-in fade-in duration-500">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-[40px] font-bold tracking-tight text-[#0F172A] leading-tight">System Health</h1>
          <p className="mt-1 text-[20px] text-[#64748B]">Technical infrastructure monitoring.</p>
        </div>

        <div className="flex items-center gap-3">
          <button className="inline-flex items-center gap-2 rounded-xl border border-[#E2E8F0] bg-white px-4 py-2 text-[14px] font-semibold text-[#64748B] shadow-sm hover:bg-gray-50 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Jan 1 - Jan 30, 2026
          </button>

          <button
            aria-label="Notifications"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#E2E8F0] bg-white text-[#64748B] shadow-sm hover:bg-gray-50 transition-colors"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>
      </header>

      <div className="mb-5 rounded-xl border border-[#FCD34D] bg-[#FFFBEB] px-4 py-3 text-[14px] font-semibold text-[#B45309]">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3l-8.47-14.14a2 2 0 0 0-3.42 0z"></path>
            <line x1="12" y1="9" x2="12" y2="13"></line>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
          Voice Services routing experiencing elevated latency in Germany (182ms avg).
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
        {services.map((service) => (
          <ServiceCard key={service.id} service={service} />
        ))}
      </div>
    </div>
  );
}
