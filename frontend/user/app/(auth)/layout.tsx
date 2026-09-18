import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const content = STRINGS.AUTH.LAYOUT;
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Sidebar (Blue area) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0066FF] flex-col justify-between p-8 lg:p-10 relative overflow-hidden text-white">
        {/* Faint horizontal lines background effect */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="w-full h-px bg-white mt-24"></div>
          <div className="w-full h-px bg-white mt-24"></div>
          <div className="w-full h-px bg-white mt-24"></div>
          <div className="w-full h-px bg-white mt-24"></div>
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
            {/* Simple waveform/audio icon placeholder */}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 4v16m-4-10v4m8-8v12" />
            </svg>
          </div>
          <span className="text-xl font-bold tracking-tight">{content.LOGO}</span>
        </div>

        {/* Chat Mockup */}
        <div className="relative z-10 w-full max-w-sm mx-auto my-auto mt-10 mb-8">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-xl p-4 shadow-lg space-y-3">
            
            {/* User Message */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="bg-transparent text-xs text-white leading-relaxed">
                {content.CHAT_USER}
              </div>
            </div>

            {/* AI Message */}
            <div className="flex items-start gap-3">
              <div className="bg-white text-[#0066FF] rounded-xl rounded-tl-sm p-2.5 px-3 text-xs font-medium shadow-sm leading-relaxed">
                {content.CHAT_AI}
              </div>
              <div className="w-7 h-7 rounded-full bg-[#0052cc] border border-white/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                </svg>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Text */}
        <div className="relative z-10 max-w-sm mb-4">
          <h1 className="text-2xl font-bold mb-2 leading-snug">
            {content.HERO_TITLE}
          </h1>
          <p className="text-white/80 text-xs leading-relaxed">
            {content.HERO_DESC}
          </p>
        </div>
      </div>

      {/* Right Content Area (Forms) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}
