"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function CallLogsFilterBar() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm mb-4 flex items-center justify-between">
      <div className="flex items-center gap-4">
        
        {/* Status Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 tracking-wider">{STRINGS.DASHBOARD.HEADERS.CALL_LOGS_FILTER.LABELS.STATUS}</label>
          <div className="relative">
            <select className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-semibold rounded-lg pl-3 pr-8 py-2 outline-none focus:border-[#0066FF] min-w-[140px] transition-colors cursor-pointer">
              <option>{STRINGS.DASHBOARD.HEADERS.CALL_LOGS_FILTER.OPTIONS.ALL_STATUSES}</option>
              <option>Resolved</option>
              <option>Transferred</option>
              <option>Missed</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>

        {/* Intent Filter */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500 tracking-wider">{STRINGS.DASHBOARD.HEADERS.CALL_LOGS_FILTER.LABELS.INTENT}</label>
          <div className="relative">
            <select className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-[13px] font-semibold rounded-lg pl-3 pr-8 py-2 outline-none focus:border-[#0066FF] min-w-[140px] transition-colors cursor-pointer">
              <option>{STRINGS.DASHBOARD.HEADERS.CALL_LOGS_FILTER.OPTIONS.ALL_INTENTS}</option>
              <option>Appointment Booking</option>
              <option>Pricing Question</option>
              <option>Service Inquiry</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>

      </div>

      {/* Search Input */}
      <div className="relative w-full max-w-[320px] self-end mb-0.5">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <input 
          type="text" 
          placeholder={STRINGS.DASHBOARD.HEADERS.CALL_LOGS_FILTER.SEARCH_PLACEHOLDER}
          className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-[13px] font-semibold text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0066FF] focus:bg-white transition-colors"
        />
      </div>
    </div>
  );
}
