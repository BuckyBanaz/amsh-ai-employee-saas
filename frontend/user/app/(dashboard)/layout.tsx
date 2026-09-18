"use client";

import React, { useState } from 'react';
import { Sidebar } from '../../components/dashboard/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-[#F9FAFB] font-sans antialiased text-gray-900 overflow-hidden">
      {/* Responsive Sidebar (Persistent on Desktop, Drawer on Mobile/Tablet) */}
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden min-w-0">
        {/* Mobile & Tablet Top Bar (Visible only on < lg screens) */}
        <header className="lg:hidden flex items-center justify-between px-4 py-2.5 bg-white border-b border-gray-100 shadow-2xs flex-shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="p-1.5 -ml-1 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none"
              aria-label="Open sidebar menu"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>

            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-[#0066FF] rounded-md flex items-center justify-center">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M12 4v16m-4-10v4m8-8v12" />
                </svg>
              </div>
              <span className="text-sm font-bold text-gray-900 tracking-tight">Amsh</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-gray-600 truncate max-w-[120px] sm:max-w-[180px]">
              Smile Dental Clinic
            </span>
            <div className="w-7 h-7 rounded-full bg-[#E0E7FF] text-[#0066FF] flex items-center justify-center text-xs font-bold">
              SW
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="w-full px-3.5 sm:px-6 lg:px-8 py-3 pb-10 flex-1 flex flex-col max-w-[1600px] mx-auto min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
