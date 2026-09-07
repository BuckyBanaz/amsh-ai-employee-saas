"use client";
import React from 'react';

import { STRINGS } from '../../utils/strings/en';

// Helper function to map string IDs or icon types back to the actual JSX elements if needed
// Note: Since icons are JSX, we keep the mapping logic in the component, or we can just iterate the mock data from STRINGS 
// and assign the JSX icon dynamically based on the type string.

const notificationsData = STRINGS.TABLES.NOTIFICATIONS.MOCK_DATA;

const getIconForType = (type: string) => {
  switch (type) {
    case 'appt':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
    case 'transfer':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;
    case 'knowledge':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>;
    case 'sync':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>;
    case 'check':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>;
    case 'invoice':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>;
    case 'patient':
      return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>;
    default:
      return null;
  }
};

export function NotificationsList() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden flex flex-col">
      <div className="divide-y divide-gray-50 flex-1 overflow-y-auto scrollbar-hide pb-4">
        {notificationsData.map((notification) => (
          <div 
            key={notification.id} 
            className={`p-5 flex items-start gap-4 hover:bg-gray-50/50 transition-colors cursor-pointer group relative ${notification.unread ? 'bg-white' : 'bg-transparent'}`}
          >
            {/* Unread Indicator */}
            <div className="w-2 flex-shrink-0 flex items-center justify-center pt-3">
              {notification.unread && (
                <div className="w-1.5 h-1.5 bg-[#0066FF] rounded-full"></div>
              )}
            </div>

            {/* Icon */}
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${notification.iconBg} ${notification.iconColor}`}>
              {getIconForType(notification.iconType)}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 pr-4">
              <h3 className={`text-[14px] font-extrabold mb-1 tracking-tight ${notification.unread ? 'text-gray-900' : 'text-gray-800'}`}>
                {notification.title}
              </h3>
              <p className="text-[13px] font-medium text-gray-500 leading-snug truncate">
                {notification.description}
              </p>
            </div>

            {/* Timestamp */}
            <div className="flex-shrink-0 pt-0.5">
              <span className={`text-[11px] font-bold ${notification.unread ? 'text-gray-500' : 'text-gray-400'}`}>
                {notification.time}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
