"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';

const ALL_STEPS = [
  { id: 1, name: 'Account', href: '/onboarding/account' },
  { id: 2, name: 'Business', href: '/onboarding/business' },
  { id: 3, name: 'Services', href: '/onboarding/services' },
  { id: 4, name: 'Staff', href: '/onboarding/staff' },
  { id: 5, name: 'Hours', href: '/onboarding/hours' },
  { id: 6, name: 'AI Receptionist', href: '/onboarding/ai-receptionist' },
  { id: 7, name: 'Knowledge', href: '/onboarding/knowledge' },
  { id: 8, name: 'Integrations', href: '/onboarding/integrations' },
  { id: 9, name: 'Review', href: '/onboarding/review' },
];

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '';
  
  // Default to Business (index 1) if we can't match the route
  let currentStepIndex = ALL_STEPS.findIndex(s => pathname.includes(s.href));
  if (currentStepIndex === -1) currentStepIndex = 1;
  
  const steps = ALL_STEPS.map((step, idx) => ({
    ...step,
    status: idx < currentStepIndex ? 'complete' : idx === currentStepIndex ? 'current' : 'upcoming'
  }));
  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col font-sans">
      {/* Top Navbar */}
      {!pathname.includes('success') && (
        <header className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#0066FF] rounded-md flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 4v16m-4-10v4m8-8v12" />
              </svg>
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">{STRINGS.APP.NAME}</span>
          </div>
          <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
            {STRINGS.ONBOARDING.LAYOUT.SAVE_LATER}
          </button>
        </header>
      )}

      {/* Stepper Navigation */}
      {!pathname.includes('success') && (
        <div className="bg-white border-b border-gray-200 px-4 py-3 overflow-x-auto shadow-sm scrollbar-hide [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none']">
        <nav aria-label="Progress" className="max-w-7xl mx-auto flex justify-center">
          <ol role="list" className="flex items-center justify-center gap-2 md:gap-4 min-w-max">
            {steps.map((step, stepIdx) => (
              <li key={step.name} className="relative flex items-center">
                {step.status === 'complete' ? (
                  <div className="flex items-center">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0066FF]">
                      <svg className="h-3 w-3 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                      </svg>
                    </span>
                    <span className="ml-2 text-[11px] md:text-xs font-medium text-gray-900">{step.name}</span>
                  </div>
                ) : step.status === 'current' ? (
                  <div className="flex items-center" aria-current="step">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#0066FF] text-white text-[10px] font-bold ring-2 ring-blue-50">
                      {step.id}
                    </span>
                    <span className="ml-2 text-[11px] md:text-xs font-bold text-[#0066FF]">{step.name}</span>
                  </div>
                ) : (
                  <div className="flex items-center">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-500 text-[10px] font-medium">
                      {step.id}
                    </span>
                    <span className="ml-2 text-[11px] md:text-xs font-medium text-gray-500">{step.name}</span>
                  </div>
                )}

                {/* Separator line between steps */}
                {stepIdx !== steps.length - 1 && (
                  <div className="hidden sm:block ml-2 md:ml-4 w-3 md:w-6 h-px bg-gray-200" />
                )}
              </li>
            ))}
          </ol>
        </nav>
      </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start p-6 sm:p-10">
        {children}
      </main>
    </div>
  );
}
