"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../../utils/strings/en';

const integrations = [
  {
    id: 'google-calendar',
    name: 'Google Calendar',
    description: 'Sync appointments with Google Calendar automatically.',
    connected: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0066FF]">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    ),
  },
  {
    id: 'outlook',
    name: 'Microsoft Outlook',
    description: 'Sync bookings with Outlook corporate calendar.',
    connected: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0066FF]">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
      </svg>
    ),
  },
  {
    id: 'meet',
    name: 'Google Meet',
    description: 'Create video links on appointment generation.',
    connected: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0066FF]">
        <polygon points="23 7 16 12 23 17 23 7"></polygon>
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
      </svg>
    ),
  },
  {
    id: 'twilio',
    name: 'Twilio',
    description: 'Automate AI reception phone calls via direct SIP line.',
    connected: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0066FF]">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
      </svg>
    ),
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Send instant notification reminders directly.',
    connected: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0066FF]">
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
      </svg>
    ),
  },
  {
    id: 'stripe',
    name: 'Stripe',
    description: 'Enable payment collection on booking checkout.',
    connected: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0066FF]">
        <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
        <line x1="1" y1="10" x2="23" y2="10"></line>
      </svg>
    ),
  },
];

export default function IntegrationsOnboardingPage() {
  const router = useRouter();

  return (
    <div className="w-full max-w-5xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">{STRINGS.ONBOARDING.INTEGRATIONS.TITLE}</h1>
        <p className="text-gray-500 leading-relaxed max-w-3xl">
          {STRINGS.ONBOARDING.INTEGRATIONS.SUBTITLE}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
        {integrations.map((integration) => (
          <div 
            key={integration.id} 
            className={`flex flex-col justify-between h-[220px] rounded-xl p-5 border transition-all ${
              integration.connected 
                ? 'bg-white border-[#0066FF] shadow-[0_0_0_1px_rgba(0,102,255,0.2)]' 
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-lg bg-[#F0F7FF] flex items-center justify-center">
                  {integration.icon}
                </div>
                {integration.connected && (
                  <span className="bg-[#E6FBF3] text-[#10B981] text-[11px] font-bold px-2.5 py-1 rounded-md">
                    {STRINGS.ONBOARDING.INTEGRATIONS.STATUS_CONNECTED}
                  </span>
                )}
              </div>
              
              <div>
                <h3 className="text-[15px] font-bold text-gray-900 mb-1">{integration.name}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{integration.description}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-100">
              <button 
                type="button" 
                className={`w-full py-2 rounded-lg font-semibold text-[13px] transition-colors ${
                  integration.connected
                    ? 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                    : 'bg-[#0066FF] text-white hover:bg-[#0052cc]'
                }`}
              >
                {integration.connected ? STRINGS.ONBOARDING.INTEGRATIONS.BTN_MANAGE : STRINGS.ONBOARDING.INTEGRATIONS.BTN_CONNECT}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Buttons */}
      <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/knowledge')}
          className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.INTEGRATIONS.BACK_BTN}
        </button>
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/review')}
          className="px-8 py-2.5 rounded-lg bg-[#0066FF] text-white font-medium hover:bg-[#0052cc] transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.INTEGRATIONS.CONTINUE_BTN}
        </button>
      </div>
    </div>
  );
}
