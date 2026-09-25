"use client";
import React, { useEffect, useState } from 'react';
import { StorageService } from '../../services/storage.service';
import { DashboardController } from '../../controllers/dashboard.controller';

export function TopBar() {
  const [userName, setUserName] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('');
  const [initials, setInitials] = useState<string>('U');
  const [formattedDate, setFormattedDate] = useState<string>('');

  useEffect(() => {
    // Current date
    const today = new Date();
    setFormattedDate(
      today.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    );

    // User info
    const cachedUser = StorageService.getUser();
    if (cachedUser) {
      const name = cachedUser.full_name || cachedUser.name || cachedUser.email?.split('@')[0] || '';
      setUserName(name);
      setInitials(name.slice(0, 2).toUpperCase() || 'U');
    }

    // Business info
    const cachedBusiness = StorageService.getBusiness();
    if (cachedBusiness?.name) {
      setBusinessName(cachedBusiness.name);
    } else {
      DashboardController.getBusinessInfo()
        .then((b) => {
          if (b?.name) setBusinessName(b.name);
        })
        .catch(() => {});
    }
  }, []);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <header className="flex items-center justify-between py-1.5 sm:py-2.5 mb-1 gap-3">
      <div className="min-w-0">
        <h1 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight leading-tight truncate">
          {getGreeting()}{userName ? `, ${userName}` : ''}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          Here is what is happening at {businessName || 'your business'} today.
        </p>
      </div>

      <div className="hidden sm:flex items-center gap-2.5 shrink-0">
        <span className="text-xs font-medium text-gray-500 hidden md:inline-block">
          {formattedDate}
        </span>
        <button className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors shadow-2xs">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </button>
        <div className="w-8 h-8 rounded-full bg-[#E0E7FF] text-[#0066FF] flex items-center justify-center text-xs font-bold cursor-pointer">
          {initials}
        </div>
      </div>
    </header>
  );
}

