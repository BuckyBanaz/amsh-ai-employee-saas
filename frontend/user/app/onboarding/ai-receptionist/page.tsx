"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';

const initialPersonalities = [
  { id: 'professional', name: 'Professional', desc: 'Polite, clinical, focused on scheduling accuracy' },
  { id: 'friendly', name: 'Friendly', desc: 'Conversational, cheerful, high patient engagement' },
  { id: 'warm', name: 'Warm', desc: 'Empathetic, reassuring, ideal for family practices' },
  { id: 'concise', name: 'Concise', desc: 'Direct, quick responses, swift turnarounds' },
];

const voices = [
  { id: 'rachel', name: 'Rachel', type: 'American • Female • Professional' },
  { id: 'drew', name: 'Drew', type: 'American • Male • Friendly' },
  { id: 'matilda', name: 'Matilda', type: 'British • Female • Warm' }
];

const initialLanguages = [
  { id: 'en', name: 'English', selected: true },
  { id: 'nl', name: 'Dutch', selected: true },
  { id: 'de', name: 'German', selected: false },
  { id: 'fr', name: 'French', selected: false },
  { id: 'hi', name: 'Hindi', selected: false },
  { id: 'es', name: 'Spanish', selected: false },
  { id: 'it', name: 'Italian', selected: false },
  { id: 'pt', name: 'Portuguese', selected: false },
];

