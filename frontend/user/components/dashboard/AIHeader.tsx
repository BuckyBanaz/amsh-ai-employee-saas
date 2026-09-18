"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

interface AIHeaderProps {
  onTestClick?: () => void;
}

const MOCK_AI_NUMBER = '+1 (555) 018-2947';

export function AIHeader({ onTestClick }: AIHeaderProps = {}) {
  return (
    <header className="flex items-center justify-between mb-3 py-1">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
          {STRINGS.DASHBOARD.HEADERS.AI.TITLE}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {STRINGS.DASHBOARD.HEADERS.AI.SUBTITLE}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        {/* AI Number (Twilio) */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg shadow-2xs whitespace-nowrap">
          <span className="text-[10px] text-gray-400 font-semibold">AI Number</span>
          <span className="text-xs font-mono font-bold text-gray-900 tracking-tight">{MOCK_AI_NUMBER}</span>
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 border border-gray-200 bg-white rounded-lg text-[10px] font-bold tracking-wider text-[#10B981] shadow-2xs uppercase whitespace-nowrap">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div>
          {STRINGS.DASHBOARD.HEADERS.AI.STATUS_ONLINE}
        </div>

        {/* Test AI Button */}
        <button
          onClick={onTestClick}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors whitespace-nowrap"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          {STRINGS.DASHBOARD.HEADERS.AI.BTN_TEST}
        </button>

        {/* Pause AI Button */}
        <button className="flex items-center gap-1.5 px-3 py-1.5 border border-[#EF4444] text-[#EF4444] bg-white rounded-lg text-xs font-semibold shadow-xs hover:bg-red-50 transition-colors whitespace-nowrap">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="4"></circle>
          </svg>
          {STRINGS.DASHBOARD.HEADERS.AI.BTN_PAUSE}
        </button>

        {/* Notification Bell */}
        <button className="w-8 h-8 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors shadow-2xs">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </button>

        {/* Profile Circle */}
        <div className="w-8 h-8 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-xs cursor-pointer hover:bg-blue-100 transition-colors">
          SW
        </div>
      </div>
    </header>
  );
}
