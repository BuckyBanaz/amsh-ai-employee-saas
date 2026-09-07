"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { STRINGS } from '../../utils/strings/en';

const navGroups = [
  {
    title: STRINGS.SIDEBAR.GROUPS.MAIN,
    items: [
      { label: STRINGS.SIDEBAR.LINKS.DASHBOARD, href: '/dashboard', icon: 'dashboard' },
      { label: STRINGS.SIDEBAR.LINKS.APPOINTMENTS, href: '/appointments', icon: 'calendar' },
      { label: STRINGS.SIDEBAR.LINKS.PATIENTS, href: '/patients', icon: 'activity' },
      { label: STRINGS.SIDEBAR.LINKS.DOCTORS, href: '/doctors', icon: 'users' },
      { label: STRINGS.SIDEBAR.LINKS.CALL_LOGS, href: '/calls', icon: 'phone' },
    ]
  },
  {
    title: STRINGS.SIDEBAR.GROUPS.AI_SETTINGS,
    items: [
      { label: STRINGS.SIDEBAR.LINKS.AI_RECEPTIONIST, href: '/ai', icon: 'bot' },
      { label: STRINGS.SIDEBAR.LINKS.KNOWLEDGE_BASE, href: '/knowledge', icon: 'book' },
      { label: STRINGS.SIDEBAR.LINKS.AI_CONVERSATIONS, href: '/conversations', icon: 'zap' },
    ]
  },
  {
    title: STRINGS.SIDEBAR.GROUPS.BUSINESS,
    items: [
      { label: STRINGS.SIDEBAR.LINKS.SERVICES, href: '/services', icon: 'list' },
      { label: STRINGS.SIDEBAR.LINKS.INTEGRATIONS, href: '/integrations', icon: 'settings' },
      { label: STRINGS.SIDEBAR.LINKS.ANALYTICS, href: '/analytics', icon: 'chart' },
    ]
  },
  {
    title: STRINGS.SIDEBAR.GROUPS.SYSTEM,
    items: [
      { label: STRINGS.SIDEBAR.LINKS.NOTIFICATIONS, href: '/notifications', icon: 'bell', badge: 3 },
      { label: STRINGS.SIDEBAR.LINKS.TEAM, href: '/team', icon: 'activity' },
      { label: STRINGS.SIDEBAR.LINKS.BILLING, href: '/billing', icon: 'credit-card' },
      { label: STRINGS.SIDEBAR.LINKS.SETTINGS, href: '/settings', icon: 'sliders' },
    ]
  }
];

const getIcon = (name: string) => {
  // Return standard feather-like svg icons based on name
  switch (name) {
    case 'dashboard': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
    case 'calendar': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
    case 'activity': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>;
    case 'users': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>;
    case 'phone': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;
    case 'bot': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>;
    case 'book': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>;
    case 'zap': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>;
    case 'list': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>;
    case 'settings': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>;
    case 'chart': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>;
    case 'bell': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>;
    case 'credit-card': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
    case 'sliders': return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"></line><line x1="4" y1="10" x2="4" y2="3"></line><line x1="12" y1="21" x2="12" y2="12"></line><line x1="12" y1="8" x2="12" y2="3"></line><line x1="20" y1="21" x2="20" y2="16"></line><line x1="20" y1="12" x2="20" y2="3"></line><line x1="1" y1="14" x2="7" y2="14"></line><line x1="9" y1="8" x2="15" y2="8"></line><line x1="17" y1="16" x2="23" y2="16"></line></svg>;
    default: return null;
  }
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-[260px] bg-white border-r border-gray-100 flex flex-col h-screen flex-shrink-0 font-sans">
      
      {/* Logo & Dropdown */}
      <div className="p-5">
        <div className="flex items-center gap-2.5 mb-6">
          <div className="w-8 h-8 bg-[#0066FF] rounded-lg flex items-center justify-center">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 4v16m-4-10v4m8-8v12" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight text-gray-900">{STRINGS.APP.NAME}</span>
        </div>

        <div className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors">
          <div>
            <h3 className="text-[13px] font-bold text-gray-900 leading-tight">Smile Dental Clinic</h3>
            <p className="text-[11px] text-gray-500 font-medium mt-0.5">Amsterdam, NL</p>
          </div>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-500">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </div>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto scrollbar-hide px-3 pb-6 space-y-6">
        
        {navGroups.map((group, groupIdx) => (
          <div key={groupIdx}>
            <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider px-3 mb-2">
              {group.title}
            </h4>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link key={item.label} href={item.href} className="block group/item">
                    <div className={`flex items-center justify-between px-3 py-2 rounded-lg transition-colors ${
                      isActive ? 'bg-[#F0F7FF] text-[#0066FF]' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}>
                      <div className="flex items-center gap-3">
                        <span className={`${isActive ? 'text-[#0066FF]' : 'text-gray-400 group-hover/item:text-gray-600'} transition-colors`}>
                          {getIcon(item.icon)}
                        </span>
                        <span className={`text-[13px] font-semibold ${isActive ? 'text-[#0066FF]' : ''}`}>
                          {item.label}
                        </span>
                      </div>
                      
                      {item.badge && (
                        <span className="w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center leading-none">
                          {item.badge}
                        </span>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom Profile */}
      <div className="p-4 border-t border-gray-100">
        <div className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors">
          <div className="w-9 h-9 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-sm">
            SW
          </div>
          <div className="flex-1 overflow-hidden">
            <h2 className="text-[13px] font-bold text-gray-900 truncate">Dr. Sarah Wilson</h2>
            <p className="text-[11px] text-gray-500 truncate mt-0.5">sarah@smileclinic.com</p>
          </div>
        </div>
      </div>

    </aside>
  );
}
