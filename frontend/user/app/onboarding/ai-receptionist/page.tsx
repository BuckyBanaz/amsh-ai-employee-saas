"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';

const personalities = [
  { id: 'professional', name: 'Professional', desc: 'Polite, clinical, focused on scheduling accuracy', selected: true },
  { id: 'friendly', name: 'Friendly', desc: 'Conversational, cheerful, high patient engagement', selected: false },
  { id: 'warm', name: 'Warm', desc: 'Empathetic, reassuring, ideal for family practices', selected: false },
  { id: 'concise', name: 'Concise', desc: 'Direct, quick responses, swift turnarounds', selected: false },
];

const languages = [
  { id: 'en', name: 'English', selected: true },
  { id: 'nl', name: 'Dutch', selected: true },
  { id: 'de', name: 'German', selected: false },
  { id: 'fr', name: 'French', selected: false },
  { id: 'hi', name: 'Hindi', selected: false },
];

const capabilities = [
  { id: 'faq', name: 'Answer FAQs', enabled: true },
  { id: 'book', name: 'Book appointments', enabled: true },
  { id: 'reschedule', name: 'Reschedule appointments', enabled: true },
  { id: 'cancel', name: 'Cancel appointments', enabled: true },
  { id: 'details', name: 'Collect patient details', enabled: true },
  { id: 'services', name: 'Explain services', enabled: true },
  { id: 'hours', name: 'Explain opening hours', enabled: true },
  { id: 'transfer', name: 'Transfer to human', enabled: true },
];

export default function AiReceptionistOnboardingPage() {
  const router = useRouter();
  const [aiName, setAiName] = useState('Sarah');
  const [greeting, setGreeting] = useState('Hi, welcome to Smile Dental Clinic. How can I help you today?');
  const [error, setError] = useState('');

  const handleNext = () => {
    if (!aiName.trim() || !greeting.trim()) {
      setError(STRINGS.ONBOARDING.AI_RECEPTIONIST.ERROR_REQUIRED);
      return;
    }
    setError('');
    router.push('/onboarding/knowledge');
  };

  return (
    <div className="w-full max-w-5xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">{STRINGS.ONBOARDING.AI_RECEPTIONIST.TITLE}</h1>
        <p className="text-gray-500 leading-relaxed max-w-3xl">
          {STRINGS.ONBOARDING.AI_RECEPTIONIST.SUBTITLE}
        </p>
      </div>

      {error && <div className="mb-6 text-red-500 text-sm font-medium p-3 bg-red-50 rounded-lg border border-red-100">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16 mb-8">
        
        {/* Left Column: Personality & Voice */}
        <div className="space-y-8">
          
          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-900">{STRINGS.ONBOARDING.AI_RECEPTIONIST.FIELDS.NAME}</label>
            <input 
              type="text" 
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-900">{STRINGS.ONBOARDING.AI_RECEPTIONIST.FIELDS.GREETING}</label>
            <textarea 
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all min-h-[96px] resize-y"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-900">{STRINGS.ONBOARDING.AI_RECEPTIONIST.FIELDS.PERSONALITY}</label>
            <div className="space-y-2">
              {personalities.map(p => (
                <div key={p.id} className={`p-4 rounded-xl border ${p.selected ? 'border-[#0066FF] bg-blue-50/30' : 'border-gray-200 bg-white hover:border-gray-300'} cursor-pointer transition-colors flex items-start gap-4`}>
                  <div className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${p.selected ? 'border-[#0066FF]' : 'border-gray-300'}`}>
                    {p.selected && <div className="w-2 h-2 bg-[#0066FF] rounded-full" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{p.name}</h3>
                    <p className="text-xs text-gray-500 mt-1">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-900">{STRINGS.ONBOARDING.AI_RECEPTIONIST.FIELDS.LANGUAGES}</label>
            <div className="flex flex-wrap gap-3">
              {languages.map(lang => (
                <label key={lang.id} className="flex items-center gap-2.5 cursor-pointer group">
                  <div className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${lang.selected ? 'bg-[#0066FF] border-[#0066FF]' : 'border-gray-300 group-hover:border-[#0066FF]'}`}>
                    {lang.selected && (
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                  <span className="text-sm font-medium text-gray-900">{lang.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Capabilities & Escalation */}
        <div className="space-y-8">
          
          <div className="bg-[#F9FAFB] border border-gray-200 rounded-xl p-6">
            <h2 className="text-sm font-bold text-gray-900 mb-5 uppercase tracking-wide">{STRINGS.ONBOARDING.AI_RECEPTIONIST.FIELDS.CAPABILITIES}</h2>
            <div className="space-y-1">
              {capabilities.map(cap => (
                <div key={cap.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-medium text-gray-700">{cap.name}</span>
                  <button type="button" className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none ${cap.enabled ? 'bg-[#0066FF]' : 'bg-gray-200'}`}>
                    <span className={`pointer-events-none absolute left-0.5 inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${cap.enabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-900">{STRINGS.ONBOARDING.AI_RECEPTIONIST.FIELDS.TRANSFER_PHONE}</label>
            <input 
              type="text" 
              placeholder="+31 6XX XXX XXX"
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-semibold text-gray-900">{STRINGS.ONBOARDING.AI_RECEPTIONIST.FIELDS.ESCALATION}</label>
            <div className="relative">
              <select className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all appearance-none bg-white">
                <option>{STRINGS.ONBOARDING.AI_RECEPTIONIST.ESCALATION_OPTIONS.ASK_HUMAN}</option>
                <option>{STRINGS.ONBOARDING.AI_RECEPTIONIST.ESCALATION_OPTIONS.EMERGENCY}</option>
                <option>{STRINGS.ONBOARDING.AI_RECEPTIONIST.ESCALATION_OPTIONS.ALWAYS_AI}</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-gray-400">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer Buttons */}
      <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/hours')}
          className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.AI_RECEPTIONIST.BACK_BTN}
        </button>
        <button 
          type="button" 
          onClick={handleNext}
          className="px-8 py-2.5 rounded-lg bg-[#0066FF] text-white font-medium hover:bg-[#0052cc] transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.AI_RECEPTIONIST.CONTINUE_BTN}
        </button>
      </div>
    </div>
  );
}

