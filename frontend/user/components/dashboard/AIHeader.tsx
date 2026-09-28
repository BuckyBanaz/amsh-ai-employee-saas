"use client";
import React, { useState, useEffect } from 'react';
import { STRINGS } from '../../utils/strings/en';
import { StorageService } from '../../services/storage.service';
import { DashboardController } from '../../controllers/dashboard.controller';

interface AIHeaderProps {
  onTestClick?: () => void;
  onSwitchWorkbench?: () => void;
}

export function AIHeader({ onTestClick, onSwitchWorkbench }: AIHeaderProps = {}) {
  const [phoneNumber, setPhoneNumber] = useState('+91 80472 84627');
  const [isOnline, setIsOnline] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [userInitials, setUserInitials] = useState('AM');

  useEffect(() => {
    const savedAiLine = typeof window !== 'undefined' ? localStorage.getItem('onboarding_telephony_phone') : null;
    const business = StorageService.getBusiness();

    if (savedAiLine) {
      setPhoneNumber(savedAiLine);
    } else if (business?.country === 'India' || business?.currency === 'INR') {
      setPhoneNumber('+91 80472 84627');
    } else {
      setPhoneNumber('+1 (656) 254-7488');
    }
    const user = StorageService.getUser();
    if (user?.name) {
      const parts = user.name.trim().split(' ');
      setUserInitials(parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase());
    }

    DashboardController.getAgent()
      .then((agent) => {
        if (agent) {
          setIsOnline(agent.status !== 'paused');
        }
      })
      .catch((err) => console.warn('Failed to fetch agent status in header:', err));
  }, []);

  const handleToggleStatus = async () => {
    try {
      setIsUpdating(true);
      const newStatus = isOnline ? 'paused' : 'active';
      await DashboardController.updateAgent({ status: newStatus });
      setIsOnline(!isOnline);
    } catch (err) {
      console.error('Failed to toggle agent status:', err);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 py-1">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight flex items-center gap-2">
          {STRINGS.DASHBOARD.HEADERS.AI.TITLE}
        </h1>
        <p className="text-xs text-gray-500 font-medium mt-0.5">
          {STRINGS.DASHBOARD.HEADERS.AI.SUBTITLE}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Switch to AI Studio Workbench */}
        {onSwitchWorkbench && (
          <button
            onClick={onSwitchWorkbench}
            type="button"
            className="px-3 py-1.5 bg-blue-50 text-[#0066FF] border border-blue-200 hover:bg-blue-100 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
            <span>AI Studio Workbench</span>
          </button>
        )}

        {/* AI Phone Line */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg shadow-2xs whitespace-nowrap">
          <span className="text-[10px] text-gray-400 font-semibold">AI Line</span>
          <span className="text-xs font-mono font-bold text-gray-900 tracking-tight">{phoneNumber}</span>
        </div>

        {/* Status Indicator */}
        <div className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-[10px] font-bold tracking-wider shadow-2xs uppercase whitespace-nowrap ${
          isOnline
            ? 'border-emerald-200 bg-emerald-50/60 text-emerald-700'
            : 'border-amber-200 bg-amber-50/60 text-amber-700'
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
          {isOnline ? STRINGS.DASHBOARD.HEADERS.AI.STATUS_ONLINE : 'AI PAUSED'}
        </div>

        {/* Test AI Button */}
        <button
          onClick={onTestClick}
          type="button"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors whitespace-nowrap cursor-pointer active:scale-95"
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          {STRINGS.DASHBOARD.HEADERS.AI.BTN_TEST}
        </button>

        {/* Pause/Resume AI Button */}
        <button
          onClick={handleToggleStatus}
          disabled={isUpdating}
          type="button"
          className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold shadow-xs transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50 active:scale-95 ${
            isOnline
              ? 'border-[#EF4444] text-[#EF4444] bg-white hover:bg-red-50'
              : 'border-[#10B981] text-[#10B981] bg-white hover:bg-emerald-50'
          }`}
        >
          {isUpdating ? 'Updating...' : (isOnline ? STRINGS.DASHBOARD.HEADERS.AI.BTN_PAUSE : 'Resume AI')}
        </button>
      </div>
    </header>
  );
}
