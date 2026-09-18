"use client";

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function CheckoutOrderPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const planParam = searchParams.get('plan') || 'professional';
  const cycleParam = searchParams.get('cycle') || 'monthly';

  const planInfo = {
    starter: { name: 'Starter Practice', priceMonthly: 99, priceYearly: 990, minutes: '500 Mins' },
    professional: { name: 'Professional Clinic', priceMonthly: 199, priceYearly: 1990, minutes: '2,000 Mins' },
    business: { name: 'Multi-Location / Hospital', priceMonthly: 399, priceYearly: 3990, minutes: '6,000 Mins' },
  }[planParam] || { name: 'Professional Clinic', priceMonthly: 199, priceYearly: 1990, minutes: '2,000 Mins' };

  const isYearly = cycleParam === 'yearly';
  const planPrice = isYearly ? planInfo.priceYearly : planInfo.priceMonthly;
  const telephonyLineFee = 0.00; // Included
  const setupFee = 0.00; // Free onboarding
  const totalAmount = planPrice;

  // Payment Form States
  const [cardName, setCardName] = useState('Dr. Sarah Wilson');
  const [cardNumber, setCardNumber] = useState('4242 •••• •••• 4242');
  const [cardExp, setCardExp] = useState('12/28');
  const [cardCvc, setCardCvc] = useState('•••');
  const [postalCode, setPostalCode] = useState('1012 AB');
  const [isProcessing, setIsProcessing] = useState(false);

  const handlePayAndActivate = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    // Simulate instantaneous payment processing
    setTimeout(() => {
      setIsProcessing(false);
      router.push('/onboarding/success');
    }, 1200);
  };

  return (
    <div className="w-full max-w-4xl px-2 sm:px-4 py-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Review order &amp; activate</h1>
        <p className="mt-1 text-xs sm:text-sm text-gray-500">
          Complete your subscription checkout to deploy your practice&apos;s AI receptionist and live phone routing.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start mb-6">
        
        {/* Left Column: Payment Details (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-xl border border-gray-200 p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
            <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                <line x1="1" y1="10" x2="23" y2="10"></line>
              </svg>
              Payment Information
            </h2>
            <span className="text-[11px] font-semibold text-gray-400">Guaranteed Safe &amp; Encrypted</span>
          </div>

          <form onSubmit={handlePayAndActivate} className="space-y-4">
            <div>
              <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Cardholder Name</label>
              <input 
                type="text" 
                value={cardName}
                onChange={(e) => setCardName(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF]"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Card Number</label>
              <div className="relative">
                <input 
                  type="text" 
                  value={cardNumber}
                  onChange={(e) => setCardNumber(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] font-mono"
                  required
                />
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                  <span className="text-[10px] font-extrabold text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded">VISA</span>
                  <span className="text-[10px] font-extrabold text-red-700 bg-red-50 px-1.5 py-0.5 rounded">MC</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Expiry</label>
                <input 
                  type="text" 
                  value={cardExp}
                  onChange={(e) => setCardExp(e.target.value)}
                  placeholder="MM/YY"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-center font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1 block">CVC</label>
                <input 
                  type="text" 
                  value={cardCvc}
                  onChange={(e) => setCardCvc(e.target.value)}
                  placeholder="CVC"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-center font-mono"
                  required
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Postal Code</label>
                <input 
                  type="text" 
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-center"
                  required
                />
              </div>
            </div>

            {/* Trust Badges */}
            <div className="pt-3 flex items-center justify-between text-[11px] text-gray-500 border-t border-gray-100">
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <span>256-bit SSL Bank Encryption</span>
              </div>
              <div className="flex items-center gap-1.5">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                <span>Cancel Anytime</span>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isProcessing}
              className="w-full py-3 rounded-xl bg-[#0066FF] text-white font-bold text-sm hover:bg-[#0052cc] transition-all shadow-md mt-4 disabled:opacity-60 flex items-center justify-center gap-2 cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Activating AI Receptionist...</span>
                </>
              ) : (
                `Pay $${totalAmount}.00 & Activate AI Receptionist`
              )}
            </button>
          </form>
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
                <p className="text-[11px] text-gray-500">Includes {planInfo.minutes} voice minutes</p>
              </div>
              <span className="font-bold text-gray-900">${planPrice}.00</span>
            </div>

            <div className="flex justify-between items-start">
              <div>
                <p className="font-medium text-gray-800">Dedicated AI Telephony Line</p>
                <p className="text-[11px] text-emerald-600 font-medium">Twilio Carrier Trunk (+1 555-019-2834)</p>
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
              <span className="text-xl sm:text-2xl font-black text-[#0066FF]">${totalAmount}.00</span>
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
              Test Sarah with real patient calls. If you are not satisfied with call resolution quality, receive a full instant refund.
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
