import React from 'react';
import Link from 'next/link';

export default function AdminLoginPage() {
  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-[#F8FAFC]">
      <div className="w-full max-w-[420px] bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 p-8 space-y-8">
        
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="w-12 h-12 bg-[#2563EB] rounded-xl flex items-center justify-center shadow-md">
            <span className="text-white text-xl font-bold">A</span>
          </div>
          <div className="space-y-1.5">
            <h1 className="text-2xl font-bold text-gray-900">Admin Portal</h1>
            <p className="text-[13px] text-gray-500 font-medium">
              Secure access to Aira platform administration.
            </p>
          </div>
        </div>

        {/* Form */}
        <form className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-gray-700">Admin email</label>
            <input 
              type="email" 
              placeholder="admin@aira.ai"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[13px] font-bold text-gray-700">Password</label>
            <input 
              type="password" 
              placeholder="••••••••••••"
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
              required
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer group">
              <input type="checkbox" className="w-4 h-4 rounded border-gray-300 text-[#2563EB] focus:ring-[#2563EB] cursor-pointer" />
              <span className="text-[13px] font-medium text-gray-600 group-hover:text-gray-900 transition-colors">Remember me</span>
            </label>
            <Link href="#" className="text-[13px] font-bold text-[#2563EB] hover:text-blue-700 transition-colors">
              Forgot password?
            </Link>
          </div>

          <button 
            type="submit" 
            className="w-full bg-[#2563EB] hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors shadow-sm text-[13px]"
          >
            Sign In
          </button>
        </form>

        {/* Footer Badge */}
        <div className="bg-[#EFF6FF] rounded-lg py-2.5 flex items-center justify-center gap-2 text-[#2563EB]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span className="text-[12px] font-bold">Protected admin environment</span>
        </div>

      </div>
    </div>
  );
}
