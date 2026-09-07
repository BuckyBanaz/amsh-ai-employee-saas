"use client";
import React from 'react';
import { NotificationsHeader } from '../../../components/dashboard/NotificationsHeader';
import { NotificationsList } from '../../../components/dashboard/NotificationsList';

export default function NotificationsPage() {
  return (
    <div className="animate-in fade-in duration-500 pt-4 pb-6 flex flex-col h-full w-full">
      <NotificationsHeader />
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        <NotificationsList />
      </div>
    </div>
  );
}
