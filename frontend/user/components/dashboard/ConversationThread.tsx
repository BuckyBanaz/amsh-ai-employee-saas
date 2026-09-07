"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function ConversationThread() {
  const data = STRINGS.DASHBOARD_PANELS.CONVERSATION_THREAD.MOCK_DATA;
  
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col h-full overflow-hidden">
      
      {/* Thread Header */}
      <div className="p-6 border-b border-gray-50 flex items-center justify-between flex-shrink-0 bg-white z-10">
        <div>
          <h2 className="text-[20px] font-extrabold text-gray-900 tracking-tight">{data.HEADER.NAME}</h2>
          <div className="flex items-center gap-3 mt-1 text-[13px] font-medium text-gray-500">
            <span>{data.HEADER.PHONE}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span>{data.HEADER.DURATION}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="px-3 py-1 rounded-md text-[11px] font-bold bg-[#F0F7FF] text-[#0066FF]">{data.HEADER.TAGS[0]}</span>
          <span className="px-3 py-1 rounded-md text-[11px] font-bold bg-[#E6FBF3] text-[#10B981]">{data.HEADER.TAGS[1]}</span>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-8 bg-white">
        
        {data.MESSAGES.map((msg, idx) => (
          msg.isAI ? (
            <div key={idx}>
              <div className="flex items-center gap-2 mb-2 ml-1">
                <span className="text-[10px] font-extrabold text-[#0066FF] uppercase tracking-wider">{msg.sender}</span>
                <span className="text-[10px] font-medium text-gray-400">{msg.time}</span>
              </div>
              <div className="bg-[#F9FAFB] border border-gray-100 text-gray-800 text-[14px] leading-relaxed p-4 rounded-2xl rounded-tl-sm max-w-[85%] md:max-w-[70%]">
                {msg.text}
              </div>
            </div>
          ) : (
            <div key={idx} className="flex flex-col items-end">
              <div className="flex items-center gap-2 mb-2 mr-1">
                <span className="text-[10px] font-medium text-gray-400">{msg.time}</span>
                <span className="text-[10px] font-extrabold text-gray-900 uppercase tracking-wider">{msg.sender}</span>
              </div>
              <div className="bg-[#F0F7FF] text-[#004dc2] text-[14px] leading-relaxed p-4 rounded-2xl rounded-tr-sm max-w-[85%] md:max-w-[70%] text-right font-medium">
                {msg.text}
              </div>
            </div>
          )
        ))}

      </div>
    </div>
  );
}
