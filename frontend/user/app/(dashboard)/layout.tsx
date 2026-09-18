"use client";

import React from 'react';
import { Sidebar } from '../../components/dashboard/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F9FAFB] font-sans antialiased text-gray-900">
      <Sidebar />
      <main className="flex-1 overflow-y-auto flex flex-col">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-3 pb-10 flex-1 flex flex-col max-w-[1600px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
