"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

interface ConversationsHeaderProps {
  viewMode: 'conversation' | 'table';
  onViewModeChange: (mode: 'conversation' | 'table') => void;
  dateRange?: string;
}

export function ConversationsHeader({
  viewMode,
  onViewModeChange,
  dateRange = 'Oct 1, 2026 - Oct 31, 2026',
}: ConversationsHeaderProps) {
  return (
    <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-2 mb-1 py-0.5 shrink-0">
      <div>
        <h1 className="text-lg font-extrabold text-gray-900 tracking-tight leading-tight">
          {STRINGS.DASHBOARD.HEADERS.CONVERSATIONS.TITLE}
        </h1>
        <p className="text-[11px] text-gray-500 font-medium mt-0.5">
          {STRINGS.DASHBOARD.HEADERS.CONVERSATIONS.SUBTITLE}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {/* View Mode Switcher Toggle */}
        <div className="flex items-center bg-gray-100/90 p-0.5 rounded-lg border border-gray-200/60 shadow-2xs">
          <button
            type="button"
            onClick={() => onViewModeChange('conversation')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'conversation'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>
            Conversation View
          </button>
          
          <button
            type="button"
            onClick={() => onViewModeChange('table')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
              viewMode === 'table'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            Call Logs Table
          </button>
        </div>

        {/* Date Range Selector */}
        <button
          type="button"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors"
        >
          <svg className="text-gray-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span>{dateRange}</span>
          <svg className="text-gray-400" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
        </button>

        {/* Live Indicator */}
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60 shadow-2xs">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Channels Active
        </span>
      </div>
    </header>
  );
}
