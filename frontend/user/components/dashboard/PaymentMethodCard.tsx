"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function PaymentMethodCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-3.5 shadow-[0_1px_4px_rgba(0,0,0,0.03)] mb-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Visa Badge */}
        <div className="w-12 h-7 bg-[#F0F7FF] rounded border border-blue-100 flex items-center justify-center text-[#0066FF] font-black text-[11px] italic tracking-wider">
          {STRINGS.DASHBOARD.COMPONENTS.PAYMENT_METHOD_CARD.BADGE}
        </div>
        
        <div>
          <h4 className="text-xs font-bold text-gray-900 tracking-tight">{STRINGS.DASHBOARD.COMPONENTS.PAYMENT_METHOD_CARD.DETAILS}</h4>
          <p className="text-[11px] font-medium text-gray-500">{STRINGS.DASHBOARD.COMPONENTS.PAYMENT_METHOD_CARD.EXPIRES}</p>
        </div>
      </div>
      
      <button className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors">
        {STRINGS.DASHBOARD.COMPONENTS.PAYMENT_METHOD_CARD.UPDATE_BTN}
      </button>
    </div>
  );
}
