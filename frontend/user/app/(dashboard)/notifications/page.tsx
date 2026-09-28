"use client";
import React, { useState, useEffect } from 'react';
import { NotificationsHeader } from '../../../components/dashboard/NotificationsHeader';
import { NotificationsList, NotificationItem } from '../../../components/dashboard/NotificationsList';
import { DashboardController } from '../../../controllers/dashboard.controller';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState('All');

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const data = await DashboardController.getNotifications();
      setNotifications(data || []);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await DashboardController.markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeFilter === 'All') return true;
    return n.type === activeFilter;
  });

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-8 flex flex-col h-full w-full">
      <NotificationsHeader
        activeFilter={activeFilter}
        onFilterChange={setActiveFilter}
        onMarkAllRead={handleMarkAllRead}
      />
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        <NotificationsList notifications={filteredNotifications} loading={loading} />
      </div>
    </div>
  );
}
