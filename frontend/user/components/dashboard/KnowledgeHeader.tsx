"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function KnowledgeHeader() {
  return (
    <header className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-[28px] font-extrabold text-gray-900 tracking-tight leading-tight">
          {STRINGS.DASHBOARD.HEADERS.KNOWLEDGE.TITLE}
        </h1>
        <p className="text-[15px] text-gray-500 mt-1">
          {STRINGS.DASHBOARD.HEADERS.KNOWLEDGE.SUBTITLE}
        </p>
      </div>

      <div className="flex items-center gap-4">
        
        {/* Search Input */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder={STRINGS.DASHBOARD.HEADERS.KNOWLEDGE.SEARCH_PLACEHOLDER} 
            className="w-[200px] border border-gray-200 rounded-lg py-2 pl-9 pr-4 text-[13px] font-bold text-gray-800 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] shadow-sm transition-all"
          />
        </div>

        {/* Add Source Button */}
        <div className="relative">
          <button className="flex items-center gap-2 px-5 py-2 bg-[#0066FF] text-white rounded-lg text-[13px] font-bold shadow-sm hover:bg-[#0052cc] transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            {STRINGS.DASHBOARD.HEADERS.KNOWLEDGE.ADD_BTN}
            <svg className="ml-1" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </button>
        </div>

        {/* Notification Bell */}
        <button className="w-10 h-10 ml-2 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-500 hover:bg-gray-50 shadow-sm transition-colors">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </button>

        {/* Profile Circle */}
        <div className="w-10 h-10 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center font-bold text-sm cursor-pointer shadow-sm hover:bg-blue-100 transition-colors">
          SW
        </div>
      </div>
    </header>
  );
}
