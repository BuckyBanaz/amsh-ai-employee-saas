"use client";
import React, { useState, useEffect } from 'react';
import { STRINGS } from '../../../utils/strings/en';
import { DashboardController } from '../../../controllers/dashboard.controller';

export function AIDefaultsSettings() {
  const content = STRINGS.DASHBOARD.SETTINGS.AI_DEFAULTS;
  const [agentName, setAgentName] = useState('Ananya');
  const [voice, setVoice] = useState('Ananya (Indian English, Professional Female)');
  const [speed, setSpeed] = useState(50);
  const [language, setLanguage] = useState('English (India)');
  const [greeting, setGreeting] = useState('');
  const [fallbackPhone, setFallbackPhone] = useState('');
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    DashboardController.getAgent()
      .then((agent) => {
        if (agent) {
          if (agent.name) setAgentName(agent.name);
          if (agent.greeting_message) setGreeting(agent.greeting_message);
          if (agent.config?.voice_name) setVoice(agent.config.voice_name);
          if (agent.config?.speed) setSpeed(agent.config.speed);
          if (agent.config?.language) setLanguage(agent.config.language);
          if (agent.config?.fallback_phone) setFallbackPhone(agent.config.fallback_phone);
        }
      })
      .catch((err) => console.warn('Failed to load agent defaults:', err));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await DashboardController.updateAgent({
        name: agentName,
        greeting_message: greeting || undefined,
        config: {
          voice_name: voice,
          speed,
          language,
          fallback_phone: fallbackPhone || undefined,
        },
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      console.error('Failed to save AI defaults:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-3 max-w-4xl pb-6">
      {isSaved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in slide-in-from-top-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>AI Receptionist defaults updated and live for all callers!</span>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-0.5">{content.TITLE}</h3>
        <p className="text-xs text-gray-500 mb-4">{content.DESCRIPTION}</p>
        
        <div className="space-y-3.5 max-w-xl">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Agent Name</label>
            <input
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              placeholder="e.g. Ananya"
              className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{content.VOICE.LABEL}</label>
            <div className="relative mb-1">
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none bg-white"
              >
                <option value="Ananya (Indian English, Professional Female)">Ananya (Indian English, Professional Female)</option>
                <option value="Aarav (Indian English, Friendly Male)">Aarav (Indian English, Friendly Male)</option>
                <option value="Priya (Hindi / Hinglish Female)">Priya (Hindi / Hinglish Female)</option>
                <option value="Sarah (American English, Warm Female)">Sarah (American English, Warm Female)</option>
                <option value="Michael (American English, Calm Male)">Michael (American English, Calm Male)</option>
              </select>
              <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-gray-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
            <p className="text-[10px] text-gray-400">{content.VOICE.HINT}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{content.SPEED.LABEL}</label>
            <div className="flex items-center gap-3 mb-1">
              <span className="text-[10px] font-medium text-gray-400">{content.SPEED.SLOW}</span>
              <input
                type="range"
                min="20"
                max="100"
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0066FF]"
              />
              <span className="text-[10px] font-medium text-gray-400">{content.SPEED.FAST}</span>
            </div>
            <p className="text-[10px] text-gray-400">{content.SPEED.HINT}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{content.LANGUAGE.LABEL}</label>
            <div className="relative mb-1">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none bg-white"
              >
                <option value="English (India)">English (India)</option>
                <option value="Hindi & English (Hinglish)">Hindi & English (Hinglish)</option>
                <option value="English (US)">English (US)</option>
                <option value="English (UK)">English (UK)</option>
              </select>
              <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-gray-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
            <p className="text-[10px] text-gray-400">{content.LANGUAGE.HINT}</p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Initial Greeting Message</label>
            <textarea
              rows={2}
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              placeholder="e.g. Hello! Thank you for calling Demo Clinic. How can I assist you with your appointment today?"
              className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Staff Escalation Phone Number</label>
            <input
              type="text"
              value={fallbackPhone}
              onChange={(e) => setFallbackPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
            />
            <p className="text-[10px] text-gray-400 mt-0.5">Calls will be transferred to this human number when callers request staff or during emergencies.</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-1.5 bg-[#0066FF] text-white rounded-md text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors cursor-pointer disabled:opacity-60"
        >
          {saving ? 'Saving...' : content.SAVE}
        </button>
      </div>
    </form>
  );
}
