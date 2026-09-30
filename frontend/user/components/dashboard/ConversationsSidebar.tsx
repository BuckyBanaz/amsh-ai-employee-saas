"use client";
import React from 'react';
import { CallLogItem } from '../../controllers/dashboard.controller';
import { ListSkeleton } from '../common/ShimmerSkeleton';

interface ConversationsSidebarProps {
  calls: CallLogItem[];
  selectedCallId?: string;
  onSelectCall: (call: CallLogItem) => void;
  search: string;
  onSearchChange: (q: string) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  loading: boolean;
}

export function ConversationsSidebar({
  calls,
  selectedCallId,
  onSelectCall,
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
  loading,
}: ConversationsSidebarProps) {
  const filters = ['All', 'Booked', 'Inquiries', 'Transferred'];

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col h-full overflow-hidden">
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-gray-100 flex-shrink-0 bg-white">
        <h2 className="text-sm font-extrabold text-gray-900 mb-2.5 tracking-tight">Call Conversations</h2>
        
        {/* Search */}
        <div className="relative mb-2.5">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by phone, name, or keywords..." 
            className="w-full bg-[#F9FAFB] border border-gray-200 rounded-lg py-1.5 pl-8 pr-3 text-xs text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-[#0066FF] transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide pb-0.5">
          {filters.map((f) => {
            const isActive = activeFilter === f;
            return (
              <button
                key={f}
                onClick={() => onFilterChange(f)}
                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-[#0066FF] text-white shadow-2xs'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto scrollbar-hide">
        {loading ? (
          <ListSkeleton count={6} />
        ) : calls.length === 0 ? (
          <div className="p-8 text-center flex flex-col items-center justify-center">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center mb-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <p className="text-xs font-bold text-gray-900">No conversations found</p>
            <p className="text-[11px] text-gray-500 mt-1 max-w-[200px]">Inbound and test AI calls will appear here in real-time.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {calls.map((call) => {
              const isSelected = selectedCallId === call.id;
              const title = call.customer_name || call.caller_number || 'Inbound Caller';
              const timeStr = call.started_at ? new Date(call.started_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : 'Live';
              const preview = call.summary || call.transcription || 'Call transcript recorded.';

              return (
                <div 
                  key={call.id} 
                  onClick={() => onSelectCall(call)}
                  className={`p-3.5 cursor-pointer transition-colors ${
                    isSelected ? 'bg-[#F0F7FF] border-l-2 border-l-[#0066FF]' : 'hover:bg-gray-50/60 border-l-2 border-l-transparent'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className={`text-xs font-extrabold truncate pr-2 ${isSelected ? 'text-[#0066FF]' : 'text-gray-900'}`}>
                      {title}
                    </h3>
                    <span className="text-[10px] font-semibold text-gray-400 shrink-0">{timeStr}</span>
                  </div>
                  
                  <div className="flex items-center gap-1.5 mb-1.5 flex-wrap">
                    <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-semibold bg-gray-100 text-gray-600">
                      {call.intent || 'General Inbound'}
                    </span>
                    {call.outcome === 'booked' && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#E6FBF3] text-[#10B981]">
                        Booked
                      </span>
                    )}
                    {call.outcome === 'transferred' && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-[#FEF3C7] text-[#D97706]">
                        Transferred
                      </span>
                    )}
                    {call.outcome === 'completed' && (
                      <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-bold bg-blue-50 text-[#0066FF]">
                        Resolved
                      </span>
                    )}
                  </div>
                  
                  <p className="text-xs text-gray-500 leading-snug line-clamp-2">
                    {preview}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
