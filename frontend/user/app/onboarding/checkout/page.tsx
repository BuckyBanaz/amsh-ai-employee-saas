"use client";

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StorageService } from '../../../services/storage.service';
import { BillingController, PlanItem } from '../../../controllers/billing.controller';
import { formatPrice } from '../../../utils/money';

declare global {
  interface Window {
    Razorpay: any;
  }
}

// useSearchParams() must sit under a Suspense boundary or the production build cannot prerender this page.
export default function CheckoutOrderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-sm text-gray-500">Loading checkout...</div>}>
      <CheckoutOrderContent />
    </Suspense>
  );
}

function CheckoutOrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const planParam = searchParams.get('plan') || 'professional';
  const cycleParam = searchParams.get('cycle') || 'monthly';

  // Currency & Business Detection
  const [businessCountry, setBusinessCountry] = useState('India');
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('onboarding_business_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.country) setBusinessCountry(parsed.country);
        if (parsed.businessName || parsed.name) setBusinessName(parsed.businessName || parsed.name);
        if (parsed.email) setBusinessEmail(parsed.email);
        if (parsed.phone || parsed.business_phone) setBusinessPhone(parsed.phone || parsed.business_phone);
      }
    } catch (e) {}
  }, []);

  const isIndia = businessCountry.toLowerCase().includes('india');
  const isYearly = cycleParam === 'yearly';

  // The plan as the server will charge it (GET /api/plans/{key}): same price and currency create-order uses
  const [plan, setPlan] = useState<PlanItem | null>(null);
  const [planError, setPlanError] = useState('');
  useEffect(() => {
    BillingController.getPlan(planParam)
      .then(setPlan)
      .catch(() => setPlanError('This plan is not available. Go back and choose another plan.'));
  }, [planParam]);

  const planPrice = plan ? (isYearly ? plan.price_yearly : plan.price_monthly) : null;
  const priceText = plan && planPrice !== null ? formatPrice(planPrice, plan.currency) : '…';
  const planInfo = {
    name: plan?.name || 'Selected plan',
    minutes: plan?.quotas?.voice_minutes ? `${plan.quotas.voice_minutes.toLocaleString()} voice minutes / month` : 'your plan allowance',
  };
  const unavailable = Boolean(planError) || (plan !== null && planPrice === null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [razorpayKeyId, setRazorpayKeyId] = useState<string>('rzp_test_placeholder');
  const [checkoutError, setCheckoutError] = useState<string>('');

  // Load Razorpay Script dynamically and fetch gateway config
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    BillingController.getConfig()
      .then(data => {
        if (data.key_id) setRazorpayKeyId(data.key_id);
      })
      .catch(e => console.warn('Could not fetch billing config:', e));

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleRazorpayPayment = async () => {
    setIsProcessing(true);
    setCheckoutError('');

    const businessId = StorageService.getBusinessId();

    const activate = async (orderId: string, paymentId: string, signature: string) => {
      // The server checks the order with Razorpay (or accepts it in its own test mode) before switching the plan on
      await BillingController.verifyPayment({
        razorpay_order_id: orderId,
        razorpay_payment_id: paymentId,
        razorpay_signature: signature,
        plan_id: planParam,
        business_id: businessId,
      });
      StorageService.setOnboardingCompleted(true);
      router.push('/onboarding/success');
    };

    try {
      // 1. Create the order; the server prices it from the plan catalog
      const orderData = await BillingController.createOrder({
        plan_id: planParam,
        cycle: cycleParam,
        business_id: businessId
      });

      // 2. Server without payment keys (development): nothing is charged, the order is confirmed in test mode
      if (orderData.test_mode) {
        await activate(orderData.order_id, `pay_test_${Date.now()}`, 'test_mode');
        return;
      }

      const activeKey = orderData.key_id || razorpayKeyId;
      if (!window.Razorpay || !activeKey || activeKey === 'rzp_test_placeholder') {
        throw new Error('The payment window could not load. Check your connection and try again.');
      }

      // 3. Live: open Razorpay Checkout
      const rzp = new window.Razorpay({
        key: activeKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: 'AMSh AI SaaS',
        description: `${planInfo.name} Subscription (${isYearly ? 'Annual' : 'Monthly'})`,
        order_id: orderData.order_id,
        prefill: {
          name: businessName || '',
          email: businessEmail || '',
          contact: businessPhone || ''
        },
        theme: {
          color: '#0066FF'
        },
        handler: async function (response: any) {
          try {
            await activate(response.razorpay_order_id, response.razorpay_payment_id, response.razorpay_signature);
          } catch (vErr: any) {
            console.error('Payment verification failed:', vErr);
            setCheckoutError(vErr.message || 'Payment signature verification failed.');
            setIsProcessing(false);
          }
        },
        modal: {
          ondismiss: function () {
            setIsProcessing(false);
          }
        }
      });
      rzp.open();
    } catch (err: any) {
      // Never pretend it worked: the plan is only active once the server has confirmed the payment
      console.warn('Checkout failed:', err);
      setCheckoutError(err?.message || 'Could not start the payment. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="w-full max-w-4xl px-2 sm:px-4 py-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Review order &amp; activate</h1>
        <p className="mt-1 text-xs sm:text-sm text-gray-500">
          Complete your subscription checkout via Razorpay to deploy your practice&apos;s AI receptionist and live phone routing.
        </p>
      </div>

      {(checkoutError || planError) && (
        <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-medium rounded-lg flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>{checkoutError || planError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-6">
        
        {/* Left Column: Razorpay Checkout Box (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
              Payment Method: Razorpay
            </h2>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
              UPI • Cards • NetBanking
            </span>
          </div>

          {/* Payment Providers Display */}
          <div className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
            <p className="text-xs font-semibold text-gray-700">Supported Instant Payment Methods:</p>
            <div className="flex flex-wrap gap-2 text-[11px] font-bold">
              <span className="bg-white px-2.5 py-1 rounded-md border border-gray-200 text-purple-700 flex items-center gap-1 shadow-2xs">
                <span>⚡ UPI (GPay / PhonePe / Paytm)</span>
              </span>
              <span className="bg-white px-2.5 py-1 rounded-md border border-gray-200 text-blue-700 flex items-center gap-1 shadow-2xs">
                <span>💳 Credit / Debit Cards</span>
              </span>
              <span className="bg-white px-2.5 py-1 rounded-md border border-gray-200 text-emerald-700 flex items-center gap-1 shadow-2xs">
                <span>🏦 NetBanking</span>
              </span>
            </div>
          </div>

          {/* Business Billing Profile */}
          <div className="space-y-3 pt-1">
            <div>
              <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Billing Business Name</label>
              <input 
                type="text" 
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Billing Email</label>
                <input 
                  type="email" 
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Billing Phone</label>
                <input 
                  type="tel" 
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] font-mono"
                />
              </div>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="pt-2 flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-100">
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span>Razorpay 256-bit PCI-DSS Secured</span>
            </div>
            <div className="flex items-center gap-1.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <span>Instant Activation</span>
            </div>
          </div>

          {/* Checkout Button */}
          <button 
            type="button" 
            onClick={handleRazorpayPayment}
            disabled={isProcessing || !plan || unavailable}
            className="w-full py-3 rounded-xl bg-[#0066FF] text-white font-bold text-sm hover:bg-[#0052cc] transition-all shadow-md mt-4 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
          >
            {isProcessing ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Opening Razorpay Gateway...</span>
              </>
            ) : (
              `Pay ${priceText} & Deploy AI Receptionist`
            )}
          </button>
        </div>

        {/* Right Column: Order Summary (5 cols) */}
        <div className="lg:col-span-5 bg-gray-50/80 rounded-xl border border-gray-200 p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <h3 className="text-xs font-bold text-gray-900 uppercase tracking-wider">Order Summary</h3>
            <button 
              type="button" 
              onClick={() => router.push('/onboarding/plans')}
              className="text-xs font-semibold text-[#0066FF] hover:underline"
            >
              Change Plan
            </button>
          </div>

          {/* Line Items */}
          <div className="space-y-3 text-xs">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-bold text-gray-900">{planInfo.name}</p>
                <p className="text-[11px] text-gray-500">Includes {planInfo.minutes}</p>
              </div>
              <span className="font-bold text-gray-900">{priceText}</span>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-800">
                  {isIndia ? 'Exotel Indian Voice Line (+91)' : 'Twilio Dedicated AI Line'}
                </p>
                <p className="text-[11px] text-emerald-600 font-medium">Included with Subscription</p>
              </div>
              <span className="font-semibold text-emerald-600">FREE</span>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-800">Voice AI Model Setup &amp; Training</p>
                <p className="text-[11px] text-gray-500">Clinic knowledge base indexing</p>
              </div>
              <span className="font-semibold text-emerald-600">FREE</span>
            </div>

            <div className="pt-3 border-t border-gray-200 flex justify-between items-baseline">
              <div>
                <p className="text-sm font-bold text-gray-900">Total Due Today</p>
                <p className="text-[11px] text-gray-500">Billed {isYearly ? 'yearly' : 'monthly'}</p>
              </div>
              <span data-testid="checkout-total" className="text-xl sm:text-2xl font-black text-[#0066FF]">{priceText}</span>
            </div>
          </div>

          {/* Clinic Guarantee Card */}
          <div className="bg-white p-3 rounded-lg border border-gray-200 text-xs text-gray-600 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-gray-900 text-[11px]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
              </svg>
              <span>14-Day Practice Guarantee</span>
            </div>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Test your AI receptionist with real calls. If not 100% satisfied with call quality, receive an instant full refund.
            </p>
          </div>
        </div>

      </div>

      {/* Footer Navigation */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/plans')}
          className="px-5 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
        >
          Back to Plans
        </button>
      </div>
    </div>
  );
}
