import React from 'react';
import { Sidebar } from '../../components/admin/Sidebar';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-white overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 h-full overflow-hidden bg-[#F8FAFC] flex flex-col relative">
        {children}
      </main>
    </div>
  );
}
