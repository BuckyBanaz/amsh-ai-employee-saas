"use client";

import React from 'react';
import { Sidebar } from '../../components/dashboard/Sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#F9FAFB] font-sans">
      <Sidebar />
      <main className="flex-1 overflow-auto flex flex-col">
        <div className="w-full px-6 md:px-10 pb-20 flex-1 flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}
