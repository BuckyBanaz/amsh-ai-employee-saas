"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BillingController, PlanItem } from '../../../controllers/billing.controller';
import { formatPrice, quotaLines } from '../../../utils/money';

type Cycle = 'Monthly' | 'Yearly';

function priceFor(plan: PlanItem, cycle: Cycle): number | null {
  return cycle === 'Monthly' ? plan.price_monthly : plan.price_yearly;
}

export default function PlansSelectionPage() {
  const router = useRouter();
  const [cycle, setCycle] = useState<Cycle>('Monthly');
  const [selectedPlan, setSelectedPlan] = useState<string>('');
  const [agentName, setAgentName] = useState('');
  // The same public catalog the server charges from (GET /api/plans), so the price shown is the price paid
  const [plans, setPlans] = useState<PlanItem[] | null>(null);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('onboarding_ai_receptionist');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.aiName) setAgentName(parsed.aiName);
      }
    } catch (e) {}
  }, []);

  useEffect(() => {
    BillingController.getPlans().then(({ items }) => {
      setPlans(items);
      setSelectedPlan((current) => current || (items.find((p) => p.highlighted) || items[0])?.key || '');
    });
  }, []);

  const offered = (plans || []).filter((p) => priceFor(p, cycle) !== null);
  const yearlySaving = Math.max(
    0,
    ...(plans || []).map((p) => (p.price_monthly && p.price_yearly ? 1 - p.price_yearly / (p.price_monthly * 12) : 0))
  );
  const canYearly = (plans || []).some((p) => p.price_yearly !== null);

  const handleProceedToCheckout = (planKey: string = selectedPlan) => {
    if (!planKey) return;
    router.push(`/onboarding/checkout?plan=${encodeURIComponent(planKey)}&cycle=${cycle.toLowerCase()}`);
  };

  return (
    <div className="w-full max-w-5xl px-2 sm:px-4 py-2">
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Select your subscription plan</h1>
        <p className="mt-2 text-xs sm:text-sm leading-relaxed text-gray-500 max-w-xl mx-auto">
          Choose the right plan to activate {agentName ? <>{agentName}, your practice&apos;s AI receptionist</> : <>your practice&apos;s AI receptionist</>}.
          Transparent pricing with no hidden carrier surcharges.
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
            disabled={!canYearly}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
              cycle === 'Yearly' 
                ? 'bg-white shadow-xs text-gray-900' 
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <span>Annual Billing</span>
            {yearlySaving >= 0.01 && (
              <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded">
                Save {Math.round(yearlySaving * 100)}%
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Plan Cards Grid */}
      {plans === null && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-96 rounded-2xl bg-gray-100 animate-pulse" />
          ))}
        </div>
      )}

      {plans !== null && offered.length === 0 && (
        <div role="alert" className="mb-8 rounded-xl border border-amber-200 bg-amber-50 p-5 text-center text-sm text-amber-800">
          No plans are available for {cycle.toLowerCase()} billing right now. {cycle === 'Yearly' ? 'Try monthly billing, or ' : ''}contact
          AMSh support to get started.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        {offered.map(plan => {
          const isSelected = selectedPlan === plan.key;
          const price = priceFor(plan, cycle) as number;
          const lines = [...quotaLines(plan.quotas), ...(plan.features || []).map((f) => f.label)];
          return (
            <div 
              key={plan.key}
              data-testid={`plan-${plan.key}`}
              onClick={() => setSelectedPlan(plan.key)}
              className={`border-2 rounded-2xl p-5 sm:p-6 cursor-pointer transition-all relative flex flex-col justify-between ${
                isSelected 
                  ? 'border-[#0066FF] bg-blue-50/20 shadow-md ring-2 ring-[#0066FF]/20 scale-[1.02]' 
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs'
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0066FF] text-white text-[10px] font-extrabold px-3 py-0.5 rounded-full shadow-xs tracking-wider">
                  MOST POPULAR
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

                <p className="text-xs text-gray-500 mb-4 min-h-[32px]">{plan.description}</p>

                <div className="mb-5 pb-5 border-b border-gray-100">
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-extrabold text-gray-900">{formatPrice(price, plan.currency)}</span>
                    <span className="text-xs font-semibold text-gray-500">/{cycle === 'Monthly' ? 'month' : 'year'}</span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1">Billed {cycle.toLowerCase()}, cancel anytime.</p>
                </div>

                <p className="text-[11px] font-bold text-gray-900 uppercase tracking-wider mb-3">Included Capabilities:</p>
                <ul className="space-y-2.5">
                  {lines.map((feature, idx) => (
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
                  onClick={(e) => { e.stopPropagation(); setSelectedPlan(plan.key); handleProceedToCheckout(plan.key); }}
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
          onClick={() => handleProceedToCheckout()}
          disabled={!offered.some((p) => p.key === selectedPlan)}
          className="px-7 py-2.5 rounded-lg bg-[#0066FF] text-white text-sm font-bold hover:bg-[#0052cc] disabled:opacity-50 transition-colors shadow-md flex items-center gap-2"
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
