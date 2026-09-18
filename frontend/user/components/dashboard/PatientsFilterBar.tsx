"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function PatientsFilterBar() {
  return (
    <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
      <div className="flex items-center gap-3 flex-1 flex-wrap">
        
        {/* Search Input */}
        <div className="relative w-full max-w-[280px]">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </div>
          <input 
            type="text" 
            placeholder={STRINGS.DASHBOARD.HEADERS.PATIENTS_FILTER.SEARCH_PLACEHOLDER}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs font-medium text-gray-900 placeholder-gray-400 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-colors shadow-2xs"
          />
        </div>

        {/* Segmented Controls */}
        <div className="flex bg-white border border-gray-200 rounded-lg p-0.5 shadow-2xs">
          <button className="px-3 py-1 bg-[#F0F7FF] text-[#0066FF] rounded-md text-xs font-semibold transition-colors">
            {STRINGS.DASHBOARD.HEADERS.PATIENTS_FILTER.FILTERS.ALL}
          </button>
          <button className="px-3 py-1 text-gray-600 hover:text-gray-900 rounded-md text-xs font-semibold transition-colors">
            {STRINGS.DASHBOARD.HEADERS.PATIENTS_FILTER.FILTERS.ACTIVE}
          </button>
          <button className="px-3 py-1 text-gray-600 hover:text-gray-900 rounded-md text-xs font-semibold transition-colors">
            {STRINGS.DASHBOARD.HEADERS.PATIENTS_FILTER.FILTERS.INACTIVE}
          </button>
        </div>
      </div>

      {/* Add Patient Button */}
      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
          <circle cx="8.5" cy="7" r="4"></circle>
          <line x1="20" y1="8" x2="20" y2="14"></line>
          <line x1="23" y1="11" x2="17" y2="11"></line>
        </svg>
        {STRINGS.DASHBOARD.HEADERS.PATIENTS_FILTER.ADD_BTN}
      </button>
    </div>
  );
}
