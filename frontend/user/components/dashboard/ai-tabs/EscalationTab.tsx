"use client";
import React, { useEffect, useState } from 'react';
import { DashboardController, AgentItem } from '../../../controllers/dashboard.controller';
import { StorageService } from '../../../services/storage.service';
import { FormSkeleton } from '../../common/ShimmerSkeleton';

const DEFAULT_TRIGGERS = [
  { id: 'frustration', label: 'Caller expresses intense frustration or anger', active: true },
  { id: 'emergency', label: 'Caller uses emergency keywords (pain, hospital, police)', active: true },
  { id: 'failed_answer', label: 'AI fails to answer the same question twice in a row', active: true },
  { id: 'complex_billing', label: 'Caller requests complex billing or refund assistance', active: false },
  { id: 'human_request', label: 'Caller explicitly asks to "speak to a manager or human"', active: true },
];

export function EscalationTab() {
  const [transferPhone, setTransferPhone] = useState('+1 (555) 123-4567');
  const [triggers, setTriggers] = useState(DEFAULT_TRIGGERS);

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    DashboardController.getAgent()
      .then((agent: AgentItem) => {
        if (agent) {
          if (agent.config?.transfer_phone) {
            setTransferPhone(agent.config.transfer_phone);
          } else {
            const savedEscalation = typeof window !== 'undefined' ? localStorage.getItem('onboarding_telephony_escalation') : null;
            const bPhone = StorageService.getBusiness()?.business_phone;
            if (savedEscalation) setTransferPhone(savedEscalation);
            else if (bPhone) setTransferPhone(bPhone);
          }
          if (agent.config?.escalation_triggers && agent.config.escalation_triggers.length > 0) {
            // Merge loaded triggers with defaults to preserve labels
            const loaded = agent.config.escalation_triggers;
            setTriggers(
              DEFAULT_TRIGGERS.map((dt) => {
                const found = loaded.find((l) => l.id === dt.id || l.label === dt.label);
                return found ? { ...dt, active: found.active } : dt;
              })
            );
          }
        }
      })
      .catch((err) => console.warn('Failed to load escalation rules:', err))
      .finally(() => setLoading(false));
  }, []);

  const toggleTrigger = (id: string) => {
    setTriggers((prev) =>
      prev.map((t) => (t.id === id ? { ...t, active: !t.active } : t))
    );
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      await DashboardController.updateAgent({
        config: {
          transfer_phone: transferPhone,
          escalation_triggers: triggers,
        },
      });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save escalation settings:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return <FormSkeleton title="Loading safety & escalation protocol..." />;
  }

  return (
    <div className="animate-in fade-in duration-500 bg-white border border-gray-100 rounded-xl p-6 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-bold text-gray-900">Escalation &amp; Guardrails</h2>
          {saveSuccess && (
            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-md border border-emerald-200 animate-in fade-in">
              ✓ Human escalation policy updated!
            </span>
          )}
        </div>
        <p className="text-xs text-gray-500 mb-6">Define when and where the AI should abandon the call and transfer to a human.</p>

        <div className="space-y-6">
          
          {/* Transfer Number */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-1.5">Fallback Phone Number</label>
            <div className="relative max-w-md">
              <input 
                type="text" 
                value={transferPhone}
                onChange={(e) => setTransferPhone(e.target.value)}
                placeholder="+1 (555) 123-4567"
                className="w-full border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-800 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all" 
              />
            </div>
            <p className="text-[11px] text-gray-400 mt-1.5">When an escalation is triggered, the caller will be routed here immediately.</p>
          </div>

          <div className="h-px bg-gray-100 w-full my-2"></div>

          {/* Triggers Checklist */}
          <div>
            <label className="block text-xs font-semibold text-gray-800 mb-3">Escalation Triggers</label>
            <div className="space-y-3">
              {triggers.map((trigger) => (
                <label 
                  key={trigger.id} 
                  className="flex items-center gap-2.5 cursor-pointer select-none group"
                >
                  <input 
                    type="checkbox" 
                    checked={trigger.active}
                    onChange={() => toggleTrigger(trigger.id)}
                    className="w-4 h-4 rounded border-gray-300 text-[#0066FF] focus:ring-[#0066FF] accent-[#0066FF] cursor-pointer" 
                  />
                  <span className={`text-xs ${trigger.active ? 'text-gray-900 font-medium' : 'text-gray-400 font-normal'} transition-colors`}>
                    {trigger.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-4 flex justify-end">
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-[#DC2626] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#b91c1c] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              {isSaving ? 'Saving...' : 'Save Escalation Rules'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
