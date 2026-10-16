"use client";
import React, { useEffect, useState } from 'react';
import { StorageService } from '../../services/storage.service';
import { DashboardController } from '../../controllers/dashboard.controller';

export function TopBar() {
  const [userName, setUserName] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [initials, setInitials] = useState<string>('');
  const [formattedDate, setFormattedDate] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const updateDateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
      setFormattedDate(`${dateStr} • ${timeStr}`);
    };

    updateDateTime();
    const interval = setInterval(updateDateTime, 30000);

    // User info
    const cachedUser = StorageService.getUser();
    if (cachedUser) {
      const name = cachedUser.full_name || cachedUser.name || cachedUser.email?.split('@')[0] || '';
      if (name) {
        setUserName(name);
        const parts = name.trim().split(' ');
        if (parts.length >= 2) {
          setInitials((parts[0][0] + parts[1][0]).toUpperCase());
        } else {
          setInitials(name.slice(0, 2).toUpperCase());
        }
      }
    }

    // Business info
    const cachedBusiness = StorageService.getBusiness();
    if (cachedBusiness?.name) {
      setBusinessName(cachedBusiness.name);
      setLoading(false);
    } else {
      DashboardController.getBusinessInfo()
        .then((b) => {
          if (b?.name) setBusinessName(b.name);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }

    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 py-1">
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight flex items-center gap-1.5">
          {userName ? (
            <span>{getGreeting()}, {userName}</span>
          ) : (
            <span className="flex items-center gap-2">
              <span>{getGreeting()}</span>
              <span className="inline-block w-24 h-5 bg-gray-200 animate-pulse rounded-md align-middle" />
            </span>
          )}
          <span className="inline-block animate-bounce select-none text-base sm:text-lg">👋</span>
        </h1>
        <p className="text-xs text-gray-500 font-medium mt-0.5 truncate flex items-center gap-1">
          <span>Here&apos;s what&apos;s happening at</span>
          {businessName ? (
            <span className="font-semibold text-gray-700">{businessName}</span>
          ) : (
            <span className="inline-block w-28 h-3.5 bg-gray-200 animate-pulse rounded align-middle" />
          )}
          <span>today.</span>
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-2.5 shrink-0">
        {formattedDate ? (
          <span className="text-xs font-semibold text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-lg shadow-2xs">
            {formattedDate}
          </span>
        ) : (
          <span className="inline-block w-48 h-7 bg-gray-100 animate-pulse rounded-lg border border-gray-200/50" />
        )}
      </div>
    </header>
  );
}
