"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function CallDetailPanel() {
  return (
    <div className="w-full bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col h-full">
      <div className="p-3.5 flex-1 overflow-y-auto">
        <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">{STRINGS.DASHBOARD_PANELS.CALL_DETAIL.TITLE}</h3>
        
        {/* Profile Info */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center text-xs font-bold shadow-2xs">
            RS
          </div>
          <div>
            <h2 className="text-sm font-bold text-gray-900 leading-tight">Rahul Sharma</h2>
            <p className="text-xs text-gray-500 font-medium">+31 6 1234 5678</p>
          </div>
        </div>

        {/* Call Summary */}
        <div className="mb-4">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">{STRINGS.DASHBOARD_PANELS.CALL_DETAIL.SUMMARY}</h4>
          <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-800 leading-relaxed border border-gray-100 font-medium">
            Patient called to schedule a general consultation. AI Receptionist verified availability, matched with Dr. Sarah Wilson, and booked for today at 09:30 AM.
          </div>
        </div>

        <div className="w-full h-px bg-gray-100 mb-4"></div>

        {/* Conversation Transcript */}
        <div>
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2.5">{STRINGS.DASHBOARD_PANELS.CALL_DETAIL.TRANSCRIPT}</h4>
          
          <div className="space-y-2.5">
            
            {/* AI Bubble */}
            <div className="flex flex-col items-start max-w-[88%]">
              <span className="text-[9px] font-bold text-[#0066FF] mb-0.5 ml-1">Aura AI</span>
              <div className="bg-[#F0F7FF] rounded-xl rounded-tl-xs px-3 py-2 text-xs text-gray-800 shadow-2xs border border-blue-50/50">
                Hello, thanks for calling Smile Dental Clinic. How can I assist you?
              </div>
            </div>

            {/* User Bubble */}
            <div className="flex flex-col items-end self-end max-w-[88%] ml-auto">
              <span className="text-[9px] font-bold text-gray-500 mb-0.5 mr-1">Rahul Sharma</span>
              <div className="bg-white border border-gray-100 rounded-xl rounded-tr-xs px-3 py-2 text-xs text-gray-800 shadow-2xs">
                Hi, I would like to book a routine dental checkup this week if possible.
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-3 border-t border-gray-100 space-y-2 bg-gray-50/50 rounded-b-xl">
        <button className="w-full flex items-center justify-center gap-1.5 py-2 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
          {STRINGS.DASHBOARD_PANELS.CALL_DETAIL.CALL_BACK}
        </button>

        <button className="w-full flex items-center justify-center gap-1.5 py-2 border border-gray-200 bg-white text-gray-700 rounded-lg text-xs font-semibold shadow-2xs hover:bg-gray-50 transition-colors">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          {STRINGS.DASHBOARD_PANELS.CALL_DETAIL.VIEW_APPOINTMENT}
        </button>
      </div>
    </div>
  );
}
