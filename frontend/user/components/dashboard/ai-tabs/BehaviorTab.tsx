"use client";
import React, { useEffect, useState } from 'react';
import { STRINGS } from '../../../utils/strings/en';
import { DashboardController, AgentItem } from '../../../controllers/dashboard.controller';
import { FormSkeleton } from '../../common/ShimmerSkeleton';

export function BehaviorTab() {
  const content = STRINGS.DASHBOARD.COMPONENTS.AI_TABS_CONTENT.BEHAVIOR;
  
  const [agentName, setAgentName] = useState('');
  const [prompt, setPrompt] = useState(content.PROMPT.DEFAULT);
  const [complianceInfo, setComplianceInfo] = useState<any>(null);
  const [temperature, setTemperature] = useState(20);
  const [allowSmallTalk, setAllowSmallTalk] = useState(true);
  const [requireConfirmation, setRequireConfirmation] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  const [caps, setCaps] = useState([
    { id: 'faq', name: 'Answer FAQs', enabled: true },
    { id: 'book', name: 'Book appointments', enabled: true },
    { id: 'reschedule', name: 'Reschedule appointments', enabled: true },
    { id: 'cancel', name: 'Cancel appointments', enabled: true },
    { id: 'details', name: 'Collect patient details', enabled: true },
    { id: 'services', name: 'Explain services', enabled: true },
    { id: 'hours', name: 'Explain opening hours', enabled: true },
    { id: 'transfer', name: 'Transfer to human', enabled: true },
    { id: 'messages', name: 'Send appointment details by SMS', enabled: true },
  ]);

  useEffect(() => {
    DashboardController.getAgent()
      .then((agent: AgentItem) => {
        if (agent) {
          if (agent.name) setAgentName(agent.name);
          if (agent.config?.compliance) setComplianceInfo(agent.config.compliance);
          if (agent.config?.system_prompt) {
            setPrompt(agent.config.system_prompt);
          } else if (agent.config?.compliance?.default_system_prompt) {
            setPrompt(agent.config.compliance.default_system_prompt);
          }
          if (agent.config?.temperature !== undefined) setTemperature(agent.config.temperature);
          if (agent.config?.toggles?.small_talk !== undefined) setAllowSmallTalk(agent.config.toggles.small_talk);
          if (agent.config?.toggles?.confirm !== undefined) setRequireConfirmation(agent.config.toggles.confirm);
          
          if (agent.config?.capabilities) {
            setCaps((prev) =>
              prev.map((c) => ({
                ...c,
                enabled: agent.config.capabilities?.[c.id] !== undefined ? !!agent.config.capabilities[c.id] : c.enabled,
              }))
            );
          }
        }
      })
      .catch((err) => console.warn('Failed to load agent behavior:', err))
      .finally(() => setLoading(false));
  }, []);

  const toggleCap = (id: string) => {
    setCaps(caps.map(c => c.id === id ? { ...c, enabled: !c.enabled } : c));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      const capsMap: Record<string, boolean> = {};
      caps.forEach((c) => {
        capsMap[c.id] = c.enabled;
      });

      await DashboardController.updateAgent({
        name: agentName,
        config: {
          system_prompt: prompt,
          temperature,
          capabilities: capsMap,
          toggles: {
            small_talk: allowSmallTalk,
            confirm: requireConfirmation,
          },
        },
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save behavior settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <FormSkeleton title="Loading AI persona and behavior configuration..." />;
  }

  return (
    <div className="animate-in fade-in duration-500 bg-white border border-gray-100 rounded-xl p-5 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <div className="max-w-3xl">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-gray-900">{content.TITLE}</h2>
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 animate-in fade-in">
              ✓ Changes saved to AI agent!
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-5">{content.DESCRIPTION}</p>
        
        <div className="space-y-5">
          
          {/* AI Persona Name */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">AI Receptionist Name</label>
            <input 
              type="text"
              value={agentName}
              onChange={(e) => setAgentName(e.target.value)}
              className="w-full sm:w-80 border border-gray-200 rounded-lg px-3 py-2 text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              placeholder="e.g. AI Receptionist"
            />
            <p className="text-[10px] text-gray-400 mt-1">The persona name your AI receptionist introduces itself with to callers.</p>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* System Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-gray-700">{content.PROMPT.LABEL}</label>
              {complianceInfo?.framework && (
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-700">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  {complianceInfo.framework} ({complianceInfo.region})
                </span>
              )}
            </div>
            <textarea 
              className="w-full border border-gray-200 rounded-lg p-2.5 text-xs text-gray-800 min-h-[110px] focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all leading-relaxed"
              placeholder={complianceInfo?.default_system_prompt || content.PROMPT.PLACEHOLDER}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            ></textarea>
            <p className="text-[10px] text-gray-400 mt-1">
              {complianceInfo?.emergency_code
                ? `Emergency Protocol: ${complianceInfo.emergency_code} · ${content.PROMPT.HINT}`
                : content.PROMPT.HINT}
            </p>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Temperature/Strictness */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-700">{content.TEMP.LABEL}</label>
              <span className="text-xs font-mono font-bold text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded">
                {(temperature / 100).toFixed(2)}
              </span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={temperature}
              onChange={(e) => setTemperature(parseInt(e.target.value, 10))}
              className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#0066FF]" 
            />
            <div className="flex justify-between mt-1">
              <span className="text-[10px] font-semibold text-gray-400">{content.TEMP.STRICT}</span>
              <span className="text-[10px] font-semibold text-gray-400">{content.TEMP.CREATIVE}</span>
            </div>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* Toggles */}
          <div className="space-y-3">
            <label className="flex items-center justify-between cursor-pointer group bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
              <div>
                <div className="text-xs font-semibold text-gray-900">{content.TOGGLES.SMALL_TALK}</div>
                <div className="text-[11px] text-gray-500">{content.TOGGLES.SMALL_TALK_HINT}</div>
              </div>
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={allowSmallTalk}
                  onChange={(e) => setAllowSmallTalk(e.target.checked)}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#10B981]"></div>
              </div>
            </label>

            <label className="flex items-center justify-between cursor-pointer group bg-gray-50/50 p-2.5 rounded-lg border border-gray-100">
              <div>
                <div className="text-xs font-semibold text-gray-900">{content.TOGGLES.CONFIRM}</div>
                <div className="text-[11px] text-gray-500">{content.TOGGLES.CONFIRM_HINT}</div>
              </div>
              <div className="relative">
                <input 
                  type="checkbox" 
                  className="sr-only peer" 
                  checked={requireConfirmation}
                  onChange={(e) => setRequireConfirmation(e.target.checked)}
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#10B981]"></div>
              </div>
            </label>
          </div>

          <div className="h-px bg-gray-100 w-full"></div>

          {/* AI Actions & Capabilities */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wide">AI ACTIONS & CAPABILITIES</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {caps.map((cap) => (
                <label key={cap.id} className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 bg-white hover:border-gray-200 cursor-pointer group transition-all">
                  <div className="text-xs font-medium text-gray-700">{cap.name}</div>
                  <div className="relative">
                    <input 
                      type="checkbox" 
                      className="sr-only peer" 
                      checked={cap.enabled}
                      onChange={() => toggleCap(cap.id)}
                    />
                    <div className="w-8 h-4.5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-[#0066FF]"></div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Save Button */}
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
