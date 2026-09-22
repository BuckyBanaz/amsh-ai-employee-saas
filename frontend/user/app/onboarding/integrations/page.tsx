"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';

interface IntegrationItem {
  id: string;
  provider: string;
  name: string;
  description: string;
  connected: boolean;
  details?: string;
  icon: React.ReactNode;
}

export default function IntegrationsOnboardingPage() {
  const router = useRouter();

  const [integrations, setIntegrations] = useState<IntegrationItem[]>([
    {
      id: 'google-calendar',
      provider: 'google_calendar',
      name: 'Google Calendar',
      description: 'Sync appointments with Google Calendar automatically.',
      connected: true,
      details: 'Dr. Sarah Wilson Primary Calendar',
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
      id: 'twilio',
      provider: 'twilio',
      name: 'Twilio Telephony & Phone Line',
      description: 'Dedicated AI telephony line or smart call forwarding for live voice calls.',
      connected: true,
      details: '+1 (555) 019-2834 (Active Voice Line)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0066FF]">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
        </svg>
      ),
    },
    {
      id: 'whatsapp',
      provider: 'whatsapp',
      name: 'WhatsApp Business Channel',
      description: 'Send instant booking cards, Google Maps location, & 2-hr visit reminders.',
      connected: true,
      details: 'Baileys Multi-Device (+91 80472 84627)',
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#10B981]">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
      ),
    },
    {
      id: 'outlook',
      provider: 'outlook',
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
      provider: 'google_meet',
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
      id: 'stripe',
      provider: 'stripe',
      name: 'Stripe Payments',
      description: 'Enable payment collection on booking checkout.',
      connected: false,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0066FF]">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
          <line x1="10" y1="10" x2="23" y2="10"></line>
        </svg>
      ),
    },
  ]);

  const handleCardClick = (integration: IntegrationItem) => {
    if (integration.id === 'twilio') {
      router.push('/onboarding/integrations/twilio');
      return;
    }
    if (integration.id === 'whatsapp') {
      router.push('/onboarding/integrations/whatsapp');
      return;
    }
    // Generic toggle for other integrations
    setIntegrations(integrations.map(item => 
      item.id === integration.id ? { ...item, connected: !item.connected } : item
    ));
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1.5">{STRINGS.ONBOARDING.INTEGRATIONS.TITLE}</h1>
        <p className="text-sm text-gray-500 leading-relaxed max-w-3xl">
          {STRINGS.ONBOARDING.INTEGRATIONS.SUBTITLE}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 mb-6">
        {integrations.map((integration) => (
          <div 
            key={integration.id} 
            className={`flex flex-col justify-between h-[200px] rounded-xl p-4 border transition-all ${
              integration.connected 
                ? 'bg-white border-[#0066FF] shadow-[0_0_0_1px_rgba(0,102,255,0.2)]' 
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                  integration.id === 'whatsapp' ? 'bg-emerald-50' : 'bg-[#F0F7FF]'
                }`}>
                  {integration.icon}
                </div>
                {integration.connected && (
                  <span className="bg-[#E6FBF3] text-[#10B981] text-[10px] font-bold px-2 py-0.5 rounded">
                    {STRINGS.ONBOARDING.INTEGRATIONS.STATUS_CONNECTED}
                  </span>
                )}
              </div>
              
              <div>
                <h3 className="text-xs font-bold text-gray-900 mb-0.5">{integration.name}</h3>
                <p className="text-[11px] text-gray-500 leading-relaxed">{integration.description}</p>
                {integration.connected && integration.details && (
                  <p className={`text-[10px] font-semibold mt-1.5 px-2 py-0.5 rounded inline-block ${
                    integration.id === 'whatsapp' 
                      ? 'text-[#128C7E] bg-emerald-50 border border-emerald-200/60' 
                      : 'text-[#0066FF] bg-blue-50/60'
                  }`}>
                    {integration.details}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <button 
                type="button" 
                onClick={() => handleCardClick(integration)}
                className={`w-full py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 ${
                  integration.id === 'whatsapp'
                    ? 'bg-[#128C7E] text-white hover:bg-[#075E54]'
                    : (integration.id === 'twilio'
                        ? 'bg-[#0066FF] text-white hover:bg-[#0052cc]'
                        : (integration.connected
                            ? 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                            : 'bg-[#0066FF] text-white hover:bg-[#0052cc]'))
                }`}
              >
                {integration.id === 'whatsapp' ? (
                  <>
                    <span>Setup WhatsApp Business</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </>
                ) : integration.id === 'twilio' ? (
                  <>
                    <span>Configure Telephony Line</span>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                  </>
                ) : (
                  integration.connected ? STRINGS.ONBOARDING.INTEGRATIONS.BTN_MANAGE : STRINGS.ONBOARDING.INTEGRATIONS.BTN_CONNECT
                )}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Footer Navigation */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/knowledge')}
          className="px-5 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.INTEGRATIONS.BACK_BTN}
        </button>
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/review')}
          className="px-6 py-2 rounded-lg bg-[#0066FF] text-white text-sm font-medium hover:bg-[#0052cc] transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.INTEGRATIONS.CONTINUE_BTN}
        </button>
      </div>
    </div>
  );
}
