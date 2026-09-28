"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

interface NotificationsHeaderProps {
  activeFilter?: string;
  onFilterChange?: (filter: string) => void;
  onMarkAllRead?: () => void;
}

export function NotificationsHeader({
  activeFilter = 'All',
  onFilterChange,
  onMarkAllRead,
}: NotificationsHeaderProps = {}) {
  const filterList = [
    { id: 'All', label: 'All' },
    { id: 'appt', label: 'Appointments' },
    { id: 'transfer', label: 'Call Transfers' },
    { id: 'system', label: 'System & AI' },
  ];

  return (
    <div className="mb-3 shrink-0">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 py-1">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">
            {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.TITLE}
          </h1>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.SUBTITLE}
          </p>
        </div>

        {onMarkAllRead && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onMarkAllRead}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold text-[#0066FF] hover:bg-blue-50 transition-colors border border-blue-200/60 bg-blue-50/50 cursor-pointer active:scale-95"
            >
              {STRINGS.DASHBOARD.HEADERS.NOTIFICATIONS.MARK_READ}
            </button>
          </div>
        )}
      </header>

      {/* Filter Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-1">
        {filterList.map((f) => {
          const isActive = activeFilter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => onFilterChange?.(f.id)}
              className={`px-3 py-1 rounded-lg text-xs font-bold whitespace-nowrap transition-colors cursor-pointer ${
                isActive
                  ? 'bg-[#0066FF] text-white shadow-xs'
                  : 'border border-gray-200 text-gray-600 bg-white hover:bg-gray-50 shadow-2xs'
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
