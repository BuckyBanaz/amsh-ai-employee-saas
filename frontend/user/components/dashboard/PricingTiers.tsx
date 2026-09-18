"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

const plans = STRINGS.DASHBOARD.COMPONENTS.PRICING_TIERS.map((plan, idx) => ({
  ...plan,
  buttonStyle: idx === 0 ? 'bg-white border border-gray-200 text-[#0066FF] hover:bg-blue-50' : idx === 1 ? 'bg-gray-100 text-gray-500 cursor-default' : 'bg-white border border-gray-200 text-[#0066FF] hover:bg-blue-50',
  active: idx === 1
}));

export function PricingTiers() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
      {plans.map((plan, idx) => (
        <div 
          key={idx} 
          className={`bg-white rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col justify-between ${
            plan.active 
              ? 'border-2 border-[#0066FF] shadow-md' 
              : 'border border-gray-100 hover:shadow-sm transition-shadow'
          }`}
        >
          <div className="mb-3">
            <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-1">{plan.name}</h3>
            <div className="text-2xl font-bold text-gray-900 tracking-tight">
              {plan.price.split('/')[0]}<span className="text-xs font-medium text-gray-500">/{plan.price.split('/')[1]}</span>
            </div>
          </div>
          
          <div className="border-t border-gray-100 pt-3 mb-4 flex-1">
            <ul className="space-y-2">
              {plan.features.map((feature, fIdx) => (
                <li key={fIdx} className="flex items-start gap-2">
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  <span className="text-xs font-medium text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <button className={`w-full py-1.5 rounded-md text-xs font-semibold transition-colors ${plan.buttonStyle}`}>
            {plan.buttonText}
          </button>
        </div>
      ))}
    </div>
  );
}
