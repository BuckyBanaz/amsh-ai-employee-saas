"use client";
import React, { useMemo, useSyncExternalStore } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { adminAuth, AdminUser, getUserSnapshot, subscribeSession } from '../../lib/api';

const navGroups = [
  {
    title: 'OVERVIEW',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'dashboard' },
    ]
  },
  {
    title: 'TENANTS',
    items: [
      { label: 'Businesses', href: '/businesses', icon: 'building' },
      { label: 'Business Owners', href: '/business-users', icon: 'users' },
      { label: 'AI Employees', href: '/receptionists', icon: 'bot' },
    ]
  },
  {
    title: 'OPERATIONS',
    items: [
      { label: 'Appointments', href: '/appointments', icon: 'calendar' },
      { label: 'Calls', href: '/calls', icon: 'phone' },
      { label: 'Conversations', href: '/conversations', icon: 'message' },
      { label: 'Customers', href: '/customers', icon: 'user' },
    ]
  },
  {
    title: 'PLATFORM',
    items: [
      { label: 'Vertical Templates', href: '/verticals', icon: 'layers' },
      { label: 'Message Templates', href: '/templates', icon: 'message' },
      { label: 'SEO', href: '/seo', icon: 'search' },
      { label: 'Integrations', href: '/integrations', icon: 'link' },
      { label: 'Usage & Limits', href: '/usage', icon: 'activity' },
      { label: 'Analytics', href: '/analytics', icon: 'bar-chart' },
      { label: 'Billing & Subscriptions', href: '/billing', icon: 'credit-card' },
    ]
  },
  {
    title: 'MONITORING',
    items: [
      { label: 'System Health', href: '/health', icon: 'heart' },
      { label: 'Audit Logs', href: '/audit', icon: 'shield' },
    ]
  },
  {
    title: 'SUPPORT',
    items: [
      { label: 'Tickets', href: '/tickets', icon: 'life-buoy' },
      { label: 'Announcements', href: '/announcements', icon: 'bell' },
    ]
  },
  {
    title: 'SETTINGS',
    items: [
      { label: 'Admin Users', href: '/admin-users', icon: 'users' },
      { label: 'Security', href: '/security', icon: 'lock' },
    ]
  },
];

const getIcon = (name: string) => {
  switch (name) {
    case 'dashboard': return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="9"></rect><rect x="14" y="3" width="7" height="5"></rect><rect x="14" y="12" width="7" height="9"></rect><rect x="3" y="16" width="7" height="5"></rect></svg>;
    case 'building': return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect><path d="M9 22v-4h6v4"></path><path d="M8 6h.01"></path><path d="M16 6h.01"></path><path d="M12 6h.01"></path><path d="M12 10h.01"></path><path d="M12 14h.01"></path><path d="M16 10h.01"></path><path d="M16 14h.01"></path><path d="M8 10h.01"></path><path d="M8 14h.01"></path></svg>;
    case 'users': return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
    case 'bot': return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 8V4H8"></path><rect x="4" y="8" width="16" height="12" rx="2"></rect><path d="M2 14h2"></path><path d="M20 14h2"></path><path d="M15 13v2"></path><path d="M9 13v2"></path></svg>;
    case 'phone': return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;
    case 'calendar': return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
    case 'message': return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
    case 'user': return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
    case 'link': return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;
    case 'activity': return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
    case 'bar-chart': return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="20" x2="12" y2="10"></line><line x1="18" y1="20" x2="18" y2="4"></line><line x1="6" y1="20" x2="6" y2="16"></line></svg>;
    case 'credit-card': return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
    case 'life-buoy': return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><circle cx="12" cy="12" r="4"></circle><line x1="4.93" y1="4.93" x2="9.17" y2="9.17"></line><line x1="14.83" y1="14.83" x2="19.07" y2="19.07"></line><line x1="14.83" y1="9.17" x2="19.07" y2="4.93"></line><line x1="4.93" y1="19.07" x2="9.17" y2="14.83"></line></svg>;
    case 'bell': return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>;
    case 'shield': return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>;
    case 'lock': return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>;
    case 'heart': return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>;
    case 'search': return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>;
    case 'layers': return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 12 12 17 22 12"></polyline><polyline points="2 17 12 22 22 17"></polyline></svg>;
    default: return null;
  }
};

export function Sidebar() {
  const router = useRouter();
  const rawAdmin = useSyncExternalStore(subscribeSession, getUserSnapshot, () => null);
  const admin = useMemo<AdminUser | null>(() => {
    try {
      return rawAdmin ? (JSON.parse(rawAdmin) as AdminUser) : null;
    } catch {
      return null;
    }
  }, [rawAdmin]);
  const pathname = usePathname();

  return (
    <aside className="w-[220px] bg-white border-r border-[#E2E8F0] flex flex-col h-screen flex-shrink-0 text-[#334155] select-none">
      {/* Brand Header */}
      <div className="p-3 border-b border-[#F1F5F9] space-y-2">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 bg-[#2563EB] rounded-lg flex items-center justify-center shadow-xs shrink-0">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
            </svg>
          </div>
          <span className="text-base font-bold tracking-tight text-[#0F172A]">Amsh</span>
        </div>

        {/* Dropdown Selector Pill */}
        <div className="flex items-center justify-between px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#0F172A] hover:bg-[#F1F5F9] transition-colors cursor-pointer">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded bg-[#2563EB] text-white flex items-center justify-center shrink-0">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 21h18M3 7v14M21 7v14M9 21V3h6v18" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-bold text-[#0F172A] truncate leading-tight">All Clinics</div>
              <div className="text-[9px] text-[#64748B] font-normal truncate">Operator Center</div>
            </div>
          </div>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#64748B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-2 py-2 space-y-3">
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            <h4 className="text-[9px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1 px-2.5">
              {group.title}
            </h4>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link key={item.label} href={item.href} className="block group/item">
                    <div className={`flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg transition-colors ${
                      isActive 
                        ? 'bg-[#EFF6FF] text-[#2563EB] font-bold' 
                        : 'text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                    }`}>
                      <span className={`${isActive ? 'text-[#2563EB]' : 'text-[#94A3B8] group-hover/item:text-[#475569]'} transition-colors shrink-0`}>
                        {getIcon(item.icon)}
                      </span>
                      <span className="text-xs truncate">
                        {item.label}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Profile */}
      <div className="p-2.5 border-t border-[#F1F5F9]">
        <div className="flex items-center justify-between p-1.5 rounded-lg hover:bg-[#F8FAFC] transition-colors">
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-7 h-7 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-[#4F46E5] flex flex-shrink-0 items-center justify-center font-bold text-[10px]">
              {(admin?.name || 'PV').split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-[#0F172A] truncate">{admin?.name || 'Parikshit Verma'}</span>
              <span className="text-[10px] text-[#64748B] truncate">{admin?.role === 'superadmin' ? 'Super Admin' : 'Super Admin'}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              adminAuth.clear();
              router.replace('/login');
            }}
            title="Sign out"
            className="p-1.5 text-[#94A3B8] hover:text-red-600 rounded-md hover:bg-red-50 transition-colors shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
