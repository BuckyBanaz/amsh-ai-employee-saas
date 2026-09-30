"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

interface BillingHeaderProps {
  planStatus?: string;
  planName?: string;
}

export function BillingHeader({
  planStatus = 'active',
  planName = 'Professional Clinic'
}: BillingHeaderProps) {
  const isActive = planStatus.toLowerCase() === 'active';

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 py-1 shrink-0">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">
          {STRINGS.DASHBOARD.HEADERS.BILLING.TITLE}
        </h1>
        <p className="text-xs text-gray-500 font-medium mt-0.5">
          {STRINGS.DASHBOARD.HEADERS.BILLING.SUBTITLE}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
          isActive 
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
            : 'bg-amber-50 text-amber-700 border border-amber-200/60'
        }`}>
          <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-amber-500'}`} />
          {isActive ? `${planName} Active` : `Subscription ${planStatus}`}
        </span>
      </div>
    </header>
  );
}
