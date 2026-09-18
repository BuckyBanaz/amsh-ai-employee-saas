"use client";

import React from 'react';
import { usePathname } from 'next/navigation';
import { STRINGS } from '../../utils/strings/en';

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
  { id: 10, name: 'Plans', href: '/onboarding/plans' },
  { id: 11, name: 'Checkout', href: '/onboarding/checkout' },
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
        <header className="bg-white border-b border-gray-200 px-4 sm:px-6 py-2 sm:py-2.5 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-[#0066FF] rounded-md flex items-center justify-center">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 4v16m-4-10v4m8-8v12" />
              </svg>
            </div>
            <span className="text-base sm:text-lg font-bold tracking-tight text-gray-900">{STRINGS.APP.NAME}</span>
          </div>
          <button className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors shadow-xs">
            {STRINGS.ONBOARDING.LAYOUT.SAVE_LATER}
          </button>
        </header>
      )}

      {/* Stepper Navigation */}
      {!pathname.includes('success') && (
        <div className="bg-white border-b border-gray-200 px-2 sm:px-4 py-2 sm:py-2.5 shadow-xs">
          <nav aria-label="Progress" className="max-w-7xl mx-auto flex flex-col items-center">
            <div className="w-full overflow-x-auto scrollbar-none py-0.5 flex justify-center">
              <ol role="list" className="flex items-center justify-center shrink-0">
                {steps.map((step, stepIdx) => (
                  <li key={step.name} className="flex items-center">
                    {step.status === 'complete' ? (
                      <a href={step.href} className="flex items-center group cursor-pointer" title={step.name}>
                        <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-[#0066FF] text-white text-[10px] sm:text-xs font-bold group-hover:bg-[#0052cc] transition-colors shadow-xs">
                          {step.id}
                        </span>
                        <span className="hidden xl:inline ml-2 text-xs font-medium text-gray-900">{step.name}</span>
                      </a>
                    ) : step.status === 'current' ? (
                      <div className="flex items-center" aria-current="step">
                        <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full bg-[#0066FF] text-white text-[10px] sm:text-xs font-bold ring-2 sm:ring-3 ring-blue-100 shadow-xs">
                          {step.id}
                        </span>
                        <span className="hidden xl:inline ml-2 text-xs font-bold text-[#0066FF]">{step.name}</span>
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <span className="flex h-5 w-5 sm:h-6 sm:w-6 items-center justify-center rounded-full border border-gray-300 bg-white text-gray-400 text-[10px] sm:text-xs font-medium">
                          {step.id}
                        </span>
                        <span className="hidden xl:inline ml-2 text-xs font-medium text-gray-500">{step.name}</span>
                      </div>
                    )}

                    {/* Separator line between steps */}
                    {stepIdx !== steps.length - 1 && (
                      <div className="w-1.5 sm:w-3 md:w-5 xl:w-7 h-0.5 bg-gray-200 mx-1 sm:mx-1.5 md:mx-2" />
                    )}
                  </li>
                ))}
              </ol>
            </div>
            {/* Mobile and Tablet current step indicator */}
            <div className="xl:hidden mt-1.5 flex items-center justify-center gap-1.5 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-blue-50 text-[#0066FF] font-semibold text-[11px]">
                Step {currentStepIndex + 1} of {steps.length}
              </span>
              <span className="text-gray-800 font-semibold text-xs">
                {steps[currentStepIndex]?.name}
              </span>
            </div>
          </nav>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-start p-3 sm:p-5 md:p-6 w-full">
        {children}
      </main>
    </div>
  );
}
