"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';

interface TwilioConfig {
  mode: 'new_number' | 'forwarding';
  allocatedNumber: string;
  existingClinicNumber?: string;
  humanTransferNumber?: string;
  country: string;
}

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

  const [twilioModalOpen, setTwilioModalOpen] = useState(false);
  const [twilioTab, setTwilioTab] = useState<'new_number' | 'forwarding'>('new_number');
  
  // Twilio Setup Form State
  const [selectedCountry, setSelectedCountry] = useState('US (+1)');
  const [selectedAreaCode, setSelectedAreaCode] = useState('555');
  const [isSearchingNumbers, setIsSearchingNumbers] = useState(false);

  // Available phone numbers fetched from Twilio AvailablePhoneNumbers API
  const availableNumbers = [
    { number: `+1 (${selectedAreaCode}) 019-2834`, locality: `Local Direct Line • Area Code (${selectedAreaCode})`, feature: 'Voice HD' },
    { number: `+1 (${selectedAreaCode}) 019-7741`, locality: `Standard VoIP Line • Area Code (${selectedAreaCode})`, feature: 'Voice HD' },
    { number: `+1 (${selectedAreaCode}) 019-9210`, locality: `Digital Carrier Line • Area Code (${selectedAreaCode})`, feature: 'Voice HD' },
  ];
  
  const [selectedNumber, setSelectedNumber] = useState(availableNumbers[0].number);
  
  // Auto-filled from Step 1 (Business Phone) & Step 6 (AI Human Escalation)
  const [existingPhone, setExistingPhone] = useState('+1 (555) 234-5678');
  const [humanTransferPhone, setHumanTransferPhone] = useState('+1 (555) 987-6543');
  
  const [twilioConfig, setTwilioConfig] = useState<TwilioConfig>({
    mode: 'new_number',
    allocatedNumber: '+1 (555) 019-2834',
    country: 'US',
  });

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
      name: 'Twilio Carrier & Phone Line',
      description: 'Dedicated AI telephony line or smart call forwarding for live voice calls.',
      connected: true,
      details: `${selectedNumber} (Active)`,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0066FF]">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
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
      id: 'whatsapp',
      provider: 'whatsapp',
      name: 'WhatsApp Business',
      description: 'Send instant notification reminders directly to patients.',
      connected: false,
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0066FF]">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
        </svg>
      ),
    },
    {
      id: 'stripe',
      provider: 'stripe',
      name: 'Stripe',
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
      setTwilioModalOpen(true);
      return;
    }
    // Generic toggle for other integrations
    setIntegrations(integrations.map(item => 
      item.id === integration.id ? { ...item, connected: !item.connected } : item
    ));
  };

  const handleRefreshNumbers = () => {
    setIsSearchingNumbers(true);
    setTimeout(() => {
      setIsSearchingNumbers(false);
    }, 400);
  };

  const handleSaveTwilio = (e: React.FormEvent) => {
    e.preventDefault();
    const finalNumber = twilioTab === 'new_number' ? selectedNumber : '+1 (555) 019-2834';
    
    setTwilioConfig({
      mode: twilioTab,
      allocatedNumber: finalNumber,
      existingClinicNumber: twilioTab === 'forwarding' ? existingPhone : undefined,
      humanTransferNumber: humanTransferPhone,
      country: selectedCountry,
    });

    setIntegrations(integrations.map(item => 
      item.id === 'twilio' 
        ? { 
            ...item, 
            connected: true, 
            details: twilioTab === 'new_number' ? `${finalNumber} (Dedicated Line)` : `Forwarding to ${finalNumber}` 
          } 
        : item
    ));

    setTwilioModalOpen(false);
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
            className={`flex flex-col justify-between h-[190px] rounded-lg p-3.5 border transition-all ${
              integration.connected 
                ? 'bg-white border-[#0066FF] shadow-[0_0_0_1px_rgba(0,102,255,0.2)]' 
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className="space-y-2">
              <div className="flex items-start justify-between">
                <div className="w-8 h-8 rounded-lg bg-[#F0F7FF] flex items-center justify-center">
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
                  <p className="text-[10px] font-semibold text-[#0066FF] mt-1 bg-blue-50/60 px-1.5 py-0.5 rounded inline-block">
                    {integration.details}
                  </p>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-gray-100">
              <button 
                type="button" 
                onClick={() => handleCardClick(integration)}
                className={`w-full py-1.5 rounded-md font-semibold text-xs transition-colors cursor-pointer ${
                  integration.connected
                    ? 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    : 'bg-[#0066FF] text-white hover:bg-[#0052cc]'
                }`}
              >
                {integration.id === 'twilio'
                  ? (integration.connected ? 'Configure Phone Setup' : 'Set Up Phone Line')
                  : (integration.connected ? STRINGS.ONBOARDING.INTEGRATIONS.BTN_MANAGE : STRINGS.ONBOARDING.INTEGRATIONS.BTN_CONNECT)}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Twilio Telephony Setup Modal */}
      {twilioModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl shadow-2xl border border-gray-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0066FF] flex items-center justify-center">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">Twilio Telephony &amp; AI Phone Setup</h3>
                  <p className="text-[11px] text-gray-500">Pick how patient phone calls are routed to Sarah (AI Receptionist).</p>
                </div>
              </div>
              <button 
                onClick={() => setTwilioModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100 transition-colors"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Path Selector Tabs */}
            <div className="grid grid-cols-2 p-2.5 gap-2 bg-gray-100/70 border-b border-gray-100">
              <button 
                type="button"
                onClick={() => setTwilioTab('new_number')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                  twilioTab === 'new_number'
                    ? 'bg-white text-[#0066FF] shadow-xs border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>Option 1: Choose New Dedicated Number</span>
                <span className="text-[10px] font-normal text-gray-500">Browse &amp; select from available lines</span>
              </button>
              <button 
                type="button"
                onClick={() => setTwilioTab('forwarding')}
                className={`py-2 px-3 rounded-lg text-xs font-bold transition-all flex flex-col items-center gap-0.5 cursor-pointer ${
                  twilioTab === 'forwarding'
                    ? 'bg-white text-[#0066FF] shadow-xs border border-blue-200'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <span>Option 2: Use Existing Clinic Number</span>
                <span className="text-[10px] font-normal text-gray-500">Keep current number via Call Forwarding</span>
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSaveTwilio} className="p-4 sm:p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {twilioTab === 'new_number' ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Country</label>
                      <select 
                        value={selectedCountry}
                        onChange={(e) => setSelectedCountry(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-[#0066FF] focus:outline-none"
                      >
                        <option>United States (+1)</option>
                        <option>United Kingdom (+44)</option>
                        <option>Netherlands (+31)</option>
                        <option>Canada (+1)</option>
                        <option>Australia (+61)</option>
                        <option>India (+91)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Area Code / Region</label>
                      <div className="flex gap-1.5">
                        <input 
                          type="text"
                          value={selectedAreaCode}
                          onChange={(e) => setSelectedAreaCode(e.target.value)}
                          placeholder="e.g. 555"
                          className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-[#0066FF] focus:outline-none"
                          required
                        />
                        <button
                          type="button"
                          onClick={handleRefreshNumbers}
                          className="px-2 py-1 text-[11px] font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-md border border-gray-200"
                        >
                          Search
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Available Numbers Selection List */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[11px] font-bold text-gray-800 uppercase tracking-wide">
                        Available Numbers to Select:
                      </label>
                      <span className="text-[10px] text-emerald-600 font-semibold">● Live Twilio Inventory</span>
                    </div>

                    <div className="space-y-2">
                      {availableNumbers.map((item) => {
                        const isChosen = selectedNumber === item.number;
                        return (
                          <div 
                            key={item.number}
                            onClick={() => setSelectedNumber(item.number)}
                            className={`p-2.5 rounded-lg border flex items-center justify-between cursor-pointer transition-all ${
                              isChosen
                                ? 'bg-blue-50/50 border-[#0066FF] ring-1 ring-[#0066FF]/30'
                                : 'bg-white border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${isChosen ? 'border-[#0066FF]' : 'border-gray-300'}`}>
                                {isChosen && <div className="w-2 h-2 bg-[#0066FF] rounded-full"></div>}
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-900 font-mono">{item.number}</p>
                                <p className="text-[10px] text-gray-500">{item.locality}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-medium text-blue-800 bg-blue-100/60 px-2 py-0.5 rounded">
                              {item.feature}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-3 text-xs text-amber-900">
                    <p className="font-semibold mb-0.5">Carrier Call Forwarding Flow</p>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      Patients call your existing practice number. Your carrier forwards the ring to your dedicated AMSh destination line, where Sarah answers immediately.
                    </p>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-semibold text-gray-700">Your Existing Clinic Phone Number</label>
                      <span className="text-[10px] text-gray-400">Auto-filled from Step 1</span>
                    </div>
                    <input 
                      type="tel"
                      value={existingPhone}
                      onChange={(e) => setExistingPhone(e.target.value)}
                      placeholder="+1 (555) 000-0000"
                      className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-[#0066FF] focus:outline-none font-mono"
                      required
                    />
                  </div>

                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1.5">
                    <p className="text-[11px] font-bold text-gray-900">Your AMSh Destination Forwarding Line:</p>
                    <div className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded border border-gray-200">
                      <span className="text-xs font-mono font-bold text-[#0066FF]">+1 (555) 019-2834</span>
                      <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">Dedicated Trunk</span>
                    </div>
                    <p className="text-[10px] text-gray-500">
                      <strong>Carrier Setup:</strong> Dial <code className="bg-gray-200 px-1 py-0.5 rounded text-gray-900 font-mono">*72 +15550192834</code> on your clinic phone to activate auto-forwarding.
                    </p>
                  </div>
                </div>
              )}

              {/* Shared: Doctor / Human Escalation Transfer Number */}
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-gray-700">
                    Human Escalation Backup Number (Doctor / Front Desk Mobile)
                  </label>
                  <span className="text-[10px] text-gray-400">Synced from Step 6</span>
                </div>
                <input 
                  type="tel"
                  value={humanTransferPhone}
                  onChange={(e) => setHumanTransferPhone(e.target.value)}
                  placeholder="+1 (555) 000-0000"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-md focus:ring-2 focus:ring-[#0066FF] focus:outline-none font-mono"
                  required
                />
                <p className="text-[10px] text-gray-400 mt-0.5">When patient asks for a human, Sarah instantly transfers the live call to this line.</p>
              </div>

              {/* Footer Buttons */}
              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button 
                  type="button" 
                  onClick={() => setTwilioModalOpen(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-1.5 text-xs font-bold text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-md transition-colors shadow-xs"
                >
                  Confirm &amp; Link Phone Setup
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
