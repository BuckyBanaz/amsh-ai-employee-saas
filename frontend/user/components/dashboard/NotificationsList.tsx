"use client";
import React from 'react';
import { ListSkeleton } from '../common/ShimmerSkeleton';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  iconType?: string;
  iconBg?: string;
  iconColor?: string;
}

interface NotificationsListProps {
  notifications: NotificationItem[];
  loading?: boolean;
}

const getIconForType = (type: string) => {
  switch (type) {
    case 'appt':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'transfer':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      );
    case 'system':
    case 'ai':
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
        </svg>
      );
    default:
      return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      );
  }
};

const getBadgeStyles = (type: string) => {
  switch (type) {
    case 'appt':
      return { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100' };
    case 'transfer':
      return { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-100' };
    case 'system':
    case 'ai':
      return { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-100' };
    default:
      return { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100' };
  }
};

export function NotificationsList({
  notifications,
  loading = false,
}: NotificationsListProps) {
  if (loading) {
    return <ListSkeleton count={6} />;
  }

  if (!notifications || notifications.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xs p-12 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0066FF] mb-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-gray-900">All caught up!</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-xs">
          No unread notifications or alerts found for your receptionist activity.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-xs overflow-hidden flex flex-col">
      <div className="divide-y divide-gray-50 flex-1 overflow-y-auto scrollbar-hide">
        {notifications.map((notification) => {
          const badge = getBadgeStyles(notification.type);
          return (
            <div
              key={notification.id}
              className={`p-4 sm:p-4.5 flex items-start gap-3.5 hover:bg-gray-50/70 transition-colors group relative ${
                notification.unread ? 'bg-blue-50/20' : 'bg-transparent'
              }`}
            >
              {/* Unread Indicator Dot */}
              <div className="w-2 flex-shrink-0 flex items-center justify-center pt-3">
                {notification.unread && (
                  <span className="w-1.5 h-1.5 bg-[#0066FF] rounded-full ring-2 ring-blue-100" />
                )}
              </div>

              {/* Icon Container */}
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border ${badge.bg} ${badge.text} ${badge.border}`}
              >
                {getIconForType(notification.type)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <h3
                    className={`text-xs font-bold tracking-tight truncate ${
                      notification.unread ? 'text-gray-900' : 'text-gray-800'
                    }`}
                  >
                    {notification.title}
                  </h3>
                  <span className="text-[11px] font-medium text-gray-400 whitespace-nowrap">
                    {notification.time}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-normal leading-relaxed line-clamp-2">
                  {notification.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
