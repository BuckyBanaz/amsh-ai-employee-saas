"use client";
import React from 'react';

import { STRINGS } from '../../utils/strings/en';

const conversations = STRINGS.CONVERSATIONS_SIDEBAR.MOCK_DATA;

export function ConversationsSidebar() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col h-full overflow-hidden">
      
      {/* Sidebar Header */}
      <div className="p-3 border-b border-gray-100 flex-shrink-0">
        <h2 className="text-sm font-bold text-gray-900 mb-2.5 tracking-tight">{STRINGS.CONVERSATIONS_SIDEBAR.TITLE}</h2>
        
        {/* Search */}
        <div className="relative mb-2.5">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          <input 
            type="text" 
            placeholder={STRINGS.CONVERSATIONS_SIDEBAR.SEARCH_PLACEHOLDER} 
            className="w-full bg-[#F9FAFB] border border-gray-200 rounded-md py-1.5 pl-8 pr-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0066FF] transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          <button className="px-2.5 py-0.5 bg-[#0066FF] text-white rounded-full text-[10px] font-bold whitespace-nowrap">{STRINGS.CONVERSATIONS_SIDEBAR.FILTERS[0]}</button>
          <button className="px-2.5 py-0.5 border border-gray-200 text-gray-600 rounded-full text-[10px] font-medium hover:bg-gray-50 whitespace-nowrap transition-colors">{STRINGS.CONVERSATIONS_SIDEBAR.FILTERS[1]}</button>
          <button className="px-2.5 py-0.5 border border-gray-200 text-gray-600 rounded-full text-[10px] font-medium hover:bg-gray-50 whitespace-nowrap transition-colors">{STRINGS.CONVERSATIONS_SIDEBAR.FILTERS[2]}</button>
          <button className="px-2.5 py-0.5 border border-gray-200 text-gray-600 rounded-full text-[10px] font-medium hover:bg-gray-50 whitespace-nowrap transition-colors">{STRINGS.CONVERSATIONS_SIDEBAR.FILTERS[3]}</button>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        <div className="divide-y divide-gray-50">
          {conversations.map(conv => (
            <div 
              key={conv.id} 
              className={`p-3 cursor-pointer transition-colors ${conv.active ? 'bg-[#F0F7FF] border-l-2 border-l-[#0066FF]' : 'hover:bg-gray-50/50 border-l-2 border-l-transparent'}`}
            >
              <div className="flex justify-between items-start mb-1">
                <h3 className={`text-xs font-bold ${conv.active ? 'text-gray-900' : 'text-gray-900'}`}>{conv.name}</h3>
                <span className="text-[10px] font-medium text-gray-400">{conv.time}</span>
              </div>
              
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-medium bg-gray-100 text-gray-500">
                  {conv.intent}
                </span>
                {conv.status === 'Booked' && (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#E6FBF3] text-[#10B981]">
                    Booked
                  </span>
                )}
                {conv.status === 'Resolved' && (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#E6FBF3] text-[#10B981]">
                    Resolved
                  </span>
                )}
                {conv.status === 'Transferred' && (
                  <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FEF3C7] text-[#D97706]">
                    Transferred
                  </span>
                )}
              </div>
              
              <p className="text-xs text-gray-500 leading-snug truncate">
                {conv.message}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
