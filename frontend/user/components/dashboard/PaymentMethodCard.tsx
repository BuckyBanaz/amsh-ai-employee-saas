"use client";
import React from 'react';
import { STRINGS } from '../../../../utils/strings/en';

export function PaymentMethodCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm mb-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        {/* Visa Badge */}
        <div className="w-14 h-9 bg-[#F0F7FF] rounded border border-blue-100 flex items-center justify-center text-[#0066FF] font-black text-xs italic tracking-wider">
          {STRINGS.DASHBOARD.COMPONENTS.PAYMENT_METHOD_CARD.BADGE}
        </div>
        
        <div>
          <h4 className="text-[14px] font-extrabold text-gray-900 tracking-tight">{STRINGS.DASHBOARD.COMPONENTS.PAYMENT_METHOD_CARD.DETAILS}</h4>
          <p className="text-[13px] font-medium text-gray-500">{STRINGS.DASHBOARD.COMPONENTS.PAYMENT_METHOD_CARD.EXPIRES}</p>
        </div>
      </div>
      
      <button className="text-[13px] font-bold text-[#0066FF] hover:text-[#0052cc] transition-colors">
        {STRINGS.DASHBOARD.COMPONENTS.PAYMENT_METHOD_CARD.UPDATE_BTN}
      </button>
    </div>
  );
}
