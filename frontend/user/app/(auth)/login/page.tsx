import React from 'react';
import Link from 'next/link';
import { STRINGS } from '../../../utils/strings/en';

export default function LoginPage() {
  const content = STRINGS.AUTH.LOGIN;
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

        <div className="space-y-1">
          <label className="text-sm font-semibold text-gray-900">{common.PASSWORD_LABEL}</label>
          <div className="relative">
            <input 
              type="password" 
              placeholder={common.PASSWORD_PLACEHOLDER}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
              required
            />
            <button 
              type="button" 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                <line x1="1" y1="1" x2="23" y2="23"></line>
              </svg>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#0066FF] focus:ring-[#0066FF]" />
            <span className="text-sm text-gray-600">{content.REMEMBER_ME}</span>
          </label>
          <Link href="/forgot-password" className="text-sm font-medium text-[#0066FF] hover:underline">
            {content.FORGOT_PASSWORD}
          </Link>
        </div>

        <button 
          type="submit" 
          className="w-full bg-[#0066FF] hover:bg-[#0052cc] text-white font-medium py-3 rounded-lg transition-colors shadow-sm"
        >
          {content.SUBMIT}
        </button>
      </form>

      <div className="relative flex items-center py-2">
        <div className="flex-grow border-t border-gray-200"></div>
        <span className="flex-shrink-0 mx-4 text-gray-400 text-xs font-medium uppercase">{common.OR}</span>
        <div className="flex-grow border-t border-gray-200"></div>
      </div>

      <button 
        type="button" 
        className="w-full flex items-center justify-center gap-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-medium py-3 rounded-lg transition-colors shadow-sm"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
        </svg>
        {common.CONTINUE_GOOGLE}
      </button>

      <p className="text-center text-sm text-gray-600">
        {content.NO_ACCOUNT} <Link href="/register" className="font-semibold text-[#0066FF] hover:underline">{content.SIGN_UP}</Link>
      </p>
    </div>
  );
}
