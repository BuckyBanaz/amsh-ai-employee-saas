"use client";
import React from 'react';
import { BillingHeader } from '../../../components/dashboard/BillingHeader';
import { CurrentPlanCard } from '../../../components/dashboard/CurrentPlanCard';
import { PricingTiers } from '../../../components/dashboard/PricingTiers';
import { PaymentMethodCard } from '../../../components/dashboard/PaymentMethodCard';
import { InvoiceHistory } from '../../../components/dashboard/InvoiceHistory';

export default function BillingPage() {
  return (
    <div className="animate-in fade-in duration-500 pt-4 pb-6 flex flex-col h-full w-full">
      <BillingHeader />
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide pb-10">
        <CurrentPlanCard />
        <PricingTiers />
        <PaymentMethodCard />
        <InvoiceHistory />
      </div>
    </div>
  );
}
