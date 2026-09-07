"use client";
import React from 'react';

import { STRINGS } from '../../utils/strings/en';

const conversations = STRINGS.CONVERSATIONS_SIDEBAR.MOCK_DATA;

export function ConversationsSidebar() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
      
      {/* Sidebar Header */}
      <div className="p-5 border-b border-gray-50 flex-shrink-0">
        <h2 className="text-[16px] font-extrabold text-gray-900 mb-4 tracking-tight">{STRINGS.CONVERSATIONS_SIDEBAR.TITLE}</h2>
        
        {/* Search */}
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder={STRINGS.CONVERSATIONS_SIDEBAR.SEARCH_PLACEHOLDER} 
            className="w-full bg-[#F9FAFB] border-none rounded-lg py-2.5 pl-9 pr-4 text-[13px] font-bold text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0066FF] transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button className="px-3 py-1 bg-[#0066FF] text-white rounded-full text-[11px] font-bold whitespace-nowrap">{STRINGS.CONVERSATIONS_SIDEBAR.FILTERS[0]}</button>
          <button className="px-3 py-1 border border-gray-200 text-gray-600 rounded-full text-[11px] font-bold hover:bg-gray-50 whitespace-nowrap transition-colors">{STRINGS.CONVERSATIONS_SIDEBAR.FILTERS[1]}</button>
          <button className="px-3 py-1 border border-gray-200 text-gray-600 rounded-full text-[11px] font-bold hover:bg-gray-50 whitespace-nowrap transition-colors">{STRINGS.CONVERSATIONS_SIDEBAR.FILTERS[2]}</button>
          <button className="px-3 py-1 border border-gray-200 text-gray-600 rounded-full text-[11px] font-bold hover:bg-gray-50 whitespace-nowrap transition-colors">{STRINGS.CONVERSATIONS_SIDEBAR.FILTERS[3]}</button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="divide-y divide-gray-50">
          {conversations.map(conv => (
            <div 
              key={conv.id} 
              className={`p-5 cursor-pointer transition-colors ${conv.active ? 'bg-[#F0F7FF] border-l-2 border-l-[#0066FF]' : 'hover:bg-gray-50/50 border-l-2 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className={`text-[14px] font-extrabold ${conv.active ? 'text-gray-900' : 'text-gray-900'}`}>{conv.name}</h3>
                <span className="text-[11px] font-bold text-gray-400">{conv.time}</span>
              </div>
              
              <div className="flex items-center gap-2 mb-3">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-500">
                  {conv.intent}
                </span>
                {conv.status === 'Booked' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E6FBF3] text-[#10B981]">
                    Booked
                  </span>
                )}
                {conv.status === 'Resolved' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#E6FBF3] text-[#10B981]">
                    Resolved
                  </span>
                )}
                {conv.status === 'Transferred' && (
                  <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#FEF3C7] text-[#D97706]">
                    Transferred
                  </span>
                )}
              </div>
              
              <p className="text-[13px] text-gray-500 leading-snug truncate">
                {conv.message}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
