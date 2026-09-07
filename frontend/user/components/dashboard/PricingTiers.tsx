"use client";
import React from 'react';
import { STRINGS } from '../../../../utils/strings/en';

const plans = STRINGS.DASHBOARD.COMPONENTS.PRICING_TIERS.map((plan, idx) => ({
  ...plan,
  buttonStyle: idx === 0 ? 'bg-white border border-gray-200 text-[#0066FF]' : idx === 1 ? 'bg-gray-100 text-gray-500 cursor-default' : 'bg-white border border-gray-200 text-[#0066FF]',
  active: idx === 1
}));

export function PricingTiers() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {plans.map((plan, idx) => (
        <div 
          key={idx} 
          className={`bg-white rounded-2xl p-6 shadow-sm flex flex-col ${
            plan.active 
              ? 'border-2 border-[#0066FF] shadow-[0_8px_30px_rgb(0,102,255,0.12)]' 
              : 'border border-gray-100 hover:shadow-md transition-shadow'
          }`}
        >
          <div className="mb-6">
            <h3 className="text-[16px] font-extrabold text-gray-900 tracking-tight mb-2">{plan.name}</h3>
            <div className="text-[32px] font-extrabold text-gray-900 tracking-tight">
              {plan.price.split('/')[0]}<span className="text-[16px] font-medium text-gray-500">/{plan.price.split('/')[1]}</span>
            </div>
          </div>
          
          <div className="border-t border-gray-100 pt-6 mb-8 flex-1">
            <ul className="space-y-4">
              {plan.features.map((feature, fIdx) => (
                <li key={fIdx} className="flex items-start gap-3">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span className="text-[13px] font-medium text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <button className={`w-full py-2.5 rounded-lg text-[13px] font-bold shadow-sm transition-colors ${plan.buttonStyle}`}>
            {plan.buttonText}
          </button>
        </div>
      ))}
    </div>
  );
}
