"use client";

import React, { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { StorageService } from '../../../services/storage.service';
import { BillingController, PlanItem } from '../../../controllers/billing.controller';
import { DashboardController } from '../../../controllers/dashboard.controller';
import { formatPrice, quotaLines } from '../../../utils/money';
import { CHECKOUT_COUNTRIES, OTHER_COUNTRY, countryByCode, detectCountry } from '../../../utils/paymentMethods';
import { PaymentMethodLogo } from '../../../components/billing/PaymentMethodLogo';
import { siRazorpay } from 'simple-icons';

const FIELD =
  'w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-[#0066FF]';

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
  // Which country's payment methods to show: the clinic's own country from onboarding, else where the browser is
  const [country, setCountry] = useState(OTHER_COUNTRY);
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');

  useEffect(() => {
    let saved: string | null = null;
    try {
      const stored = localStorage.getItem('onboarding_business_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        saved = parsed.country || null;
        if (parsed.businessName || parsed.name) setBusinessName(parsed.businessName || parsed.name);
        if (parsed.email) setBusinessEmail(parsed.email);
        if (parsed.phone || parsed.business_phone) setBusinessPhone(parsed.phone || parsed.business_phone);
      }
    } catch {}
    // In the browser only (the server does not know the visitor's time zone). The clinic's saved country wins over a guess.
    setCountry(detectCountry(saved));
    if (!saved && StorageService.getBusinessId()) {
      DashboardController.getBusinessInfo()
        .then((biz) => {
          if (biz?.country) setCountry(detectCountry(biz.country));
          if (biz?.name) setBusinessName((current) => current || biz.name);
        })
        .catch(() => {});
    }
  }, []);

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

  const lines = plan ? quotaLines(plan.quotas).slice(0, 4) : [];
  const methods = country.methods;

  return (
    <div className="w-full max-w-5xl px-2 sm:px-4 py-2">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Checkout</h1>
        <p className="mt-1 text-sm text-slate-500">
          Activate {planInfo.name}{businessName ? ` for ${businessName}` : ''}. Your AI receptionist goes live as soon as the payment is confirmed.
        </p>
      </div>

      {(checkoutError || planError) && (
        <div role="alert" className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-px shrink-0" aria-hidden="true"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
          <span>{checkoutError || planError}</span>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-7">
          {/* Billing details */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <h2 className="text-sm font-semibold text-slate-900">Billing details</h2>
            <p className="mt-0.5 text-xs text-slate-500">Shown on your invoice and sent to the payment provider.</p>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-slate-700">Business name</span>
                <input type="text" value={businessName} onChange={(e) => setBusinessName(e.target.value)} autoComplete="organization" className={FIELD} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-700">Billing email</span>
                <input type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} autoComplete="email" className={FIELD} />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-medium text-slate-700">Phone</span>
                <input type="tel" value={businessPhone} onChange={(e) => setBusinessPhone(e.target.value)} autoComplete="tel" className={FIELD} />
              </label>
              <label className="block sm:col-span-2">
                <span className="mb-1 block text-xs font-medium text-slate-700">Billing country</span>
                <select
                  value={country.code}
                  onChange={(e) => setCountry(countryByCode(e.target.value))}
                  autoComplete="country"
                  data-testid="checkout-country"
                  className={`${FIELD} appearance-none bg-white`}
                >
                  {CHECKOUT_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                  ))}
                  <option value={OTHER_COUNTRY.code}>{OTHER_COUNTRY.name}</option>
                </select>
              </label>
            </div>
          </section>

          {/* Payment */}
          <section className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Payment method</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {country.code === OTHER_COUNTRY.code ? 'Accepted cards and wallets' : `Ways to pay in ${country.name}`}. You choose one in the secure payment window.
                </p>
              </div>
            </div>
            <ul className="mt-4 flex flex-wrap gap-2" data-testid="payment-methods" aria-label={`Payment methods for ${country.name}`}>
              {methods.map((m) => (
                <li key={m.id}>
                  <PaymentMethodLogo id={m.id} label={m.label} />
                </li>
              ))}
            </ul>

            <button
              type="button"
              onClick={handleRazorpayPayment}
              disabled={isProcessing || !plan || unavailable}
              className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-[#0066FF] py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#0052cc] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isProcessing ? (
                <>
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                  </svg>
                  <span>Opening secure payment…</span>
                </>
              ) : (
                <>
                  <LockIcon />
                  <span>Pay {priceText}</span>
                </>
              )}
            </button>

            <div className="mt-4 flex flex-col gap-2 text-[11px] leading-relaxed text-slate-500 sm:flex-row sm:items-center sm:justify-between">
              <span className="flex items-center gap-1.5">
                <LockIcon className="h-3.5 w-3.5 text-emerald-600" />
                Payments are processed by Razorpay. AMSh never sees or stores your card details.
              </span>
              <span className="flex shrink-0 items-center gap-1 text-slate-400">
                Secured by
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" aria-hidden="true"><path d={siRazorpay.path} fill={`#${siRazorpay.hex}`} /></svg>
                <span className="font-semibold text-slate-600">Razorpay</span>
              </span>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">
              By paying you agree to the <a href="/legal/terms" target="_blank" rel="noreferrer" className="underline hover:text-slate-600">Terms of Service</a> and{' '}
              <a href="/legal/privacy" target="_blank" rel="noreferrer" className="underline hover:text-slate-600">Privacy Policy</a>.
            </p>
          </section>
        </div>

        {/* Order summary */}
        <aside className="rounded-xl border border-slate-200 bg-slate-50 p-5 sm:p-6 lg:sticky lg:top-6 lg:col-span-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Order summary</h2>
            <button type="button" onClick={() => router.push('/onboarding/plans')} className="text-xs font-medium text-[#0066FF] hover:underline">
              Change plan
            </button>
          </div>

          <div className="mt-4 rounded-lg border border-slate-200 bg-white p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-slate-900">{planInfo.name}</p>
                <p className="text-xs text-slate-500">{isYearly ? 'Billed yearly' : 'Billed monthly'}</p>
              </div>
              <span className="text-sm font-semibold text-slate-900">{priceText}</span>
            </div>
            {lines.length > 0 && (
              <ul className="mt-3 space-y-1.5 border-t border-slate-100 pt-3">
                {lines.map((line) => (
                  <li key={line} className="flex items-center gap-2 text-xs text-slate-600">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    {line}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between text-slate-600">
              <dt>Subtotal</dt>
              <dd>{priceText}</dd>
            </div>
            <div className="flex justify-between text-slate-600">
              <dt>Taxes</dt>
              <dd className="text-xs text-slate-500">Included where applicable</dd>
            </div>
            <div className="flex items-baseline justify-between border-t border-slate-200 pt-3">
              <dt className="font-semibold text-slate-900">Total due today</dt>
              <dd data-testid="checkout-total" className="text-xl font-semibold text-slate-900">{priceText}</dd>
            </div>
          </dl>
          <p className="mt-2 text-xs text-slate-500">
            Renews {isYearly ? 'every year' : 'every month'} at {priceText} until you change or cancel your plan in Billing.
          </p>
        </aside>
      </div>

      <div className="mt-8 border-t border-slate-100 pt-4">
        <button
          type="button"
          onClick={() => router.push('/onboarding/plans')}
          className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
        >
          Back to plans
        </button>
      </div>
    </div>
  );
}

function LockIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
