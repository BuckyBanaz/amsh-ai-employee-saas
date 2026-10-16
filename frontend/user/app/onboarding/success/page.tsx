"use client";

import React, { useEffect } from 'react';
import Link from 'next/link';
import { STRINGS } from '../../../utils/strings/en';
import { StorageService } from '../../../services/storage.service';

export default function OnboardingSuccessPage() {
  const [bizName, setBizName] = React.useState('');
  const [agentName, setAgentName] = React.useState('Your AI receptionist');

  useEffect(() => {
    StorageService.setOnboardingCompleted(true);
    try {
      const rawBiz = localStorage.getItem('onboarding_business_data');
      if (rawBiz) {
        const parsed = JSON.parse(rawBiz);
        if (parsed.businessName || parsed.name) setBizName(parsed.businessName || parsed.name);
      }
      const rawAgent = localStorage.getItem('onboarding_ai_receptionist');
      if (rawAgent) {
        const parsed = JSON.parse(rawAgent);
        if (parsed.aiName) setAgentName(parsed.aiName);
      }
    } catch (e) {}
  }, []);

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl shadow-sm border border-gray-100 p-6 sm:p-8 text-center">
      
      {/* Success Icon */}
      <div className="flex justify-center mb-4">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#E6FBF3] rounded-full scale-125"></div>
          <div className="relative w-10 h-10 bg-[#10B981] rounded-full flex items-center justify-center shadow-xs z-10">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>
      </div>

      {/* Decorative Dots */}
      <div className="flex justify-center gap-1.5 mb-5">
        <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"></div>
      </div>

      {/* Text Content */}
      <div className="mb-6 space-y-2">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight leading-snug" dangerouslySetInnerHTML={{ __html: STRINGS.ONBOARDING.SUCCESS.TITLE.replace('ready!', '<br />ready!') }} />
        <p className="text-xs sm:text-sm text-gray-500 leading-relaxed max-w-xs mx-auto">
          {bizName ? `${bizName} is configured and ready for live operations. ` : 'Your business is configured and ready. '}
          {agentName} is on standby to manage incoming calls, appointments, and inquiries.
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-2.5">
        <button 
          type="button" 
          className="w-full py-2.5 rounded-lg bg-[#0066FF] text-white font-medium text-sm hover:bg-[#0052cc] transition-colors shadow-xs"
        >
          {STRINGS.ONBOARDING.SUCCESS.TEST_BTN}
        </button>
        <Link href="/dashboard" className="block w-full">
          <button 
            type="button" 
            className="w-full py-2.5 rounded-lg bg-white border border-gray-200 text-gray-700 font-medium text-sm hover:bg-gray-50 transition-colors shadow-xs"
          >
            {STRINGS.ONBOARDING.SUCCESS.DASHBOARD_BTN}
          </button>
        </Link>
      </div>

    </div>
  );
}