const initialCapabilities = [
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
  const [selectedVoice, setSelectedVoice] = useState('rachel');
  const [selectedPersonality, setSelectedPersonality] = useState('professional');
  const [playingVoice, setPlayingVoice] = useState<string | null>(null);
  const [transferPhone, setTransferPhone] = useState('+1 (555) 019-2834');
  const [escalation, setEscalation] = useState(STRINGS.ONBOARDING.AI_RECEPTIONIST.ESCALATION_OPTIONS.ASK_HUMAN);
  const [caps, setCaps] = useState(initialCapabilities);
  const [langs, setLangs] = useState(initialLanguages);
  const [isLangDropdownOpen, setIsLangDropdownOpen] = useState(false);
  const [error, setError] = useState('');

  const selectedLangs = langs.filter(l => l.selected);

  const togglePlay = (e: React.MouseEvent, voiceId: string) => {
    e.stopPropagation();
    if (playingVoice === voiceId) {
      setPlayingVoice(null);
    } else {
      setPlayingVoice(voiceId);
      setTimeout(() => {
        setPlayingVoice(null);
      }, 3000);
    }
  };

  const toggleCap = (id: string) => {
    setCaps(caps.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  const toggleLanguage = (id: string) => {
    setLangs(langs.map(l => l.id === id ? { ...l, selected: !l.selected } : l));
  };

  const handleNext = () => {
    if (!aiName.trim() || !greeting.trim()) {
      setError(STRINGS.ONBOARDING.AI_RECEPTIONIST.ERROR_REQUIRED);
      return;
    }
    setError('');
    router.push('/onboarding/knowledge');
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
      <style>{`
        @keyframes audio-wave {
          0%, 100% { height: 4px; }
          50% { height: 16px; }
        }
        .wave-bar {
          animation: audio-wave 1s ease-in-out infinite;
        }
      `}</style>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1.5">{STRINGS.ONBOARDING.AI_RECEPTIONIST.TITLE}</h1>
        <p className="text-sm text-gray-500 leading-relaxed max-w-3xl">
          {STRINGS.ONBOARDING.AI_RECEPTIONIST.SUBTITLE}
        </p>
      </div>

      {error && <div className="mb-4 text-red-500 text-xs font-medium p-2.5 bg-red-50 rounded-lg border border-red-100">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 xl:gap-8 mb-6">
        
        {/* Left Column: Personality & Voice */}
        <div className="space-y-4">
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-900">{STRINGS.ONBOARDING.AI_RECEPTIONIST.FIELDS.NAME}</label>
            <input 
              type="text" 
              value={aiName}
              onChange={(e) => setAiName(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-900">{STRINGS.ONBOARDING.AI_RECEPTIONIST.FIELDS.GREETING}</label>
            <textarea 
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all min-h-[72px] resize-y"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-900">Voice</label>
            <div className="space-y-1.5">
              {voices.map(voice => (
                <div 
                  key={voice.id} 
                  onClick={() => setSelectedVoice(voice.id)}
                  className={`p-3 rounded-lg border ${selectedVoice === voice.id ? 'border-[#0066FF] bg-blue-50/30' : 'border-gray-200 bg-white hover:border-gray-300'} cursor-pointer transition-colors flex items-center justify-between`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedVoice === voice.id ? 'border-[#0066FF]' : 'border-gray-300'}`}>
                      {selectedVoice === voice.id && <div className="w-2 h-2 bg-[#0066FF] rounded-full" />}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-900">{voice.name}</h3>
                      <p className="text-[11px] text-gray-500 mt-0.5">{voice.type}</p>
                    </div>
                  </div>
                  <button 
                    type="button"
                    onClick={(e) => togglePlay(e, voice.id)}
                    className="p-1 rounded-full hover:bg-gray-50 transition-colors w-7 h-7 flex items-center justify-center"
                  >
                    {playingVoice === voice.id ? (
                      <div className="flex items-center gap-[2px] h-3.5">
                        <div className="w-[2.5px] bg-[#0066FF] rounded-full wave-bar" style={{ animationDelay: '0.0s' }}></div>
                        <div className="w-[2.5px] bg-[#0066FF] rounded-full wave-bar" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-[2.5px] bg-[#0066FF] rounded-full wave-bar" style={{ animationDelay: '0.4s' }}></div>
                        <div className="w-[2.5px] bg-[#0066FF] rounded-full wave-bar" style={{ animationDelay: '0.1s' }}></div>
                      </div>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 hover:text-[#0066FF] transition-colors">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polygon points="10 8 16 12 10 16 10 8"></polygon>
                      </svg>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-900">{STRINGS.ONBOARDING.AI_RECEPTIONIST.FIELDS.PERSONALITY}</label>
            <div className="space-y-1.5">
              {initialPersonalities.map(p => (
                <div 
                  key={p.id} 
                  onClick={() => setSelectedPersonality(p.id)}
                  className={`p-3 rounded-lg border ${selectedPersonality === p.id ? 'border-[#0066FF] bg-blue-50/30' : 'border-gray-200 bg-white hover:border-gray-300'} cursor-pointer transition-colors flex items-start gap-3`}
                >
                  <div className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center ${selectedPersonality === p.id ? 'border-[#0066FF]' : 'border-gray-300'}`}>
                    {selectedPersonality === p.id && <div className="w-2 h-2 bg-[#0066FF] rounded-full" />}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-gray-900">{p.name}</h3>
                    <p className="text-[11px] text-gray-500 mt-0.5">{p.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1 relative">
            <label className="text-xs font-semibold text-gray-900">{STRINGS.ONBOARDING.AI_RECEPTIONIST.FIELDS.LANGUAGES}</label>
            <div 
              className="w-full px-3 py-1.5 rounded-lg border border-gray-200 bg-white cursor-pointer flex flex-wrap gap-1.5 items-center min-h-[40px] focus-within:ring-2 focus-within:ring-[#0066FF] focus-within:border-transparent transition-all"
              onClick={() => setIsLangDropdownOpen(!isLangDropdownOpen)}
            >
              {selectedLangs.length === 0 && <span className="text-gray-400 text-xs">Select languages...</span>}
              {selectedLangs.map(l => (
                <span key={l.id} className="flex items-center gap-1 bg-[#F0F7FF] text-[#0066FF] px-2 py-0.5 rounded text-[11px] font-semibold">
                  {l.name}
                  <button 
                    onClick={(e) => { e.stopPropagation(); toggleLanguage(l.id); }} 
                    className="hover:text-blue-800 transition-colors ml-0.5"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </span>
              ))}
              <div className="ml-auto text-gray-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>

            {/* Dropdown Menu */}
            {isLangDropdownOpen && (
              <>
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setIsLangDropdownOpen(false)}
                />
                <div className="absolute top-[105%] left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-20 max-h-48 overflow-y-auto p-1.5">
                  {langs.map(l => (
                    <div 
                      key={l.id} 
                      onClick={() => toggleLanguage(l.id)}
                      className="flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-gray-50 cursor-pointer rounded transition-colors"
                    >
                      <div className={`w-3.5 h-3.5 rounded flex items-center justify-center border transition-colors ${l.selected ? 'bg-[#0066FF] border-[#0066FF]' : 'border-gray-300'}`}>
                        {l.selected && (
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </div>
                      <span className="text-xs font-medium text-gray-900">{l.name}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Capabilities & Escalation */}
        <div className="space-y-4">
          
          <div className="bg-[#F9FAFB] border border-gray-200 rounded-lg p-4">
            <h2 className="text-xs font-bold text-gray-900 mb-3 uppercase tracking-wide">{STRINGS.ONBOARDING.AI_RECEPTIONIST.FIELDS.CAPABILITIES}</h2>
            <div className="space-y-0.5">
              {caps.map(cap => (
                <div key={cap.id} className="flex items-center justify-between py-1.5">
                  <span className="text-xs font-medium text-gray-700">{cap.name}</span>
                  <button 
                    type="button" 
                    onClick={() => toggleCap(cap.id)}
                    className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none ${cap.enabled ? 'bg-[#0066FF]' : 'bg-gray-200'}`}
                  >
                    <span className={`pointer-events-none absolute left-0.5 inline-block h-3 w-3 transform rounded-full bg-white transition-transform shadow-xs ${cap.enabled ? 'translate-x-4' : 'translate-x-0'}`} />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-900">{STRINGS.ONBOARDING.AI_RECEPTIONIST.FIELDS.TRANSFER_PHONE}</label>
            <input 
              type="text" 
              value={transferPhone}
              onChange={(e) => setTransferPhone(e.target.value)}
              placeholder="+31 6XX XXX XXX"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-900">{STRINGS.ONBOARDING.AI_RECEPTIONIST.FIELDS.ESCALATION}</label>
            <div className="relative">
              <select 
                value={escalation}
                onChange={(e) => setEscalation(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all appearance-none bg-white"
              >
                <option>{STRINGS.ONBOARDING.AI_RECEPTIONIST.ESCALATION_OPTIONS.ASK_HUMAN}</option>
                <option>{STRINGS.ONBOARDING.AI_RECEPTIONIST.ESCALATION_OPTIONS.EMERGENCY}</option>
                <option>{STRINGS.ONBOARDING.AI_RECEPTIONIST.ESCALATION_OPTIONS.ALWAYS_AI}</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Footer Buttons */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/hours')}
          className="px-5 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.AI_RECEPTIONIST.BACK_BTN}
        </button>
        <button 
          type="button" 
          onClick={handleNext}
          className="px-6 py-2 rounded-lg bg-[#0066FF] text-white text-sm font-medium hover:bg-[#0052cc] transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.AI_RECEPTIONIST.CONTINUE_BTN}
        </button>
      </div>
    </div>
  );
}

