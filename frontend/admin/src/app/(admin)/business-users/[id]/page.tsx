"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function UserDetailPage() {
  const params = useParams();
  const [activeTab, setActiveTab] = useState<'businesses' | 'activity' | 'permissions'>('businesses');

  // Associated businesses for this user
  const associatedBusinesses = [
    {
      id: 'b-1',
      name: 'Smile Dental Clinic',
      type: 'Dental Clinic',
      typeColor: { bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]' },
      country: 'NL',
      aiReceptionist: 'Sarah',
      plan: 'Professional',
      usagePercent: 78,
      status: 'Active',
      roleInBusiness: 'Primary Owner',
      appointmentsToday: 34,
      callsToday: 128,
    },
    {
      id: 'b-2',
      name: 'Amsterdam Dental Care',
      type: 'Dental Clinic',
      typeColor: { bg: 'bg-[#DBEAFE]', text: 'text-[#1D4ED8]' },
      country: 'NL',
      aiReceptionist: 'Anna',
      plan: 'Business',
      usagePercent: 92,
      status: 'Active',
      roleInBusiness: 'Managing Partner',
      appointmentsToday: 22,
      callsToday: 94,
    },
  ];

  const activityLogs = [
    {
      id: 'act-1',
      action: 'Updated AI Voice Prompt Configuration',
      target: 'Smile Dental Clinic',
      time: '2 hours ago',
      ip: '194.109.12.84 (Amsterdam, NL)',
    },
    {
      id: 'act-2',
      action: 'Downloaded Call Recordings & Transcripts',
      target: 'Smile Dental Clinic',
      time: 'Yesterday at 4:15 PM',
      ip: '194.109.12.84 (Amsterdam, NL)',
    },
    {
      id: 'act-3',
      action: 'Upgraded Subscription Plan to Professional',
      target: 'Amsterdam Dental Care',
      time: 'Nov 02, 2025',
      ip: '82.161.44.12 (Utrecht, NL)',
    },
    {
      id: 'act-4',
      action: 'Added Business User (Receptionist)',
      target: 'Smile Dental Clinic',
      time: 'Oct 28, 2025',
      ip: '194.109.12.84 (Amsterdam, NL)',
    },
  ];

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-8 animate-in fade-in duration-500">
      {/* Breadcrumb / Back button */}
      <div className="mb-4">
        <Link
          href="/business-users"
          className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#475569] hover:text-[#2563EB] transition-colors"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Business Users
        </Link>
      </div>

      {/* Top Banner */}
      <div className="mb-5 flex items-center justify-between px-4 py-2 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg text-[#2563EB]">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            <circle cx="12" cy="10" r="3"></circle>
          </svg>
          <span className="text-[12px] font-bold uppercase tracking-wide">
            TENANT USER PROFILE: DR. SARAH WILSON (ID: {params?.id || 'u-1'})
          </span>
        </div>
        <span className="text-[11px] font-semibold bg-white/80 px-2 py-0.5 rounded border border-[#BFDBFE]">
          2FA Verified
        </span>
      </div>

      {/* User Header Profile Card */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-6 shadow-sm mb-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          {/* User Left Details */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#EFF6FF] border-2 border-[#BFDBFE] text-[#2563EB] font-bold text-2xl flex items-center justify-center shadow-inner">
              SW
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight">
                  Dr. Sarah Wilson
                </h1>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#EFF6FF] text-[#2563EB]">
                  Owner
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#D1FAE5] text-[#065F46]">
                  ● Active Account
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-[13px] text-[#475569] mt-1.5">
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#94A3B8]">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                    <polyline points="22,6 12,13 2,6"></polyline>
                  </svg>
                  sarah.w@smile.nl
                </span>
                <span className="flex items-center gap-1.5">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#94A3B8]">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                  +31 20 555 0192
                </span>
                <span className="text-[#94A3B8]">
                  Joined: Oct 12, 2025
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button className="px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[12px] font-semibold text-[#0F172A] hover:bg-gray-50 shadow-sm transition-colors">
              Reset Password
            </button>
            <button className="px-3 py-2 bg-white border border-[#EF4444] rounded-lg text-[12px] font-semibold text-[#EF4444] hover:bg-red-50 shadow-sm transition-colors">
              Suspend Access
            </button>
            <button className="px-3.5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-[12px] font-semibold shadow-sm transition-colors">
              Edit User Info
            </button>
          </div>
        </div>

        {/* 4 Quick Stat Cards in Profile */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mt-6 pt-5 border-t border-[#E2E8F0]">
          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
              Associated Businesses
            </div>
            <div className="text-[20px] font-bold text-[#0F172A]">
              {associatedBusinesses.length} Clinics
            </div>
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
              Total Managed Calls
            </div>
            <div className="text-[20px] font-bold text-[#0F172A]">
              5,312 calls
            </div>
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
              Security Level
            </div>
            <div className="text-[14px] font-bold text-[#10B981] mt-1 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#10B981]"></span>
              Tier 1 (Admin Full)
            </div>
          </div>

          <div className="p-3 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0]">
            <div className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
              Last Active Session
            </div>
            <div className="text-[14px] font-bold text-[#0F172A] mt-1">
              10 min ago (Amsterdam)
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Switcher for Associated Details */}
      <div className="flex items-center gap-2 mb-4 border-b border-[#E2E8F0] pb-2">
        <button
          onClick={() => setActiveTab('businesses')}
          className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
            activeTab === 'businesses'
              ? 'bg-[#EFF6FF] text-[#2563EB]'
              : 'text-[#475569] hover:bg-gray-100/70 hover:text-[#0F172A]'
          }`}
        >
          Associated Businesses ({associatedBusinesses.length})
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`px-3.5 py-1.5 rounded-lg text-[13px] font-semibold transition-colors ${
            activeTab === 'activity'
              ? 'bg-[#EFF6FF] text-[#2563EB]'
              : 'text-[#475569] hover:bg-gray-100/70 hover:text-[#0F172A]'
          }`}
        >
          User Audit & Activity Log
        </button>
      </div>

      {/* TAB 1: Associated Businesses (Previous Screen Design Integrated Below) */}
      {activeTab === 'businesses' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-[18px] font-bold text-[#0F172A] tracking-tight">
                Businesses Managed by Dr. Sarah Wilson
              </h2>
              <p className="text-[13px] text-[#475569] mt-0.5">
                All platform tenants and businesses linked to this user&apos;s administrative authority.
              </p>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E2E8F0] hover:bg-gray-50 text-[#0F172A] rounded-lg text-[12px] font-semibold shadow-sm transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Assign to New Business
            </button>
          </div>

          {/* Businesses Table (Exact same columns and rich styling as the Businesses screen) */}
          <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                    <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[170px]">
                      Business Name
                    </th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[130px]">
                      Type
                    </th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[140px]">
                      Role in Business
                    </th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[80px]">
                      Country
                    </th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[120px]">
                      AI Receptionist
                    </th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[110px]">
                      Plan
                    </th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[130px]">
                      Usage (API)
                    </th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[90px]">
                      Status
                    </th>
                    <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider text-right min-w-[110px]">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E2E8F0]">
                  {associatedBusinesses.map((b) => (
                    <tr key={b.id} className="hover:bg-[#F8FAFC]/70 transition-colors">
                      {/* Name */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <Link
                          href={`/businesses/${b.id}`}
                          className="text-[14px] font-semibold text-[#0F172A] hover:text-[#2563EB] transition-colors flex items-center gap-1.5"
                        >
                          {b.name}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#94A3B8]">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                        </Link>
                        <div className="text-[11px] text-[#94A3B8] font-normal">
                          Today: {b.callsToday} calls · {b.appointmentsToday} appts
                        </div>
                      </td>

                      {/* Type */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${b.typeColor.bg} ${b.typeColor.text}`}>
                          {b.type}
                        </span>
                      </td>

                      {/* Role in Business */}
                      <td className="px-4 py-3.5 text-[13px] font-medium text-[#0F172A] whitespace-nowrap">
                        {b.roleInBusiness}
                      </td>

                      {/* Country */}
                      <td className="px-4 py-3.5 text-[13px] text-[#475569] whitespace-nowrap">
                        {b.country}
                      </td>

                      {/* AI Receptionist */}
                      <td className="px-4 py-3.5 text-[13px] font-medium text-[#2563EB] whitespace-nowrap">
                        {b.aiReceptionist}
                      </td>

                      {/* Plan */}
                      <td className="px-4 py-3.5 text-[13px] font-medium text-[#475569] whitespace-nowrap">
                        {b.plan}
                      </td>

                      {/* Usage Progress */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="w-[100px] h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#2563EB] rounded-full transition-all"
                            style={{ width: `${b.usagePercent}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-[#94A3B8] font-semibold mt-0.5 block">
                          {b.usagePercent}% limit used
                        </span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#D1FAE5] text-[#065F46]">
                          {b.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3.5 text-right whitespace-nowrap">
                        <Link
                          href={`/businesses/${b.id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#E2E8F0] rounded-md text-[11px] font-semibold text-[#2563EB] hover:bg-blue-50 transition-colors"
                        >
                          Manage
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 18 15 12 9 6"></polyline>
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Audit & Activity Log */}
      {activeTab === 'activity' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 shadow-sm">
          <h3 className="text-[15px] font-bold text-[#0F172A] mb-4">
            Recent Audit & Security Trail
          </h3>
          <div className="divide-y divide-[#E2E8F0]">
            {activityLogs.map((log) => (
              <div key={log.id} className="py-3.5 flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-semibold text-[#0F172A]">
                    {log.action}
                  </div>
                  <div className="text-[12px] text-[#94A3B8] mt-0.5">
                    Target: <span className="text-[#475569] font-medium">{log.target}</span> · IP: {log.ip}
                  </div>
                </div>
                <span className="text-[12px] text-[#94A3B8] font-medium">
                  {log.time}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
