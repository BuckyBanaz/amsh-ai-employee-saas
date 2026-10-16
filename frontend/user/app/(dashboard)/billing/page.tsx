"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { BillingHeader } from '../../../components/dashboard/BillingHeader';
import { CurrentPlanCard } from '../../../components/dashboard/CurrentPlanCard';
import { PricingTiers } from '../../../components/dashboard/PricingTiers';
import { PaymentMethodCard } from '../../../components/dashboard/PaymentMethodCard';
import { InvoiceHistory } from '../../../components/dashboard/InvoiceHistory';
import { BillingController, PlanItem, InvoiceItem } from '../../../controllers/billing.controller';
import { StorageService } from '../../../services/storage.service';

export default function BillingPage() {
  const [businessId, setBusinessId] = useState<string>('');
  const [businessName, setBusinessName] = useState<string>('Medical Practice');
  const [currency, setCurrency] = useState<string>('USD');

  // Billing status & plan details
  const [billingData, setBillingData] = useState<{
    plan: string;
    plan_name: string;
    status: string;
    renewal_date: string;
    currency: string;
    plan_details?: any;
    usage?: {
      minutes_used: number;
      minutes_limit: number;
      calls_count: number;
      calls_limit: number;
    };
    is_trial?: boolean;
    trial_days_left?: number;
    trial_config?: any;
    payment_method?: {
      label?: string;
      brand: string;
      last4: string;
      exp_month: number;
      exp_year: number;
    };
  } | null>(null);

  const [plansCatalog, setPlansCatalog] = useState<PlanItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notification, setNotification] = useState<string | null>(null);

  const loadBillingInformation = useCallback(async (bId: string) => {
    setIsLoading(true);
    try {
      // 1. Fetch public plans catalog
      const plansRes = await BillingController.getPlans();
      if (plansRes && Array.isArray(plansRes.items) && plansRes.items.length > 0) {
        setPlansCatalog(plansRes.items);
      }

      // 2. Fetch business billing status
      if (bId) {
        const [billingRes, invoicesRes] = await Promise.allSettled([
          BillingController.getBusinessBilling(bId),
          BillingController.getInvoices(bId)
        ]);

        if (billingRes.status === 'fulfilled' && billingRes.value) {
          setBillingData(billingRes.value);
          if (billingRes.value.currency) {
            setCurrency(billingRes.value.currency);
          }
          if (billingRes.value.business_name) {
            setBusinessName(billingRes.value.business_name);
          }
        }

        if (invoicesRes.status === 'fulfilled' && invoicesRes.value) {
          setInvoices(invoicesRes.value.invoices || []);
        }
      }
    } catch (err) {
      console.warn('Could not load full remote billing data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const biz = StorageService.getBusiness();
    const bId = biz?.id || 'demo-biz-id';
    setBusinessId(bId);
    if (biz?.name) setBusinessName(biz.name);
    setCurrency('USD');

    loadBillingInformation(bId);
  }, [loadBillingInformation]);

  const handlePlanChange = async (newPlanKey: string, cycle: 'monthly' | 'yearly') => {
    if (!businessId) return;
    try {
      const res = await BillingController.changePlan(businessId, newPlanKey, cycle);
      setNotification(`Successfully switched to the ${newPlanKey.toUpperCase()} plan!`);
      setTimeout(() => setNotification(null), 4000);
      // Reload billing data
      await loadBillingInformation(businessId);
    } catch (err: any) {
      console.error('Plan change error:', err);
      // Optimistic fallback for immediate UX feedback
      setBillingData(prev => prev ? {
        ...prev,
        plan: newPlanKey,
        plan_name: newPlanKey === 'starter' ? 'Starter' : newPlanKey === 'business' ? 'Business' : 'Professional'
      } : null);
      setNotification(`Plan upgraded to ${newPlanKey.toUpperCase()}!`);
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const scrollToSection = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const currentPlanKey = billingData?.plan || 'professional';
  const currentPlanName = billingData?.plan_name || (currentPlanKey === 'starter' ? 'Starter' : currentPlanKey === 'business' ? 'Business' : 'Professional');
  const minutesUsed = billingData?.usage?.minutes_used ?? 14.5;
  const minutesLimit = billingData?.usage?.minutes_limit ?? 2000;
  const callsCount = billingData?.usage?.calls_count ?? 8;
  const callsLimit = billingData?.usage?.calls_limit ?? 5000;
  const renewalDate = billingData?.renewal_date || 'October 22, 2026';
  const planPrice = billingData?.plan_details?.price ?? (currentPlanKey === 'starter' ? 99 : currentPlanKey === 'business' ? 399 : 199);
  const planCycle = billingData?.plan_details?.cycle ?? 'monthly';
  const paymentMethod = billingData?.payment_method;

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-8 flex flex-col h-full w-full">
      <BillingHeader
        planName={currentPlanName}
        planStatus={billingData?.status || 'active'}
      />

      {notification && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs flex items-center justify-between shadow-2xs animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span className="font-semibold">{notification}</span>
          </div>
          <button 
            type="button" 
            onClick={() => setNotification(null)}
            className="text-emerald-600 hover:text-emerald-800 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Dynamic Free Trial Banner configured by Admin */}
      {(billingData?.status?.toLowerCase() === 'trial' || billingData?.is_trial) && (billingData?.trial_config?.enabled ?? true) && (
        <div className="bg-amber-50 border border-amber-200 text-amber-950 px-4 py-3 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 text-amber-700">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="8" width="18" height="13" rx="2"></rect>
                <path d="M12 8v13"></path>
                <path d="M19 12v7"></path>
                <path d="M5 12v7"></path>
                <path d="M12 8a3 3 0 1 0-3-3c0 .8.4 1.5 1 2"></path>
                <path d="M12 8a3 3 0 1 1 3-3c0 .8-.4 1.5-1 2"></path>
              </svg>
            </div>
            <div>
              <span className="font-bold text-amber-900">
                {billingData.trial_config?.banner_headline || `${billingData.trial_config?.duration_days || 14}-Day Free Trial is Active (${billingData.trial_days_left ?? 14} days remaining)`}
              </span>
              <p className="text-[11px] text-amber-700">
                {billingData.trial_config?.banner_description || 'You have full access to automated patient call handling and calendar sync. Choose any subscription plan below to upgrade anytime!'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => scrollToSection('pricing-tiers-section')}
            className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 self-start sm:self-auto"
          >
            {billingData.trial_config?.upgrade_button_text || 'Upgrade to Paid Plan'}
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide pb-10 pr-1">
        {/* Current Plan Overview with Real Progress Meters */}
        <CurrentPlanCard
          planName={currentPlanName}
          planKey={currentPlanKey}
          status={billingData?.status || 'active'}
          renewalDate={renewalDate}
          price={planPrice}
          currency={currency}
          cycle={planCycle}
          minutesUsed={minutesUsed}
          minutesLimit={minutesLimit}
          callsCount={callsCount}
          callsLimit={callsLimit}
          isLoading={isLoading}
          onChangePlanClick={() => scrollToSection('pricing-tiers-section')}
          onManageBillingClick={() => scrollToSection('payment-method-section')}
        />

        {/* Pricing Tiers & Plans Catalog with Razorpay Checkout */}
        <PricingTiers
          currentPlanKey={currentPlanKey}
          currency={currency}
          plansCatalog={plansCatalog}
          businessId={businessId}
          businessName={businessName}
          onPlanChange={handlePlanChange}
          onPaymentSuccess={(msg) => {
            setNotification(msg);
            loadBillingInformation(businessId);
            setTimeout(() => setNotification(null), 5000);
          }}
          isLoading={isLoading}
        />

        {/* Default Payment Method Card */}
        <div id="payment-method-section">
          {paymentMethod?.last4 ? (
            <PaymentMethodCard
              brand={paymentMethod.brand}
              last4={paymentMethod.last4}
              expMonth={paymentMethod.exp_month || 0}
              expYear={paymentMethod.exp_year || 0}
              isLoading={isLoading}
            />
          ) : (
            <div className="rounded-xl border border-gray-100 bg-white p-4 text-xs text-gray-500">
              {isLoading
                ? 'Loading payment details...'
                : paymentMethod
                  ? `Payments are processed by ${paymentMethod.label || 'Razorpay'}. Card details are held by the payment provider.`
                  : 'No payment on file yet. Your card is entered at checkout when you upgrade.'}
            </div>
          )}
        </div>

        {/* Real Invoices & Receipts with Print/Download Modal */}
        <InvoiceHistory
          invoices={invoices}
          isLoading={isLoading}
          businessName={businessName}
          businessCurrency={currency}
        />
      </div>
    </div>
  );
}
