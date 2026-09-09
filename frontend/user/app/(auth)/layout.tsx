import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  const content = STRINGS.AUTH.LAYOUT;
  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Sidebar (Blue area) */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0066FF] flex-col justify-between p-12 relative overflow-hidden text-white">
        {/* Faint horizontal lines background effect */}
        <div className="absolute inset-0 pointer-events-none opacity-20">
          <div className="w-full h-px bg-white mt-32"></div>
          <div className="w-full h-px bg-white mt-32"></div>
          <div className="w-full h-px bg-white mt-32"></div>
          <div className="w-full h-px bg-white mt-32"></div>
        </div>

        {/* Logo */}
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
            {/* Simple waveform/audio icon placeholder */}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 4v16m-4-10v4m8-8v12" />
            </svg>
          </div>
          <span className="text-2xl font-bold tracking-tight">{content.LOGO}</span>
        </div>

        {/* Chat Mockup */}
        <div className="relative z-10 w-full max-w-md mx-auto my-auto mt-20">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 shadow-xl space-y-4">
            
            {/* User Message */}
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center flex-shrink-0 mt-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </div>
              <div className="bg-transparent text-sm text-white leading-relaxed">
                {content.CHAT_USER}
              </div>
            </div>

            {/* AI Message */}
            <div className="flex items-start gap-4">
              <div className="bg-white text-[#0066FF] rounded-2xl rounded-tl-sm p-3 px-4 text-sm font-medium shadow-sm leading-relaxed">
                {content.CHAT_AI}
              </div>
              <div className="w-8 h-8 rounded-full bg-[#0052cc] border border-white/30 flex items-center justify-center flex-shrink-0 mt-1">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2z" />
                </svg>
              </div>
            </div>

          </div>
        </div>

        {/* Bottom Text */}
        <div className="relative z-10 max-w-lg mb-8">
          <h1 className="text-4xl font-bold mb-4 leading-tight">
            {content.HERO_TITLE}
          </h1>
          <p className="text-white/80 text-sm leading-relaxed">
            {content.HERO_DESC}
          </p>
        </div>
      </div>

      {/* Right Content Area (Forms) */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        {children}
      </div>
    </div>
  );
}
