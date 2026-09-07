"use client";
import React from 'react';

import { STRINGS } from '../../utils/strings/en';

const integrationsData = STRINGS.INTEGRATIONS.MOCK_DATA;

const getIconForIntegration = (type: string) => {
  switch (type) {
    case 'calendar':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>;
    case 'video':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>;
    case 'sms':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>;
    case 'whatsapp':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>;
    case 'payment':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><line x1="12" y1="18" x2="12" y2="22"></line><line x1="12" y1="2" x2="12" y2="6"></line></svg>;
    case 'analytics':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 3v18h18"></path><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"></path></svg>;
    case 'zapier':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>;
    case 'developer':
      return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6"></polyline><polyline points="8 6 2 12 8 18"></polyline></svg>;
    default:
      return null;
  }
};

export function IntegrationsGrid({ filter = 'All Integrations' }: { filter?: string }) {
  
  const filteredIntegrations = integrationsData.filter(int => {
    if (filter === 'All Integrations' || filter === 'Developer') return true;
    if (filter === 'Calendar') return ['google-calendar', 'outlook'].includes(int.id);
    if (filter === 'Communication') return ['google-meet', 'twilio', 'whatsapp', 'zoom'].includes(int.id);
    if (filter === 'Payments') return ['stripe'].includes(int.id);
    return true;
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto scrollbar-hide pb-10">
      {filteredIntegrations.map(integration => (
        <div key={integration.id} className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
          
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${integration.iconBg} ${integration.iconColor}`}>
                {getIconForIntegration(integration.iconType)}
              </div>
              <div>
                <h3 className="text-[15px] font-extrabold text-gray-900 tracking-tight">{integration.name}</h3>
                <p className={`text-[12px] font-bold ${integration.status === 'Connected' ? 'text-[#10B981]' : 'text-gray-400'}`}>
                  {integration.status}
                </p>
              </div>
            </div>
            
            {integration.action === 'Manage' ? (
              <button className="px-4 py-1.5 border border-gray-200 bg-white rounded-lg text-[12px] font-bold text-gray-700 shadow-sm hover:bg-gray-50 transition-colors">
                {STRINGS.INTEGRATIONS.ACTIONS.MANAGE}
              </button>
            ) : integration.action === 'Configure' ? (
              <button className="px-4 py-1.5 bg-gray-900 text-white rounded-lg text-[12px] font-bold shadow-sm hover:bg-gray-800 transition-colors">
                {STRINGS.INTEGRATIONS.ACTIONS.CONFIGURE}
              </button>
            ) : (
              <button className="px-4 py-1.5 bg-[#0066FF] text-white rounded-lg text-[12px] font-bold shadow-sm hover:bg-[#0052cc] transition-colors">
                {STRINGS.INTEGRATIONS.ACTIONS.CONNECT}
              </button>
            )}
          </div>
          
          <p className="text-[13px] font-medium text-gray-500 leading-snug">
            {integration.description}
          </p>
          
        </div>
      ))}
    </div>
  );
}
