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
    <div className={`bg-white border border-gray-200 rounded-xl p-5 shadow-sm transition-all ${
      href ? 'hover:border-[#2563EB]/40 hover:shadow-md cursor-pointer' : ''
    }`}>
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-widest">{title}</h3>
      </div>
      <div className="flex items-end justify-between">
        <div className="text-[28px] font-black text-gray-900 tracking-tight leading-none">{value}</div>
        {change && (
          <span className={`text-[12px] font-bold ${isPositive ? 'text-[#059669]' : 'text-red-500'}`}>
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
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <span className="text-[13px] font-bold text-gray-900">{name}</span>
      <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-bold ${
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
    <div className="flex-1 overflow-y-auto scrollbar-hide p-8 animate-in fade-in duration-500">
      
      {/* Header */}
      <header className="mb-6 flex justify-between items-start">
        <div>
          <h1 className="text-[24px] font-extrabold text-gray-900 tracking-tight leading-tight flex items-center gap-2">
            Good morning, Parikshit
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-400">
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0" />
              <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2" />
              <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8" />
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15" />
            </svg>
          </h1>
          <p className="text-[14px] text-gray-500 mt-1 font-medium">
            Here's what's happening across your platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-gray-200 rounded-lg py-2 px-3 text-[13px] font-bold text-gray-700 bg-white shadow-sm hover:bg-gray-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Jan 1 - Jan 30, 2026
          </button>
          <button className="flex items-center justify-center border border-gray-200 rounded-lg w-9 h-9 text-gray-700 bg-white shadow-sm hover:bg-gray-50 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>
      </header>

      {/* Quick Actions */}
      <div className="mb-6">
        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Quick Actions</h4>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/businesses"
            className="bg-white border border-gray-200 rounded-lg py-1.5 px-3.5 text-[12px] font-bold text-gray-700 shadow-sm hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
          >
            Add Business
          </Link>
          <Link
            href="/business-users"
            className="bg-white border border-gray-200 rounded-lg py-1.5 px-3.5 text-[12px] font-bold text-gray-700 shadow-sm hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
          >
            Invite Admin / User
          </Link>
          <Link
            href="/receptionists"
            className="bg-white border border-gray-200 rounded-lg py-1.5 px-3.5 text-[12px] font-bold text-gray-700 shadow-sm hover:border-[#2563EB] hover:text-[#2563EB] transition-colors"
          >
            Manage AI Receptionists
          </Link>
          {['View Security Events', 'View Failed Payments', 'View System Health'].map(action => (
            <button key={action} className="bg-white border border-gray-200 rounded-lg py-1.5 px-3.5 text-[12px] font-bold text-gray-700 shadow-sm hover:border-gray-300 transition-colors">
              {action}
            </button>
          ))}
        </div>
      </div>

      {/* Top Stats (Interconnected to target views) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard title="TOTAL BUSINESSES" value="128" change="+8% this mo" isPositive={true} href="/businesses" />
        <StatCard title="ACTIVE BUSINESSES" value="113" change="88% rate" isPositive={true} href="/businesses" />
        <StatCard title="AI RECEPTIONISTS" value="121" change="+12% growth" isPositive={true} href="/receptionists" />
        <StatCard title="CALLS TODAY" value="4,892" change="+1,201 vs yesterday" isPositive={true} href="/calls" />
        
        <StatCard title="APPOINTMENTS TODAY" value="1,284" change="+240 bookings" isPositive={true} href="/appointments" />
        <StatCard title="ACTIVE SUBSCRIPTIONS" value="109" change="96% retention" isPositive={true} />
        <StatCard title="MONTHLY RECURRING REVENUE" value="€24,680" change="+€3,120 growth" isPositive={true} />
        <StatCard title="AI RESOLUTION RATE" value="82.4%" change="+1.2% efficiency" isPositive={true} href="/receptionists" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Active Businesses Table */}
        <div className="lg:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm flex flex-col overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex justify-between items-center">
            <h3 className="text-[15px] font-bold text-gray-900">Active Businesses</h3>
            <Link href="/businesses" className="text-[12px] font-bold text-[#2563EB] hover:underline">
              View All →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Business</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Business Type</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Country</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">AI Status</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Calls Today</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Appts</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Plan</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { id: 'b-1', name: "Smile Dental Clinic", type: "Dental Clinic", country: "Netherlands", ai: "Active", calls: 128, appts: 34, plan: "Professional", status: "Active" },
                  { id: 'b-2', name: "Amsterdam Dental Care", type: "Dental Clinic", country: "Netherlands", ai: "Active", calls: 94, appts: 22, plan: "Business", status: "Active" },
                  { id: 'b-3', name: "Berlin Health Center", type: "Medical Center", country: "Germany", ai: "Paused", calls: 0, appts: 0, plan: "", status: "" },
                  { id: 'b-4', name: "Bella Rosa Restaurant", type: "Restaurant", country: "Italy", ai: "Active", calls: 67, appts: 18, plan: "Professional", status: "Active" },
                  { id: 'b-5', name: "Glow & Shine Salon", type: "Beauty Salon", country: "France", ai: "Active", calls: 45, appts: 12, plan: "Business", status: "Active" },
                ].map((b) => (
                  <tr key={b.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-4 text-[13px] font-bold text-gray-900 whitespace-nowrap">
                      <Link href={`/businesses/${b.id}`} className="hover:text-[#2563EB] transition-colors">
                        {b.name}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-gray-500 whitespace-nowrap">{b.type}</td>
                    <td className="px-5 py-4 text-[13px] text-gray-500 whitespace-nowrap">{b.country}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      <Link
                        href="/receptionists"
                        className={`inline-flex px-2 py-0.5 rounded text-[11px] font-bold ${
                          b.ai === 'Active' ? 'bg-[#ECFDF5] text-[#059669]' : 'bg-amber-50 text-amber-600'
                        } hover:opacity-80 transition-opacity`}
                      >
                        {b.ai}
                      </Link>
                    </td>
                    <td className="px-5 py-4 text-[13px] text-gray-600 whitespace-nowrap">{b.calls}</td>
                    <td className="px-5 py-4 text-[13px] text-gray-600 whitespace-nowrap">{b.appts}</td>
                    <td className="px-5 py-4 text-[13px] text-gray-500 whitespace-nowrap">{b.plan}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {b.status && <span className="inline-flex px-2 py-0.5 rounded text-[11px] font-bold bg-[#ECFDF5] text-[#059669]">{b.status}</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Health */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm flex flex-col">
          <h3 className="text-[15px] font-bold text-gray-900 mb-4">AI Platform Health</h3>
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
