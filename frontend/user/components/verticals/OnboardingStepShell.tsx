"use client";
import React from 'react';
import { useRouter } from 'next/navigation';
import { useOnboardingSteps } from '../../verticals/onboardingSteps';

/** Frame for the steps only some business types have (Departments, Rooms): title, content, Back / Continue. The data is
 * saved as the user edits it (server-side), so Continue only moves on. */
export function OnboardingStepShell({ href, title, subtitle, children }: { href: string; title: string; subtitle: string; children: React.ReactNode }) {
  const router = useRouter();
  const onboarding = useOnboardingSteps();
  return (
    <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1.5">{title}</h1>
        <p className="text-sm text-gray-500">{subtitle}</p>
      </div>
      {children}
      <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
        <button type="button" onClick={() => router.push(onboarding.prev(href))} className="px-4 py-2 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">Back</button>
        <button type="button" onClick={() => router.push(onboarding.next(href))} className="px-5 py-2 text-xs font-semibold text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg">Continue</button>
      </div>
    </div>
  );
}
