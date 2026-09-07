"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function CallDetailPanel() {
  return (
    <div className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col h-full">
      <div className="p-6 flex-1 overflow-y-auto">
        <h3 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-6">{STRINGS.DASHBOARD_PANELS.CALL_DETAIL.TITLE}</h3>
        
        {/* Profile Info */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-14 h-14 rounded-full bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center text-lg font-bold shadow-sm">
            RS
          </div>
          <div>
            <h2 className="text-[17px] font-bold text-gray-900 leading-tight">Rahul Sharma</h2>
            <p className="text-[13px] text-gray-500 font-medium mt-0.5">+31 6 1234 5678</p>
          </div>
        </div>

        {/* Call Summary */}
        <div className="mb-8">
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3">{STRINGS.DASHBOARD_PANELS.CALL_DETAIL.SUMMARY}</h4>
          <div className="bg-gray-50 rounded-xl p-4 text-[13px] text-gray-800 leading-relaxed border border-gray-100 font-medium">
            Patient called to schedule a general consultation. AI Receptionist verified availability, matched with Dr. Sarah Wilson, and booked for today at 09:30 AM.
          </div>
        </div>

        <div className="w-full h-px bg-gray-100 mb-8"></div>

        {/* Conversation Transcript */}
        <div>
          <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-4">{STRINGS.DASHBOARD_PANELS.CALL_DETAIL.TRANSCRIPT}</h4>
          
          <div className="space-y-4">
            
            {/* AI Bubble */}
            <div className="flex flex-col items-start max-w-[85%]">
              <span className="text-[10px] font-bold text-[#0066FF] mb-1 ml-1">Aura AI</span>
              <div className="bg-[#F0F7FF] rounded-2xl rounded-tl-sm px-4 py-3 text-[13px] text-gray-800 shadow-sm border border-blue-50/50">
                Hello, thanks for calling Smile Dental Clinic. How can I assist you?
              </div>
            </div>

            {/* User Bubble */}
            <div className="flex flex-col items-end self-end max-w-[85%] ml-auto">
              <span className="text-[10px] font-bold text-gray-500 mb-1 mr-1">Rahul Sharma</span>
              <div className="bg-white border border-gray-100 rounded-2xl rounded-tr-sm px-4 py-3 text-[13px] text-gray-800 shadow-[0_2px_10px_rgb(0,0,0,0.02)]">
                Hi, I would like to book a routine dental checkup this week if possible.
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="p-6 border-t border-gray-100 space-y-3 bg-gray-50/50 rounded-b-2xl">
        <button className="w-full flex items-center justify-center gap-2 py-3 bg-[#0066FF] text-white rounded-lg text-[13px] font-bold shadow-sm hover:bg-[#0052cc] transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          {STRINGS.DASHBOARD_PANELS.CALL_DETAIL.BUTTONS.PLAY_RECORDING}
        </button>
        <button className="w-full flex items-center justify-center gap-2 py-3 bg-white border border-gray-200 text-gray-900 rounded-lg text-[13px] font-bold shadow-sm hover:bg-gray-50 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          {STRINGS.DASHBOARD_PANELS.CALL_DETAIL.BUTTONS.DOWNLOAD_TRANSCRIPT}
        </button>
      </div>

    </div>
  );
}
