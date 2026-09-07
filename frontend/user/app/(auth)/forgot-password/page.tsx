import React from 'react';
import Link from 'next/link';
import { STRINGS } from '../../../utils/strings/en';

export default function ForgotPasswordPage() {
  const content = STRINGS.AUTH.FORGOT_PASSWORD;
  const common = STRINGS.AUTH.COMMON;
  return (
    <div className="w-full max-w-md space-y-8">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-gray-900 tracking-tight">{content.TITLE}</h2>
        <p className="text-gray-500 text-sm">
          {content.DESC}
        </p>
      </div>

      <form className="space-y-6">
        <div className="space-y-1">
          <label className="text-sm font-semibold text-gray-900">{common.EMAIL_LABEL}</label>
          <input 
            type="email" 
            placeholder={common.EMAIL_PLACEHOLDER}
            className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            required
          />
        </div>

        <button 
          type="submit" 
          className="w-full bg-[#0066FF] hover:bg-[#0052cc] text-white font-medium py-3 rounded-lg transition-colors shadow-sm"
        >
          {content.SUBMIT}
        </button>
      </form>

      <div className="flex justify-center pt-2">
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
