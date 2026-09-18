"use client";
import React, { useState } from 'react';

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button 
      onClick={onChange}
      className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center px-0.5 ${checked ? 'bg-[#0066FF]' : 'bg-gray-200'}`}
    >
      <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-2xs transition-transform ${checked ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
    </button>
  );
}
import { STRINGS } from '../../../utils/strings/en';

export function NotificationSettings() {
  const [emailAppt, setEmailAppt] = useState(true);
  const [pushAppt, setPushAppt] = useState(true);
  const [emailAi, setEmailAi] = useState(true);
  const [pushAi, setPushAi] = useState(false);
  const [emailBilling, setEmailBilling] = useState(true);

  const content = STRINGS.DASHBOARD.SETTINGS.NOTIFICATIONS;

  return (
    <div className="space-y-3 max-w-4xl pb-6">
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-0.5">{content.TITLE}</h3>
        <p className="text-xs text-gray-500 mb-4">{content.DESCRIPTION}</p>
        
        <div className="space-y-4">
          
          {/* Appointments */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 mb-2 border-b border-gray-100 pb-1">{content.GROUPS.APPOINTMENTS.TITLE}</h4>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-800">{content.GROUPS.APPOINTMENTS.EMAIL_TITLE}</div>
                  <div className="text-[11px] text-gray-500">{content.GROUPS.APPOINTMENTS.EMAIL_DESC}</div>
                </div>
                <Toggle checked={emailAppt} onChange={() => setEmailAppt(!emailAppt)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-800">{content.GROUPS.APPOINTMENTS.PUSH_TITLE}</div>
                  <div className="text-[11px] text-gray-500">{content.GROUPS.APPOINTMENTS.PUSH_DESC}</div>
                </div>
                <Toggle checked={pushAppt} onChange={() => setPushAppt(!pushAppt)} />
              </div>
            </div>
          </div>

          {/* AI Activity */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 mb-2 border-b border-gray-100 pb-1">{content.GROUPS.AI_ACTIVITY.TITLE}</h4>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-800">{content.GROUPS.AI_ACTIVITY.EMAIL_TITLE}</div>
                  <div className="text-[11px] text-gray-500">{content.GROUPS.AI_ACTIVITY.EMAIL_DESC}</div>
                </div>
                <Toggle checked={emailAi} onChange={() => setEmailAi(!emailAi)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-800">{content.GROUPS.AI_ACTIVITY.PUSH_TITLE}</div>
                  <div className="text-[11px] text-gray-500">{content.GROUPS.AI_ACTIVITY.PUSH_DESC}</div>
                </div>
                <Toggle checked={pushAi} onChange={() => setPushAi(!pushAi)} />
              </div>
            </div>
          </div>

          {/* Billing */}
          <div>
            <h4 className="text-xs font-bold text-gray-900 mb-2 border-b border-gray-100 pb-1">{content.GROUPS.BILLING.TITLE}</h4>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-gray-800">{content.GROUPS.BILLING.EMAIL_TITLE}</div>
                  <div className="text-[11px] text-gray-500">{content.GROUPS.BILLING.EMAIL_DESC}</div>
                </div>
                <Toggle checked={emailBilling} onChange={() => setEmailBilling(!emailBilling)} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
