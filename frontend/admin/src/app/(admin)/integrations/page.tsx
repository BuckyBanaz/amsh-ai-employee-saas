"use client";
import React, { useState } from 'react';

type IntegrationCategory = 'AI' | 'Voice' | 'Messaging' | 'Calendar' | 'Payments';
type IntegrationStatus = 'Connected' | 'Disconnected' | 'API Error';

interface IntegrationItem {
  id: string;
  name: string;
  category: IntegrationCategory;
  icon: string;
  status: IntegrationStatus;
  apiKeyMasked: string;
  lastChecked: string;
  errorRate: string;
}

const integrationsData: IntegrationItem[] = [
  {
    id: 'int-openai',
    name: 'OpenAI',
    category: 'AI',
    icon: 'sparkles',
    status: 'Connected',
    apiKeyMasked: '••••••••••••••••••',
    lastChecked: '2 min ago',
    errorRate: '0.1%',
  },
  {
    id: 'int-gemini',
    name: 'Google Gemini',
    category: 'AI',
    icon: 'sparkles',
    status: 'Connected',
    apiKeyMasked: '••••••••••••••••••',
    lastChecked: '5 min ago',
    errorRate: '0.0%',
  },
  {
    id: 'int-groq',
    name: 'Groq',
    category: 'AI',
    icon: 'cpu',
    status: 'Connected',
    apiKeyMasked: '••••••••••••••••••',
    lastChecked: '3 min ago',
    errorRate: '0.2%',
  },
  {
    id: 'int-elevenlabs',
    name: 'ElevenLabs',
    category: 'Voice',
    icon: 'mic',
    status: 'Connected',
    apiKeyMasked: '••••••••••••••••••',
    lastChecked: '1 min ago',
    errorRate: '0.0%',
  },
  {
    id: 'int-twilio',
    name: 'Twilio',
    category: 'Voice',
    icon: 'phone',
    status: 'Connected',
    apiKeyMasked: '••••••••••••••••••',
    lastChecked: '2 min ago',
    errorRate: '0.1%',
  },
  {
    id: 'int-whatsapp',
    name: 'WhatsApp Business',
    category: 'Messaging',
    icon: 'message',
    status: 'Connected',
    apiKeyMasked: '••••••••••••••••••',
    lastChecked: '4 min ago',
    errorRate: '0.3%',
  },
  {
    id: 'int-google-calendar',
    name: 'Google Calendar',
    category: 'Calendar',
    icon: 'calendar',
    status: 'Connected',
    apiKeyMasked: '••••••••••••••••••',
    lastChecked: '6 min ago',
    errorRate: '0.0%',
  },
  {
    id: 'int-microsoft-calendar',
    name: 'Microsoft Calendar',
    category: 'Calendar',
    icon: 'calendar',
    status: 'Disconnected',
    apiKeyMasked: '••••••••••••••••••',
    lastChecked: '-',
    errorRate: '-',
  },
  {
    id: 'int-stripe',
    name: 'Stripe',
    category: 'Payments',
    icon: 'credit-card',
    status: 'API Error',
    apiKeyMasked: '••••••••••••••••••',
    lastChecked: 'Just now',
    errorRate: '4.82%',
  },
];

const tabs = ['All', 'AI', 'Voice', 'Messaging', 'Calendar', 'Payments'] as const;

const statusStyles: Record<IntegrationStatus, string> = {
  Connected: 'bg-[#D1FAE5] text-[#065F46]',
  Disconnected: 'bg-[#F1F5F9] text-[#475569]',
  'API Error': 'bg-[#FEE2E2] text-[#991B1B]',
};

const getIcon = (name: string) => {
  switch (name) {
    case 'sparkles':
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z"></path><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15z"></path></svg>;
    case 'cpu':
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="4" width="16" height="16" rx="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>;
    case 'mic':
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>;
    case 'phone':
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>;
    case 'message':
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>;
    case 'calendar':
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
    case 'credit-card':
      return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>;
    default:
      return null;
  }
};

const errorRateColor = (rate: string) => {
  if (rate === '-') return 'text-[#475569]';
  return parseFloat(rate) >= 1 ? 'text-[#EF4444]' : 'text-[#10B981]';
};

export default function IntegrationsPage() {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>('All');

  const filteredIntegrations = integrationsData.filter(
    (i) => activeTab === 'All' || i.category === activeTab
  );

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      {/* Header */}
      <header className="mb-4 pb-3 border-b border-[#E2E8F0] flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A] tracking-tight leading-tight">
            Integrations
          </h1>
          <p className="text-xs text-[#475569] mt-0.5 font-normal">
            Platform-wide integration management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 border border-[#E2E8F0] rounded-md py-1.5 px-2.5 text-xs font-medium text-[#475569] bg-white shadow-2xs hover:bg-gray-50 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Jan 1 - Jan 30, 2026
          </button>
          <button className="flex items-center justify-center border border-[#E2E8F0] rounded-full w-7 h-7 text-[#475569] bg-white shadow-2xs hover:bg-gray-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>
      </header>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 mb-3.5 border-b border-[#E2E8F0]">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 px-2.5 text-xs font-semibold transition-colors relative ${
              activeTab === tab
                ? 'text-[#2563EB]'
                : 'text-[#64748B] hover:text-[#0F172A]'
            }`}
          >
            {tab}
            {activeTab === tab && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#2563EB] rounded-full" />
            )}
          </button>
        ))}
      </div>

      {/* Integrations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
        {filteredIntegrations.map((integration) => (
          <div
            key={integration.id}
            className="bg-white border border-[#E2E8F0] rounded-lg p-3.5 shadow-2xs flex flex-col gap-3"
          >
            {/* Top: identity + status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[#F1F5F9] text-[#475569] flex items-center justify-center shrink-0">
                  {getIcon(integration.icon)}
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-[#0F172A] leading-tight">
                    {integration.name}
                  </span>
                  <span className="text-[10px] text-[#64748B]">{integration.category}</span>
                </div>
              </div>
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusStyles[integration.status]}`}
              >
                {integration.status}
              </span>
            </div>

            {/* Details */}
            <div className="bg-[#F8FAFC] rounded-md p-2.5 flex flex-col gap-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[11px] text-[#64748B]">API Key</span>
                <span className="text-[11px] font-semibold text-[#0F172A]">
                  {integration.apiKeyMasked}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] text-[#64748B]">Last Checked</span>
                <span className="text-[11px] font-medium text-[#1E293B]">
                  {integration.lastChecked}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[11px] text-[#64748B]">Error Rate</span>
                <span className={`text-[11px] font-semibold ${errorRateColor(integration.errorRate)}`}>
                  {integration.errorRate}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-0.5">
              <button className="flex-1 py-1 px-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded text-xs font-semibold transition-colors">
                Configure
              </button>
              <button className="flex-1 py-1 px-2.5 border border-[#E2E8F0] text-[#475569] rounded text-xs font-semibold hover:bg-gray-50 transition-colors">
                Test Connection
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
