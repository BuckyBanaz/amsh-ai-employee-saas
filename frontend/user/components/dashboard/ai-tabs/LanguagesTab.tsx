"use client";
import React, { useEffect, useState } from 'react';
import { STRINGS } from '../../../utils/strings/en';
import { DashboardController, AgentItem } from '../../../controllers/dashboard.controller';
import { GlobalLoader } from '../../common/GlobalLoader';

const ALL_LANGUAGES = [
  { code: 'en', name: 'English (US)' },
  { code: 'en-IN', name: 'English (India)' },
  { code: 'hi', name: 'Hindi (हिंदी)' },
  { code: 'es', name: 'Spanish (Español)' },
  { code: 'fr', name: 'French (Français)' },
  { code: 'de', name: 'German (Deutsch)' },
  { code: 'ar', name: 'Arabic (العربية)' },
];

export function LanguagesTab() {
  const content = STRINGS.DASHBOARD.COMPONENTS.AI_TABS_CONTENT.LANGUAGES;
  
  const [primaryLang, setPrimaryLang] = useState('en');
  const [selectedCodes, setSelectedCodes] = useState<string[]>(['en', 'en-IN', 'hi']);
  const [autoDetect, setAutoDetect] = useState(true);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DashboardController.getAgent()
      .then((agent: AgentItem) => {
        if (agent) {
          if (agent.primary_language) setPrimaryLang(agent.primary_language);
          if (agent.languages && agent.languages.length > 0) setSelectedCodes(agent.languages);
          if (agent.config?.auto_detect_language !== undefined) setAutoDetect(agent.config.auto_detect_language);
        }
      })
      .catch((err) => console.warn('Failed to load agent language settings:', err))
      .finally(() => setLoading(false));
  }, []);

  const toggleLanguage = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      await DashboardController.updateAgent({
        primary_language: primaryLang,
        languages: selectedCodes,
        config: {
          auto_detect_language: autoDetect,
        },
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save language settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl shadow-xs overflow-hidden">
        <GlobalLoader message="Loading multilingual language packs & presets..." size="md" />
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500 bg-white border border-gray-100 rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <div className="max-w-2xl space-y-5">

        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-gray-900">{content.TITLE}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{content.DESCRIPTION}</p>
          </div>
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 animate-in fade-in">
              ✓ Language settings updated!
            </span>
          )}
        </div>

        {/* Primary Language */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-gray-700">{content.PRIMARY.LABEL}</label>
          <div className="relative sm:w-64">
            <select 
              value={primaryLang}
              onChange={(e) => setPrimaryLang(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-none focus:border-[#0066FF] bg-white cursor-pointer"
            >
              {ALL_LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          </div>
          <p className="text-[10px] text-gray-400">{content.PRIMARY.HINT}</p>
        </div>

        <div className="h-px bg-gray-100" />

        {/* Auto Detect Toggle */}
        <label className="flex items-center justify-between cursor-pointer group bg-gray-50/60 px-4 py-3 rounded-xl border border-gray-100">
          <div>
            <div className="text-xs font-bold text-gray-900">{content.AUTO_DETECT.LABEL}</div>
            <div className="text-[11px] text-gray-500">{content.AUTO_DETECT.HINT}</div>
          </div>
          <div className="relative shrink-0 ml-4">
            <input 
              type="checkbox" 
              className="sr-only peer" 
              checked={autoDetect}
              onChange={(e) => setAutoDetect(e.target.checked)}
            />
            <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#10B981]" />
          </div>
        </label>

        {/* Supported Languages */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-2">{content.SUPPORTED.LABEL}</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ALL_LANGUAGES.map((lang) => {
              const active = selectedCodes.includes(lang.code);
              return (
                <div
                  key={lang.code}
                  onClick={() => toggleLanguage(lang.code)}
                  className={`border rounded-lg px-3 py-2.5 flex items-center gap-2.5 cursor-pointer transition-all ${
                    active ? 'border-[#0066FF] bg-[#F0F7FF]' : 'border-gray-200 hover:border-gray-300 bg-white'
                  }`}
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 transition-colors ${
                    active ? 'bg-[#0066FF] border-[#0066FF]' : 'border-gray-300'
                  }`}>
                    {active && (
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-xs font-semibold ${active ? 'text-[#0066FF]' : 'text-gray-700'}`}>
                    {lang.name}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button 
            onClick={handleSave}
            disabled={isSaving}
            className="px-5 py-2 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
            {isSaving ? 'Saving...' : content.SAVE}
          </button>
        </div>

      </div>
    </div>
  );
}
