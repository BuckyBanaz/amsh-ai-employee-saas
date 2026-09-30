"use client";
import React, { useEffect, useState } from 'react';
import { STRINGS } from '../../../utils/strings/en';
import { StorageService } from '../../../services/storage.service';
import { DashboardController, AgentItem } from '../../../controllers/dashboard.controller';
import { FormSkeleton } from '../../common/ShimmerSkeleton';

export function CallHandlingTab() {
  const content = STRINGS.DASHBOARD.COMPONENTS.AI_TABS_CONTENT.CALL_HANDLING;
  const phone = content.PHONE_NUMBER;

  const [aiNumber, setAiNumber] = useState('+91 80472 84627');
  const [greeting, setGreeting] = useState(content.GREETING.DEFAULT);
  const [recordCalls, setRecordCalls] = useState(true);
  const [transcribeCalls, setTranscribeCalls] = useState(true);
  const [maxDuration, setMaxDuration] = useState(15);
  const [silenceTimeout, setSilenceTimeout] = useState(10);

  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedAiLine = typeof window !== 'undefined' ? localStorage.getItem('onboarding_telephony_phone') : null;
    const business = StorageService.getBusiness();
    if (savedAiLine && savedAiLine !== business?.business_phone) {
      setAiNumber(savedAiLine);
    } else if (business?.country === 'India' || business?.currency === 'INR') {
      setAiNumber('+91 80472 84627');
    } else {
      setAiNumber('+1 (656) 254-7488');
    }

    DashboardController.getAgent()
      .then((agent: AgentItem) => {
        if (agent) {
          if (agent.greeting_message) setGreeting(agent.greeting_message);
          if (agent.config?.toggles?.record !== undefined) setRecordCalls(agent.config.toggles.record);
          if (agent.config?.toggles?.transcribe !== undefined) setTranscribeCalls(agent.config.toggles.transcribe);
          if (agent.config?.limits?.max_duration_minutes) setMaxDuration(agent.config.limits.max_duration_minutes);
          if (agent.config?.limits?.silence_timeout_seconds) setSilenceTimeout(agent.config.limits.silence_timeout_seconds);
        }
      })
      .catch((err) => console.warn('Failed to load call handling settings:', err))
      .finally(() => setLoading(false));
  }, []);

  const copyNumber = () => {
    navigator.clipboard?.writeText(aiNumber).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      await DashboardController.updateAgent({
        greeting_message: greeting,
        config: {
          toggles: {
            record: recordCalls,
            transcribe: transcribeCalls,
          },
          limits: {
            max_duration_minutes: maxDuration,
            silence_timeout_seconds: silenceTimeout,
          },
        },
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save call handling settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <FormSkeleton title="Loading telephony call handling rules..." />;
  }

  return (
    <div className="animate-in fade-in duration-500 bg-white border border-gray-100 rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-gray-900">{content.TITLE}</h2>
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 animate-in fade-in">
              ✓ Call handling preferences saved!
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-5">{content.DESCRIPTION}</p>

        <div className="space-y-5">

          {/* AI Phone Number Card */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-semibold text-gray-700">{phone.TITLE}</label>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
                ACTIVE TRUNK
              </span>
            </div>

            <div className="border border-gray-200 rounded-xl p-3.5 mb-2 bg-gray-50/60">
              <div className="text-xs font-bold text-gray-900 mb-0.5">{phone.FORWARD_TITLE}</div>
              <p className="text-[11px] text-gray-500 mb-2.5">{phone.FORWARD_DESCRIPTION}</p>
              <div className="flex items-center gap-2">
                <div className="flex-1 px-3 py-2 bg-white border border-gray-200 rounded-lg text-xs font-mono font-bold text-gray-900 tracking-wide">
                  {aiNumber}
                </div>
                <button
                  type="button"
                  onClick={copyNumber}
                  className="px-3 py-2 border border-gray-200 bg-white rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors whitespace-nowrap cursor-pointer shadow-2xs"
                >
                  {copied ? '✓ Copied' : phone.COPY_BTN}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 mt-2">{phone.FORWARD_HINT}</p>
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Opening Greeting */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">{content.GREETING.LABEL}</label>
            <textarea 
              className="w-full border border-gray-200 rounded-lg p-3 text-xs text-gray-800 min-h-[80px] focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all leading-relaxed"
              placeholder={content.GREETING.PLACEHOLDER}
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
            ></textarea>
            <p className="text-[10px] text-gray-400 mt-1">{content.GREETING.HINT}</p>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Recording & Transcription Toggles */}
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer group bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
              <div>
                <div className="text-xs font-semibold text-gray-900">{content.TOGGLES.RECORD}</div>
                <div className="text-[11px] text-gray-500">{content.TOGGLES.RECORD_HINT}</div>
              </div>
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={recordCalls}
                  onChange={(e) => setRecordCalls(e.target.checked)}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#10B981]"></div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
              <div>
                <div className="text-xs font-semibold text-gray-900">{content.TOGGLES.TRANSCRIBE}</div>
                <div className="text-[11px] text-gray-500">{content.TOGGLES.TRANSCRIBE_HINT}</div>
              </div>
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={transcribeCalls}
                  onChange={(e) => setTranscribeCalls(e.target.checked)}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#10B981]"></div>
              </div>
            </label>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Limits */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{content.LIMITS.MAX_DURATION} (Minutes)</label>
              <input 
                type="number" 
                min="1" 
                max="60" 
                value={maxDuration}
                onChange={(e) => setMaxDuration(parseInt(e.target.value, 10) || 15)}
                className="w-full border border-gray-200 rounded-lg p-2 text-xs text-gray-800 focus:outline-none focus:border-[#0066FF]" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{content.LIMITS.SILENT_TIMEOUT} (Seconds)</label>
              <input 
                type="number" 
                min="3" 
                max="30" 
                value={silenceTimeout}
                onChange={(e) => setSilenceTimeout(parseInt(e.target.value, 10) || 10)}
                className="w-full border border-gray-200 rounded-lg p-2 text-xs text-gray-800 focus:outline-none focus:border-[#0066FF]" 
              />
              <p className="text-[10px] text-gray-400 mt-1">{content.LIMITS.SILENT_HINT}</p>
            </div>
          </div>

          <div className="pt-2 flex justify-end">
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
    </div>
  );
}
