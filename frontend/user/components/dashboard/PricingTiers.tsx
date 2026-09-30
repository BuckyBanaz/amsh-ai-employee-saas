"use client";
import React, { useState, useEffect } from 'react';
import { ShimmerBlock } from '../common/ShimmerSkeleton';
import { PlanItem, BillingController } from '../../controllers/billing.controller';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface PricingTiersProps {
  currentPlanKey?: string;
  currency?: string;
  onPlanChange?: (planKey: string, cycle: 'monthly' | 'yearly') => Promise<void>;
  isLoading?: boolean;
  plansCatalog?: PlanItem[];
  businessId?: string;
  businessName?: string;
  businessEmail?: string;
  businessPhone?: string;
  onPaymentSuccess?: (message: string) => void;
}

interface PlanDisplayData {
  key: string;
  name: string;
  description: string;
  price_monthly: number;
  price_yearly: number;
  highlighted: boolean;
  quotas: {
    minutes: number | string;
    messages: number | string;
    audio_storage: string;
    vector_storage: string;
    history: string;
    concurrent_calls: number | string;
  };
  features: { key: string; label: string }[];
  overageText: string;
}

export function PricingTiers({
  currentPlanKey = 'professional',
  currency = 'USD',
  onPlanChange,
  isLoading = false,
  plansCatalog = [],
  businessId,
  businessName = 'Valued Business',
  businessEmail = '',
  businessPhone = '',
  onPaymentSuccess
}: PricingTiersProps) {
  const [cycle, setCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [confirmPlan, setConfirmPlan] = useState<{
    key: string;
    name: string;
    price: number;
    currentPrice: number;
    difference: number;
    isUpgrade: boolean;
  } | null>(null);

  const currencySymbol = '$';

  // Load Razorpay Checkout SDK dynamically on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !window.Razorpay) {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Default plans matching Admin Plan Catalog
  const defaultPlans: PlanDisplayData[] = [
    {
      key: 'starter',
      name: 'Starter',
      description: 'For a single small practice getting started.',
      price_monthly: 99,
      price_yearly: 990,
      highlighted: false,
      quotas: {
        minutes: '500',
        messages: '1,000',
        audio_storage: '5 GB',
        vector_storage: '1 GB',
        history: '30 days',
        concurrent_calls: '2'
      },
      features: [
        { key: 'calendar_sync', label: 'Calendar Sync' },
      ],
      overageText: 'Overage $0.22/min · $0.02/msg · $0.5/GB'
    },
    {
      key: 'professional',
      name: 'Professional',
      description: 'For busy clinics with calls and WhatsApp every day.',
      price_monthly: 199,
      price_yearly: 1990,
      highlighted: true,
      quotas: {
        minutes: '2,000',
        messages: '5,000',
        audio_storage: '25 GB',
        vector_storage: '5 GB',
        history: '90 days',
        concurrent_calls: '5'
      },
      features: [
        { key: 'call_recording', label: 'Call Recording' },
        { key: 'multi_language', label: 'Multi-language AI' },
        { key: 'calendar_sync', label: 'Calendar Sync' },
        { key: 'whatsapp', label: 'WhatsApp Channel' },
        { key: 'advanced_analytics', label: 'Advanced Analytics' },
      ],
      overageText: 'Overage $0.18/min · $0.015/msg · $0.4/GB'
    },
    {
      key: 'business',
      name: 'Business',
      description: 'For multi-doctor clinics and high patient call volumes.',
      price_monthly: 399,
      price_yearly: 3990,
      highlighted: false,
      quotas: {
        minutes: '6,000',
        messages: '20,000',
        audio_storage: '100 GB',
        vector_storage: '20 GB',
        history: '180 days',
        concurrent_calls: '15'
      },
      features: [
        { key: 'call_recording', label: 'Call Recording' },
        { key: 'multi_language', label: 'Multi-language AI' },
        { key: 'custom_voice', label: 'Custom Voice Clone' },
        { key: 'api_access', label: 'API Access' },
        { key: 'advanced_analytics', label: 'Advanced Analytics' },
        { key: 'calendar_sync', label: 'Calendar Sync' },
        { key: 'payments_integration', label: 'Payments' },
        { key: 'whatsapp', label: 'WhatsApp Channel' },
        { key: 'priority_support', label: 'Priority Support' },
      ],
      overageText: 'Overage $0.15/min · $0.012/msg · $0.3/GB'
    }
  ];

  // Merge live backend plans if available, populating quotas & overage from API
  const displayPlans: PlanDisplayData[] = plansCatalog.length > 0
    ? plansCatalog.map((p) => {
        const fallback = defaultPlans.find((d) => d.key.toLowerCase() === p.key.toLowerCase()) || defaultPlans[0];
        const q = p.quotas || {};
        const ov = p.overage || {};

        return {
          key: p.key,
          name: p.name || fallback.name,
          description: p.description || fallback.description,
          price_monthly: p.price_monthly ?? fallback.price_monthly,
          price_yearly: p.price_yearly ?? fallback.price_yearly,
          highlighted: p.highlighted ?? fallback.highlighted,
          quotas: {
            minutes: q.voice_minutes !== undefined && q.voice_minutes !== null ? Number(q.voice_minutes).toLocaleString() : fallback.quotas.minutes,
            messages: q.messages !== undefined && q.messages !== null ? Number(q.messages).toLocaleString() : fallback.quotas.messages,
            audio_storage: q.audio_storage_gb !== undefined && q.audio_storage_gb !== null ? `${q.audio_storage_gb} GB` : fallback.quotas.audio_storage,
            vector_storage: q.vector_storage_gb !== undefined && q.vector_storage_gb !== null ? `${q.vector_storage_gb} GB` : fallback.quotas.vector_storage,
            history: q.conversation_retention_days !== undefined && q.conversation_retention_days !== null ? `${q.conversation_retention_days} days` : fallback.quotas.history,
            concurrent_calls: q.concurrent_calls !== undefined && q.concurrent_calls !== null ? Number(q.concurrent_calls).toLocaleString() : fallback.quotas.concurrent_calls,
          },
          features: p.features && p.features.length > 0 ? p.features : fallback.features,
          overageText: ov.per_minute !== undefined
            ? `Overage $${ov.per_minute}/min · $${ov.per_message}/msg · $${ov.per_gb}/GB`
            : fallback.overageText
        };
      })
    : defaultPlans;

  // Find currently active plan data
  const activePlanData = displayPlans.find(
    (p) => p.key.toLowerCase() === currentPlanKey.toLowerCase()
  ) || displayPlans[0];

  const currentPlanPrice = cycle === 'yearly' ? activePlanData.price_yearly : activePlanData.price_monthly;

  const handleOpenSwitchModal = (targetPlan: PlanDisplayData) => {
    if (targetPlan.key.toLowerCase() === currentPlanKey.toLowerCase()) return;
    setPaymentError(null);

    const targetPrice = cycle === 'yearly' ? targetPlan.price_yearly : targetPlan.price_monthly;
    const diff = Math.max(0, targetPrice - currentPlanPrice);
    const isUpgrade = targetPrice > currentPlanPrice;

    setConfirmPlan({
      key: targetPlan.key,
      name: targetPlan.name,
      price: targetPrice,
      currentPrice: currentPlanPrice,
      difference: diff,
      isUpgrade
    });
  };

  const handleExecutePayment = async () => {
    if (!confirmPlan) return;
    setProcessingPlan(confirmPlan.key);
    setPaymentError(null);

    try {
      // 1. If downgrade or same price, execute direct change without payment
      if (!confirmPlan.isUpgrade || confirmPlan.difference <= 0) {
        if (onPlanChange) {
          await onPlanChange(confirmPlan.key, cycle);
        }
        if (onPaymentSuccess) {
          onPaymentSuccess(`Plan updated to ${confirmPlan.name}. Changes will take effect.`);
        }
        setConfirmPlan(null);
        setProcessingPlan(null);
        return;
      }

      // 2. Create order with backend via BillingController (with proration difference)
      const orderRes = await BillingController.createOrder({
        amount: confirmPlan.difference,
        currency: 'USD',
        plan_id: confirmPlan.key,
        cycle,
        business_id: businessId || null
      });

      const activeKey = orderRes.key_id;

      // 3. Open Razorpay Checkout modal if SDK is available
      if (typeof window !== 'undefined' && window.Razorpay && activeKey && activeKey !== 'rzp_test_placeholder') {
        const options = {
          key: activeKey,
          amount: orderRes.amount,
          currency: orderRes.currency,
          name: 'AMSh AI Receptionist',
          description: `Upgrade to ${confirmPlan.name} (Prorated Difference)`,
          order_id: orderRes.order_id,
          prefill: {
            name: businessName,
            email: businessEmail || 'billing@example.com',
            contact: businessPhone || ''
          },
          theme: {
            color: '#0066FF'
          },
          handler: async function (response: any) {
            try {
              // Verify cryptographic HMAC SHA-256 signature
              await BillingController.verifyPayment({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan_id: confirmPlan.key,
                business_id: businessId || null
              });

              setConfirmPlan(null);
              setProcessingPlan(null);
              if (onPaymentSuccess) {
                onPaymentSuccess(`Payment successful! Your practice is now upgraded to ${confirmPlan.name}.`);
              }
            } catch (vErr: any) {
              console.error('Signature verification error:', vErr);
              setPaymentError(vErr.message || 'Payment verification failed. Please contact support.');
              setProcessingPlan(null);
            }
          },
          modal: {
            ondismiss: function () {
              setProcessingPlan(null);
            }
          }
        };

        const rzp = new window.Razorpay(options);
        rzp.open();
        return;
      }

      // Fallback: If in dev mode without live keys, perform direct plan change
      if (onPlanChange) {
        await onPlanChange(confirmPlan.key, cycle);
      }
      if (onPaymentSuccess) {
        onPaymentSuccess(`Plan upgraded to ${confirmPlan.name}! (Dev Test Mode)`);
      }
      setConfirmPlan(null);
    } catch (err: any) {
      console.error('Order creation/payment error:', err);
      setPaymentError(err.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setProcessingPlan(null);
    }
  };

  if (isLoading) {
    return (
      <div className="mb-6 space-y-4">
        <div className="flex justify-between items-center">
          <ShimmerBlock className="h-6 w-48 rounded" />
          <ShimmerBlock className="h-9 w-48 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((idx) => (
            <div key={idx} className="bg-white rounded-xl p-5 border border-gray-100 space-y-4">
              <ShimmerBlock className="h-4 w-28 rounded" />
              <ShimmerBlock className="h-8 w-36 rounded" />
              <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                {[1, 2, 3, 4, 5, 6].map((q) => (
                  <ShimmerBlock key={q} className="h-3 w-full rounded" />
                ))}
              </div>
              <ShimmerBlock className="h-9 w-full rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div id="pricing-tiers-section" className="mb-6">
      {/* Header and Billing Cycle Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-bold text-gray-900 tracking-tight">
            Subscription Plans & Upgrades
          </h3>
          <p className="text-xs text-gray-500">
            Select the plan that fits your patient call volume. Switch or cancel anytime.
          </p>
        </div>

        {/* Monthly / Yearly Toggle */}
        <div className="bg-gray-100/80 p-1 rounded-xl inline-flex items-center gap-1 self-start sm:self-auto border border-gray-200/60">
          <button
            type="button"
            onClick={() => setCycle('monthly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              cycle === 'monthly'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Monthly
          </button>
          <button
            type="button"
            onClick={() => setCycle('yearly')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              cycle === 'yearly'
                ? 'bg-white text-gray-900 shadow-2xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            Annual
          </button>
        </div>
      </div>

      {/* Grid of Plans */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {displayPlans.map((plan) => {
          const isCurrent = plan.key.toLowerCase() === currentPlanKey.toLowerCase();
          const price = cycle === 'yearly' ? plan.price_yearly : plan.price_monthly;
          const isHighlighted = plan.highlighted && !isCurrent;

          return (
            <div
              key={plan.key}
              className={`bg-white rounded-xl p-5 flex flex-col justify-between transition-all relative ${
                isCurrent
                  ? 'border-2 border-[#0066FF] shadow-[0_4px_16px_rgba(0,102,255,0.08)] bg-blue-50/10'
                  : isHighlighted
                  ? 'border-2 border-indigo-200 shadow-sm hover:shadow-md'
                  : 'border border-gray-200/80 hover:border-gray-300 hover:shadow-xs'
              }`}
            >
              {/* Badges */}
              <div className="absolute top-4 right-4 flex flex-col items-end gap-1">
                {isCurrent && (
                  <span className="text-[10px] font-black uppercase tracking-wider bg-[#0066FF] text-white px-2.5 py-0.5 rounded-full shadow-2xs">
                    ACTIVE PLAN
                  </span>
                )}
                {!isCurrent && plan.highlighted && (
                  <span className="text-[10px] font-extrabold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                    POPULAR
                  </span>
                )}
              </div>

              <div>
                <h4 className="text-base font-bold text-gray-900 tracking-tight mb-0.5 pr-24">
                  {plan.name}
                </h4>
                <p className="text-xs text-gray-500 min-h-[30px] line-clamp-2 mb-3">
                  {plan.description}
                </p>

                <div className="flex items-baseline gap-1 mb-3.5 pb-2.5 border-b border-gray-100">
                  <span className="text-2xl font-black text-gray-900 tracking-tight">
                    {currencySymbol}{price.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold text-gray-500">
                    /{cycle === 'yearly' ? 'year' : 'month'}
                  </span>
                </div>

                {/* Quotas Breakdown (Admin Aligned) */}
                <div className="bg-[#F8FAFC] border border-slate-100 rounded-lg p-3 space-y-1.5 mb-3.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Minutes</span>
                    <span className="font-bold text-slate-900 font-mono">{plan.quotas.minutes}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Messages</span>
                    <span className="font-bold text-slate-900 font-mono">{plan.quotas.messages}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Audio storage</span>
                    <span className="font-bold text-slate-900 font-mono">{plan.quotas.audio_storage}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Vector storage</span>
                    <span className="font-bold text-slate-900 font-mono">{plan.quotas.vector_storage}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Conversation history</span>
                    <span className="font-bold text-slate-900 font-mono">{plan.quotas.history}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Concurrent calls</span>
                    <span className="font-bold text-slate-900 font-mono">{plan.quotas.concurrent_calls}</span>
                  </div>
                </div>

                {/* Feature Badges (Pills) */}
                <div className="mb-3">
                  <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                    Included Features
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {plan.features.map((feature, fIdx) => (
                      <span
                        key={fIdx}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EFF6FF] text-[#2563EB] text-[11px] font-semibold border border-blue-100"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        {feature.label}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Overage Line */}
                <div className="text-[10px] text-gray-500 font-medium mb-4 pb-2 border-b border-gray-100">
                  {plan.overageText}
                </div>
              </div>

              {/* Action Button */}
              <div className="pt-2">
                {isCurrent ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-2 bg-gray-100 text-gray-500 rounded-lg text-xs font-bold cursor-default flex items-center justify-center gap-1.5 border border-gray-200"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    Currently Subscribed
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleOpenSwitchModal(plan)}
                    disabled={processingPlan !== null}
                    className={`w-full py-2 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                      isHighlighted
                        ? 'bg-[#0066FF] hover:bg-[#0052cc] text-white active:scale-[0.99]'
                        : 'bg-white hover:bg-gray-50 text-gray-800 border border-gray-300 active:scale-[0.99]'
                    }`}
                  >
                    {processingPlan === plan.key ? (
                      <span className="inline-flex items-center gap-1.5 justify-center">
                        <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                        Connecting Razorpay...
                      </span>
                    ) : (
                      `Switch to ${plan.name}`
                    )}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Enhanced Upgrade & Proration Breakdown Modal with Razorpay Checkout */}
      {confirmPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0 border border-blue-100">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                </svg>
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight">
                  {confirmPlan.isUpgrade ? 'Subscription Upgrade & Proration' : 'Switch Subscription Plan'}
                </h3>
                <p className="text-xs text-gray-500">
                  Review your billing adjustment before proceeding to secure payment.
                </p>
              </div>
            </div>

            {paymentError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-red-500 shrink-0">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{paymentError}</span>
              </div>
            )}

            {/* Transparent Calculation Breakdown Table */}
            <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-200/80 text-xs space-y-2.5">
              <div className="flex justify-between items-center text-slate-600">
                <span>Selected New Plan ({confirmPlan.name}):</span>
                <span className="font-semibold text-slate-900 font-mono">
                  {currencySymbol}{confirmPlan.price.toLocaleString()} / {cycle === 'yearly' ? 'year' : 'month'}
                </span>
              </div>

              <div className="flex justify-between items-center text-slate-600">
                <span>Current Plan Credit ({activePlanData.name}):</span>
                <span className="font-semibold text-emerald-600 font-mono">
                  -{currencySymbol}{confirmPlan.currentPrice.toLocaleString()} / {cycle === 'yearly' ? 'year' : 'month'}
                </span>
              </div>

              <div className="border-t border-slate-200 pt-2.5 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 text-sm">Due Today (Upgrade Difference):</span>
                  <p className="text-[11px] text-slate-500 font-normal">Prorated adjustment for immediate upgrade</p>
                </div>
                <span className="font-black text-xl text-[#0066FF] font-mono">
                  {currencySymbol}{confirmPlan.difference.toLocaleString()}
                </span>
              </div>

              <div className="border-t border-slate-200/60 pt-2 text-[11px] text-slate-600 flex items-center justify-between">
                <span>Next Billing Cycle Rate:</span>
                <span className="font-bold text-slate-800">
                  {currencySymbol}{confirmPlan.price.toLocaleString()} / {cycle === 'yearly' ? 'year' : 'month'}
                </span>
              </div>
            </div>

            {/* Explanation Note */}
            <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-[11px] text-blue-900 space-y-1">
              <div className="font-bold flex items-center gap-1.5 text-blue-800">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
                How your payment works:
              </div>
              <p className="text-blue-700 leading-relaxed">
                Aapko aaj sirf upgrade difference (<strong>{currencySymbol}{confirmPlan.difference.toLocaleString()}</strong>) pay karna hoga. Naye plan ke sarre minutes aur features turant live ho jayenge, aur next cycle se normal monthly rate ({currencySymbol}{confirmPlan.price.toLocaleString()}) shuru hoga.
              </p>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-2">
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span>Secured by Razorpay (256-Bit SSL)</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setConfirmPlan(null);
                    setPaymentError(null);
                  }}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={handleExecutePayment}
                  disabled={processingPlan !== null}
                  className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  {processingPlan ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Opening Razorpay...
                    </>
                  ) : (
                    <>
                      <span>Pay {currencySymbol}{confirmPlan.difference.toLocaleString()} with Razorpay</span>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
