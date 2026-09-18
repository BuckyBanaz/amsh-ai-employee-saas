"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function CallLogsFilterBar() {
  return (
    <div className="bg-white border border-gray-100 rounded-lg px-3.5 py-2 shadow-2xs mb-3 flex items-center justify-between gap-3 flex-wrap">
      <div className="flex items-center gap-3">
        
        {/* Status Filter */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{STRINGS.DASHBOARD.HEADERS.CALL_LOGS_FILTER.LABELS.STATUS}</label>
          <div className="relative">
            <select className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-md pl-2.5 pr-7 py-1.5 outline-none focus:border-[#0066FF] min-w-[120px] transition-colors cursor-pointer">
              <option>{STRINGS.DASHBOARD.HEADERS.CALL_LOGS_FILTER.OPTIONS.ALL_STATUSES}</option>
              <option>Resolved</option>
              <option>Transferred</option>
              <option>Missed</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>

        {/* Intent Filter */}
        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">{STRINGS.DASHBOARD.HEADERS.CALL_LOGS_FILTER.LABELS.INTENT}</label>
          <div className="relative">
            <select className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium rounded-md pl-2.5 pr-7 py-1.5 outline-none focus:border-[#0066FF] min-w-[120px] transition-colors cursor-pointer">
              <option>{STRINGS.DASHBOARD.HEADERS.CALL_LOGS_FILTER.OPTIONS.ALL_INTENTS}</option>
              <option>Appointment Booking</option>
              <option>Pricing Question</option>
              <option>Service Inquiry</option>
            </select>
            <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </div>
          </div>
        </div>

      </div>

      {/* Search Input */}
      <div className="relative w-full max-w-[280px] self-end mb-0.5">
        <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>
        <input 
          type="text" 
          placeholder={STRINGS.DASHBOARD.HEADERS.CALL_LOGS_FILTER.SEARCH_PLACEHOLDER}
          className="w-full pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0066FF] focus:bg-white transition-colors"
        />
      </div>
    </div>
  );
}
