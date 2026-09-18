import React from 'react';
import Link from 'next/link';
import { STRINGS } from '../../../utils/strings/en';

export default function AcceptInvitePage() {
  const content = STRINGS.AUTH.ACCEPT_INVITE;
  const common = STRINGS.AUTH.COMMON;
  return (
    <div className="w-full max-w-sm space-y-4">
      <div className="flex justify-center mb-3">
        <div className="w-10 h-10 bg-[#0066FF] rounded-xl flex items-center justify-center shadow-md">
          {/* Simple waveform/audio icon placeholder to match the logo */}
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
            <path d="M12 4v16m-4-10v4m8-8v12" />
          </svg>
        </div>
      </div>

      <div className="space-y-1 text-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-snug">
          {content.TITLE_PREFIX} <span className="text-[#0066FF]">{content.TITLE_BUSINESS}</span>
        </h2>
        <p className="text-gray-500 text-xs leading-relaxed px-2">
          {content.DESC}
        </p>
      </div>

      <form className="space-y-3">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-900">{common.FULL_NAME_LABEL}</label>
          <input 
            type="text" 
            placeholder={content.NAME_PLACEHOLDER}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-900">{common.PASSWORD_LABEL}</label>
          <div className="relative">
            <input 
              type="password" 
              placeholder={STRINGS.AUTH.REGISTER.NEW_PASSWORD_PLACEHOLDER}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
              required
            />
            <button 
              type="button" 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-gray-900">{common.CONFIRM_PASSWORD_LABEL}</label>
          <div className="relative">
            <input 
              type="password" 
              placeholder={STRINGS.AUTH.REGISTER.CONFIRM_PASSWORD_PLACEHOLDER}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
              required
            />
            <button 
              type="button" 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </button>
          </div>
        </div>

        <button 
          type="submit" 
          className="w-full bg-[#0066FF] hover:bg-[#0052cc] text-white font-medium py-2 rounded-lg text-sm transition-colors shadow-sm mt-2"
        >
          {content.SUBMIT}
        </button>
      </form>

      <div className="flex justify-center pt-1">
        <button 
          type="button" 
          className="text-xs font-medium text-gray-500 hover:text-gray-800 underline decoration-gray-300 underline-offset-4 transition-colors"
        >
          {content.DECLINE}
        </button>
      </div>
    </div>
  );
}
