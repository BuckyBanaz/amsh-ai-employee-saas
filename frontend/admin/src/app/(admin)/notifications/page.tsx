"use client";

import { useEffect, useState } from 'react';
import { adminFetch } from '@/lib/api';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadNotifications() {
      try {
        const response = await adminFetch<any>('/admin/notifications');
        setNotifications(response.notifications || []);
      } catch (err) {
        console.error('Failed to load notifications:', err);
      } finally {
        setLoading(false);
      }
    }
    loadNotifications();
  }, []);

  if (loading) {
    return <div className="p-5">Loading notifications...</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <header className="mb-4 pb-3 border-b border-[#E2E8F0] flex flex-wrap items-center justify-between gap-2.5">
        <div>
          <h1 className="text-lg font-bold tracking-tight text-[#0F172A] leading-tight">Notifications</h1>
          <p className="mt-0.5 text-xs text-[#475569] font-normal">Providers that need attention and recent account activity.</p>
        </div>
      </header>

      <div className="space-y-3">
        {notifications.length === 0 ? (
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-6 text-center shadow-2xs">
            <p className="text-sm text-[#475569]">No new notifications.</p>
          </div>
        ) : (
          notifications.map((notif: any) => (
            <div key={notif.id} className="flex items-start justify-between gap-4 rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-2xs">
              <div className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notif.level === 'error' ? 'bg-red-500' : notif.level === 'warning' ? 'bg-amber-500' : 'bg-slate-300'}`} aria-hidden="true" />
                <div>
                  <h3 className="text-sm font-bold text-[#1E293B]">{notif.title}</h3>
                  <p className="mt-0.5 text-sm text-[#475569]">{notif.message}</p>
                  {notif.link && <a href={notif.link} className="mt-1 inline-block text-xs font-medium text-[#0066FF] hover:underline">Open</a>}
                </div>
              </div>
              <span className="shrink-0 text-xs text-[#94A3B8]">{new Date(notif.date).toLocaleString()}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
