"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PlansSelectionPage() {
  const router = useRouter();
  const [cycle, setCycle] = useState<'Monthly' | 'Yearly'>('Monthly');
  const [selectedPlan, setSelectedPlan] = useState<string>('professional');

  const plans = [
    {
      id: 'starter',
      name: 'Starter Practice',
      price: cycle === 'Monthly' ? 99 : 990,
      badge: null,
      desc: 'Ideal for solo practitioners and small dental/medical clinics.',
      features: [
        '500 Voice Minutes / mo',
        '2 Concurrent Patient Calls',
        'Dedicated AI Phone Number Included',
        'Google & Outlook Calendar Sync',
        'Standard Human Call Transfer',
        'Email & Helpdesk Support'
      ]
    },
    {
      id: 'professional',
      name: 'Professional Clinic',
      price: cycle === 'Monthly' ? 199 : 1990,
      badge: 'MOST POPULAR',
      desc: 'For busy clinics needing higher capacity and multi-language AI.',
      features: [
        '2,000 Voice Minutes / mo',
        '5 Concurrent Patient Calls',
        'Dedicated AI Phone Number or Call Forwarding',
        'Multi-Language AI (English, Dutch, Spanish, etc.)',
        'Instant Call Recording & AI Transcripts',
        'WhatsApp Reminder Notifications',
        'Priority Phone Support'
      ]
    },
    {
      id: 'business',
      name: 'Multi-Location / Hospital',
      price: cycle === 'Monthly' ? 399 : 3990,
      badge: 'ENTERPRISE READY',
      desc: 'For multi-doctor centers and high call volume practices.',
      features: [
        '6,000 Voice Minutes / mo',
        '15 Concurrent Patient Calls',
        'Multiple Dedicated Lines & Forwarding Trunks',
        'Custom Doctor Voice Clone',
        'Online Payment Collection Integration',
        'Custom EHR / EMR Webhook Integrations',
        '24/7 Dedicated Account Manager'
      ]
    }
  ];

  const handleProceedToCheckout = () => {
    // Navigate to checkout with selected plan details
    router.push(`/onboarding/checkout?plan=${selectedPlan}&cycle=${cycle.toLowerCase()}`);
  };

  return (
    <div className="w-full max-w-5xl px-2 sm:px-4 py-2">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Select your subscription plan</h1>
        <p className="mt-2 text-xs sm:text-sm leading-relaxed text-gray-500 max-w-xl mx-auto">
          Choose the right plan to activate Sarah, your practice&apos;s AI receptionist. Transparent pricing with no hidden carrier surcharges.
        </p>
      </div>

      {/* Monthly / Yearly Toggle */}
      <div className="flex justify-center mb-8">
        <div className="bg-gray-100 p-1 rounded-xl inline-flex items-center gap-1 shadow-inner">
          <button 
            type="button"
            onClick={() => setCycle('Monthly')}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              cycle === 'Monthly' 
                ? 'bg-white shadow-xs text-gray-900' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Monthly Billing
          </button>
          <button 
            type="button"
            onClick={() => setCycle('Yearly')}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              cycle === 'Yearly' 
                ? 'bg-white shadow-xs text-gray-900' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>Annual Billing</span>
            <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
              Save 16%
            </span>
          </button>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {plans.map(plan => {
          const isSelected = selectedPlan === plan.id;
          return (
            <div 
              key={plan.id}
              onClick={() => setSelectedPlan(plan.id)}
              className={`border-2 rounded-2xl p-5 sm:p-6 cursor-pointer transition-all relative flex flex-col justify-between ${
                isSelected 
                  ? 'border-[#0066FF] bg-blue-50/20 shadow-md ring-2 ring-[#0066FF]/20 scale-[1.02]' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs'
              }`}
            >
              {plan.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0066FF] text-white text-[10px] font-extrabold px-3 py-0.5 rounded-full shadow-xs tracking-wider">
                  {plan.badge}
                </div>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-base font-bold text-gray-900">{plan.name}</h3>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${isSelected ? 'border-[#0066FF] bg-[#0066FF]' : 'border-gray-300'}`}>
                    {isSelected && (
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-500 mb-4 min-h-[32px]">{plan.desc}</p>

                <div className="mb-5 pb-5 border-b border-gray-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-gray-900">${plan.price}</span>
                    <span className="text-xs font-semibold text-gray-500">/{cycle === 'Monthly' ? 'month' : 'year'}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Billed {cycle.toLowerCase()}, cancel anytime.</p>
                </div>

                <p className="text-[11px] font-bold text-gray-900 uppercase tracking-wider mb-3">Included Capabilities:</p>
                <ul className="space-y-2.5">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start text-xs text-gray-700">
                      <svg className="w-4 h-4 text-[#10B981] mr-2 shrink-0 mt-0.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-6 pt-4">
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedPlan(plan.id); handleProceedToCheckout(); }}
                  className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs ${
                    isSelected
                      ? 'bg-[#0066FF] text-white hover:bg-[#0052cc]'
                      : 'bg-gray-50 text-gray-800 hover:bg-gray-100 border border-gray-200'
                  }`}
                >
                  {isSelected ? 'Continue with this Plan' : 'Select ' + plan.name}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Navigation */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between max-w-4xl mx-auto">
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/review')}
          className="px-5 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          Back to Review
        </button>
        <button 
          type="button" 
          onClick={handleProceedToCheckout}
          className="px-7 py-2.5 rounded-lg bg-[#0066FF] text-white text-sm font-bold hover:bg-[#0052cc] transition-colors shadow-md flex items-center gap-2"
        >
          <span>Proceed to Order Checkout</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6"></polyline>
          </svg>
        </button>
      </div>
    </div>
  );
}
