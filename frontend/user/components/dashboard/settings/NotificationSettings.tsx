"use client";
import React, { useState } from 'react';

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button 
      onClick={onChange}
      className={`w-10 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${checked ? 'bg-[#0066FF]' : 'bg-gray-200'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full shadow-sm transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`}></div>
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
    <div className="space-y-6 max-w-4xl pb-10">
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-[16px] font-extrabold text-gray-900 tracking-tight mb-1">{content.TITLE}</h3>
        <p className="text-[13px] font-medium text-gray-500 mb-8">{content.DESCRIPTION}</p>
        
        <div className="space-y-8">
          
          {/* Appointments */}
          <div>
            <h4 className="text-[14px] font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">{content.GROUPS.APPOINTMENTS.TITLE}</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-bold text-gray-800">{content.GROUPS.APPOINTMENTS.EMAIL_TITLE}</div>
                  <div className="text-[12px] font-medium text-gray-500">{content.GROUPS.APPOINTMENTS.EMAIL_DESC}</div>
                </div>
                <Toggle checked={emailAppt} onChange={() => setEmailAppt(!emailAppt)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-bold text-gray-800">{content.GROUPS.APPOINTMENTS.PUSH_TITLE}</div>
                  <div className="text-[12px] font-medium text-gray-500">{content.GROUPS.APPOINTMENTS.PUSH_DESC}</div>
                </div>
                <Toggle checked={pushAppt} onChange={() => setPushAppt(!pushAppt)} />
              </div>
            </div>
          </div>

          {/* AI Activity */}
          <div>
            <h4 className="text-[14px] font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">{content.GROUPS.AI_ACTIVITY.TITLE}</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-bold text-gray-800">{content.GROUPS.AI_ACTIVITY.EMAIL_TITLE}</div>
                  <div className="text-[12px] font-medium text-gray-500">{content.GROUPS.AI_ACTIVITY.EMAIL_DESC}</div>
                </div>
                <Toggle checked={emailAi} onChange={() => setEmailAi(!emailAi)} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-bold text-gray-800">{content.GROUPS.AI_ACTIVITY.PUSH_TITLE}</div>
                  <div className="text-[12px] font-medium text-gray-500">{content.GROUPS.AI_ACTIVITY.PUSH_DESC}</div>
                </div>
                <Toggle checked={pushAi} onChange={() => setPushAi(!pushAi)} />
              </div>
            </div>
          </div>

          {/* Billing */}
          <div>
            <h4 className="text-[14px] font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">{content.GROUPS.BILLING.TITLE}</h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[13px] font-bold text-gray-800">{content.GROUPS.BILLING.EMAIL_TITLE}</div>
                  <div className="text-[12px] font-medium text-gray-500">{content.GROUPS.BILLING.EMAIL_DESC}</div>
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
