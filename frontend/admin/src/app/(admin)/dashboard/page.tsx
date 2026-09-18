"use client";
import React from 'react';
import Link from 'next/link';

const StatCard = ({
  title,
  value,
  change,
  isPositive,
  href,
}: {
  title: string;
  value: string;
  change: string;
  isPositive?: boolean;
  href?: string;
}) => {
  const content = (
    <div className={`bg-white border border-gray-200 rounded-lg p-3.5 shadow-2xs transition-all ${
      href ? 'hover:border-[#2563EB]/40 hover:shadow-xs cursor-pointer' : ''
    }`}>
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="flex items-baseline justify-between">
        <div className="text-xl font-extrabold text-gray-900 tracking-tight leading-none">{value}</div>
        {change && (
          <span className={`text-[11px] font-semibold ${isPositive ? 'text-[#059669]' : 'text-red-500'}`}>
            {change}
          </span>
        )}
      </div>
    </div>
  );

  return href ? <Link href={href} className="block">{content}</Link> : content;
};

const HealthStatus = ({ name, status }: { name: string; status: 'Operational' | 'Degraded' }) => {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
      <span className="text-xs font-semibold text-gray-900">{name}</span>
      <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-semibold ${
        status === 'Operational' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-amber-50 text-amber-600'
      }`}>
        <div className={`w-1.5 h-1.5 rounded-full ${status === 'Operational' ? 'bg-[#10B981]' : 'bg-amber-500'}`}></div>
        {status}
      </div>
    </div>
  );
};

export default function AdminDashboard() {
  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      
      {/* Header */}
      <header className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900 tracking-tight leading-tight flex items-center gap-1.5">
            Good morning, Parikshit
            <span className="text-amber-500 text-sm">👋</span>
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Platform Operator Center overview & system metrics.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 border border-gray-200 rounded-md py-1.5 px-2.5 text-xs font-semibold text-gray-700 bg-white shadow-2xs hover:bg-gray-50 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Jan 1 - Jan 30, 2026
          </button>
          <button className="flex items-center justify-center border border-gray-200 rounded-md w-7 h-7 text-gray-700 bg-white shadow-2xs hover:bg-gray-50 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="mb-4">
        <h4 className="text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-2">Quick Actions</h4>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/businesses"
            className="bg-white border border-gray-200 rounded-md py-1 px-2.5 text-xs font-semibold text-gray-700 shadow-2xs hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
          >
            + Add Business
          </Link>
          <Link
            href="/business-users"
            className="bg-white border border-gray-200 rounded-md py-1 px-2.5 text-xs font-semibold text-gray-700 shadow-2xs hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
          >
            + Invite User
          </Link>
          <Link
            href="/receptionists"
            className="bg-white border border-gray-200 rounded-md py-1 px-2.5 text-xs font-semibold text-gray-700 shadow-2xs hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
          >
            Manage AI Receptionists
          </Link>
          <Link
            href="/security"
            className="bg-white border border-gray-200 rounded-md py-1 px-2.5 text-xs font-semibold text-gray-700 shadow-2xs hover:border-gray-300 transition-colors"
          >
            Security Events
          </Link>
          <Link
            href="/health"
            className="bg-white border border-gray-200 rounded-md py-1 px-2.5 text-xs font-semibold text-gray-700 shadow-2xs hover:border-gray-300 transition-colors"
          >
            System Health
          </Link>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <StatCard title="TOTAL BUSINESSES" value="128" change="+8% mo" isPositive={true} href="/businesses" />
        <StatCard title="ACTIVE BUSINESSES" value="113" change="88% active" isPositive={true} href="/businesses" />
        <StatCard title="AI RECEPTIONISTS" value="121" change="+12% growth" isPositive={true} href="/receptionists" />
        <StatCard title="CALLS TODAY" value="4,892" change="+1,201" isPositive={true} href="/calls" />
        
        <StatCard title="APPOINTMENTS TODAY" value="1,284" change="+240 today" isPositive={true} href="/appointments" />
        <StatCard title="ACTIVE SUBSCRIPTIONS" value="109" change="96% ret" isPositive={true} href="/billing" />
        <StatCard title="MONTHLY RECURRING REVENUE" value="€24,680" change="+€3,120" isPositive={true} href="/billing" />
        <StatCard title="AI RESOLUTION RATE" value="82.4%" change="+1.2%" isPositive={true} href="/receptionists" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        
        {/* Active Businesses Table */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-lg shadow-2xs flex flex-col overflow-hidden">
          <div className="px-4 py-2.5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-xs font-bold text-gray-900 tracking-tight">Active Businesses</h3>
            <Link href="/businesses" className="text-xs font-semibold text-[#2563EB] hover:underline">
              View All →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/60">
                  <th className="px-3.5 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Business</th>
                  <th className="px-3.5 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="px-3.5 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Country</th>
                  <th className="px-3.5 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">AI Status</th>
                  <th className="px-3.5 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Calls</th>
                  <th className="px-3.5 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Appts</th>
                  <th className="px-3.5 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-3.5 py-2 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { id: 'b-1', name: "Smile Dental Clinic", type: "Dental Clinic", country: "Netherlands", ai: "Active", calls: 128, appts: 34, plan: "Professional", status: "Active" },
                  { id: 'b-2', name: "Amsterdam Dental Care", type: "Dental Clinic", country: "Netherlands", ai: "Active", calls: 94, appts: 22, plan: "Business", status: "Active" },
                  { id: 'b-3', name: "Berlin Health Center", type: "Medical Center", country: "Germany", ai: "Paused", calls: 0, appts: 0, plan: "-", status: "Paused" },
                  { id: 'b-4', name: "Bella Rosa Restaurant", type: "Restaurant", country: "Italy", ai: "Active", calls: 67, appts: 18, plan: "Professional", status: "Active" },
                  { id: 'b-5', name: "Glow & Shine Salon", type: "Beauty Salon", country: "France", ai: "Active", calls: 45, appts: 12, plan: "Business", status: "Active" },
                ].map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-3.5 py-2.5 text-xs font-semibold text-gray-900 whitespace-nowrap">
                      <Link href={`/businesses/${b.id}`} className="hover:text-[#2563EB] transition-colors">
                        {b.name}
                      </Link>
                    </td>
                    <td className="px-3.5 py-2.5 text-xs text-gray-500 whitespace-nowrap">{b.type}</td>
                    <td className="px-3.5 py-2.5 text-xs text-gray-500 whitespace-nowrap">{b.country}</td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <Link
                        href="/receptionists"
                        className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          b.ai === 'Active' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-amber-50 text-amber-600'
                        } hover:opacity-80 transition-opacity`}
                      >
                        {b.ai}
                      </Link>
                    </td>
                    <td className="px-3.5 py-2.5 text-xs text-gray-600 whitespace-nowrap">{b.calls}</td>
                    <td className="px-3.5 py-2.5 text-xs text-gray-600 whitespace-nowrap">{b.appts}</td>
                    <td className="px-3.5 py-2.5 text-xs text-gray-500 whitespace-nowrap">{b.plan}</td>
                    <td className="px-3.5 py-2.5 whitespace-nowrap">
                      <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        b.status === 'Active' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {b.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-2xs flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-900 tracking-tight">AI Platform Health</h3>
            <Link href="/health" className="text-[11px] font-semibold text-[#2563EB] hover:underline">
              View Status →
            </Link>
          </div>
          <div className="flex-1">
            <HealthStatus name="API Services" status="Operational" />
            <HealthStatus name="Voice Services" status="Operational" />
            <HealthStatus name="Appointment Engine" status="Operational" />
            <HealthStatus name="Knowledge Processing" status="Operational" />
            <HealthStatus name="Notifications" status="Operational" />
            <HealthStatus name="Database" status="Operational" />
          </div>
        </div>

      </div>
    </div>
  );
}
