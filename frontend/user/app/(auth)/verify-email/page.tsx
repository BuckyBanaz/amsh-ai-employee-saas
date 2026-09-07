import React from 'react';
import Link from 'next/link';
import { STRINGS } from '../../../utils/strings/en';

export default function VerifyEmailPage() {
  const content = STRINGS.AUTH.VERIFY_EMAIL;
  const common = STRINGS.AUTH.COMMON;
  return (
    <div className="w-full max-w-md space-y-8 text-center">
      <div className="flex justify-center mb-6">
        <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{content.TITLE}</h2>
        <p className="text-gray-500 text-sm leading-relaxed">
          {content.DESC}
        </p>
      </div>

      <button 
        type="button" 
        className="w-full bg-[#0066FF] hover:bg-[#0052cc] text-white font-medium py-3 rounded-lg transition-colors shadow-sm mt-8"
      >
        {content.SUBMIT}
      </button>

      <div className="flex justify-center pt-6">
        <Link 
          href="/login" 
          className="flex items-center gap-2 text-sm font-semibold text-[#0066FF] hover:underline"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          {common.BACK_TO_LOGIN}
        </Link>
      </div>
    </div>
  );
}
