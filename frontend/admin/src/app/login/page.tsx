import React from 'react';
import Link from 'next/link';

export default function AdminLoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-[#F8FAFC]">
      <div className="w-full max-w-[360px] bg-white rounded-xl shadow-2xs border border-[#E2E8F0] p-6 space-y-5">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2.5">
          <div className="w-9 h-9 bg-[#2563EB] rounded-lg flex items-center justify-center shadow-2xs">
            <span className="text-white text-base font-bold">A</span>
          </div>
          <div className="space-y-0.5">
            <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">Admin Portal</h1>
            <p className="text-xs text-[#64748B]">
              Secure access to Aira platform administration.
            </p>
          </div>
        </div>

        {/* Form */}
        <form className="space-y-3.5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#334155]">Admin email</label>
            <input 
              type="email" 
              placeholder="admin@aira.ai"
              className="w-full px-3 py-1.5 rounded-md border border-[#CBD5E1] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#334155]">Password</label>
            <input 
              type="password" 
              placeholder="••••••••••••"
              className="w-full px-3 py-1.5 rounded-md border border-[#CBD5E1] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-0.5">
            <label className="flex items-center gap-1.5 cursor-pointer group">
              <input type="checkbox" className="w-3.5 h-3.5 rounded border-[#CBD5E1] text-[#2563EB] focus:ring-[#2563EB] cursor-pointer" />
              <span className="text-xs font-medium text-[#475569] group-hover:text-[#0F172A] transition-colors">Remember me</span>
            </label>
            <Link href="#" className="text-xs font-semibold text-[#2563EB] hover:text-blue-700 transition-colors">
              Forgot password?
            </Link>
          </div>

          <button 
            type="submit" 
            className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-semibold py-2 rounded-md transition-colors shadow-2xs text-xs"
          >
            Sign In
          </button>
        </form>

        {/* Footer Badge */}
        <div className="bg-[#EFF6FF] rounded-md py-1.5 flex items-center justify-center gap-1.5 text-[#2563EB]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span className="text-[11px] font-bold">Protected admin environment</span>
        </div>

      </div>
    </div>
  );
}
