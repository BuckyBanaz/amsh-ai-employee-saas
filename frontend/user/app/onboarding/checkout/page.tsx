"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CheckoutPage() {
  const router = useRouter();
  const [cycle, setCycle] = useState<'Monthly' | 'Yearly'>('Monthly');
  const [selectedPlan, setSelectedPlan] = useState<string>('plan-starter');

  const plans = [
    {
      id: 'plan-starter',
      name: 'Starter',
      price: cycle === 'Monthly' ? 99 : 990,
      features: ['500 Voice Minutes', '2 Concurrent Calls', 'Calendar Sync', 'Email Support']
    },
    {
      id: 'plan-professional',
      name: 'Professional',
      price: cycle === 'Monthly' ? 199 : 1990,
      features: ['2,000 Voice Minutes', '5 Concurrent Calls', 'Multi-Language AI', 'Call Recording', 'WhatsApp Channel']
    },
    {
      id: 'plan-business',
      name: 'Business',
      price: cycle === 'Monthly' ? 399 : 3990,
      features: ['6,000 Voice Minutes', '15 Concurrent Calls', 'Custom Voice Clone', 'API Access', 'Payments Integration']
    }
  ];

  return (
    <div className="w-full max-w-5xl">
      <div className="mb-10 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">Select your plan</h1>
        <p className="mt-4 text-[15px] leading-relaxed text-gray-500 max-w-2xl mx-auto">
          Choose the right plan to activate your AI receptionist. You can upgrade or downgrade at any time.
        </p>
      </div>

      <div className="flex justify-center mb-10">
        <div className="bg-gray-100 p-1 rounded-lg inline-flex">
          <button 
            onClick={() => setCycle('Monthly')}
            className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${cycle === 'Monthly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Monthly
          </button>
          <button 
            onClick={() => setCycle('Yearly')}
            className={`px-6 py-2 rounded-md text-sm font-semibold transition-all ${cycle === 'Yearly' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Yearly (Save 16%)
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {plans.map(plan => (
          <div 
            key={plan.id}
            onClick={() => setSelectedPlan(plan.id)}
            className={`border-2 rounded-2xl p-6 cursor-pointer transition-all relative ${
              selectedPlan === plan.id 
                ? 'border-[#0066FF] bg-[#F0F7FF]/30 shadow-md ring-1 ring-[#0066FF]/20' 
                : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
            }`}
          >
            {selectedPlan === plan.id && (
              <div className="absolute top-4 right-4 text-[#0066FF]">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12C22 17.5228 17.5228 22 12 22ZM11.0026 16L18.0737 8.92893L16.6595 7.51472L11.0026 13.1716L8.17421 10.3431L6.76 11.7574L11.0026 16Z"></path>
                </svg>
              </div>
            )}
            
            <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
            <div className="mt-4 mb-6">
              <span className="text-4xl font-extrabold text-gray-900">${plan.price}</span>
              <span className="text-sm font-medium text-gray-500">/{cycle === 'Monthly' ? 'mo' : 'yr'}</span>
            </div>
            
            <ul className="space-y-3 mb-8">
              {plan.features.map((feature, idx) => (
                <li key={idx} className="flex items-start">
                  <svg className="w-5 h-5 text-[#10B981] mr-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                  </svg>
                  <span className="text-sm text-gray-600">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="pt-6 border-t border-gray-100 flex items-center justify-between max-w-3xl mx-auto">
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/review')}
          className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          Back to Review
        </button>
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/success')}
          className="px-8 py-2.5 rounded-lg bg-[#0066FF] text-white font-medium hover:bg-[#0052cc] transition-colors shadow-sm"
        >
          Pay & Activate AI
        </button>
      </div>
    </div>
  );
}
