import React from 'react';
import { Sidebar } from '../../components/admin/Sidebar';
import { AdminGuard } from '../../components/admin/AdminGuard';
import { SampleDataBanner } from '../../components/admin/SampleDataBanner';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard>
      <div className="flex h-screen w-full bg-white overflow-hidden">
        <Sidebar />
        <main className="flex-1 min-w-0 h-full overflow-hidden bg-[#F8FAFC] flex flex-col relative">
          <SampleDataBanner />
          {children}
        </main>
      </div>
    </AdminGuard>
  );
}
