import React from 'react';
import Link from 'next/link';
import { STRINGS } from '../../../../utils/strings/en';

export default function OnboardingSuccessPage() {
  return (
    <div className="w-full max-w-xl mx-auto bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-10 sm:p-14 text-center">
      
      {/* Success Icon */}
      <div className="flex justify-center mb-6">
        <div className="relative w-16 h-16 flex items-center justify-center">
          <div className="absolute inset-0 bg-[#E6FBF3] rounded-full scale-125"></div>
          <div className="relative w-12 h-12 bg-[#10B981] rounded-full flex items-center justify-center shadow-sm z-10">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        </div>
      </div>

      {/* Decorative Dots */}
      <div className="flex justify-center gap-2 mb-8">
        <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]"></div>
        <div className="w-1.5 h-1.5 rounded-full bg-[#8B5CF6]"></div>
      </div>

      {/* Text Content */}
      <div className="mb-10 space-y-4">
        <h1 className="text-[28px] sm:text-3xl font-extrabold text-gray-900 tracking-tight leading-tight" dangerouslySetInnerHTML={{ __html: STRINGS.ONBOARDING.SUCCESS.TITLE.replace('ready!', '<br />ready!') }} />
        <p className="text-sm sm:text-base text-gray-500 leading-relaxed max-w-sm mx-auto">
          {STRINGS.ONBOARDING.SUCCESS.SUBTITLE}
        </p>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button 
          type="button" 
          className="w-full py-3.5 rounded-xl bg-[#0066FF] text-white font-semibold hover:bg-[#0052cc] transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.SUCCESS.TEST_BTN}
        </button>
        <Link href="/dashboard" className="block w-full">
          <button 
            type="button" 
            className="w-full py-3.5 rounded-xl bg-white border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-colors shadow-sm"
          >
            {STRINGS.ONBOARDING.SUCCESS.DASHBOARD_BTN}
          </button>
        </Link>
      </div>

    </div>
  );
}
