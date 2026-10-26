"use client";
import { useVerticalConfig } from './useVerticalConfig';
import type { VerticalConfig } from './types';

export interface StepLink { key: string; name: string; href: string }

// Where each onboarding step of a vertical definition lives (backend/ai/workflows/definitions/*.yaml "onboarding").
const HREF: Record<string, string> = {
  business: '/onboarding/business', services: '/onboarding/services', staff: '/onboarding/staff', hours: '/onboarding/hours',
  departments: '/onboarding/departments', resources: '/onboarding/resources', ai_receptionist: '/onboarding/ai-receptionist',
  knowledge: '/onboarding/knowledge', integrations: '/onboarding/integrations', review: '/onboarding/review',
};

// Today's clinic flow: what everyone sees until a business (and so its type) exists, and what clinics keep.
const DEFAULT: StepLink[] = [
  { key: 'business', name: 'Business', href: HREF.business },
  { key: 'services', name: 'Services', href: HREF.services },
  { key: 'staff', name: 'Staff', href: HREF.staff },
  { key: 'hours', name: 'Hours', href: HREF.hours },
  { key: 'ai_receptionist', name: 'AI Receptionist', href: HREF.ai_receptionist },
  { key: 'knowledge', name: 'Knowledge', href: HREF.knowledge },
  { key: 'integrations', name: 'Integrations', href: HREF.integrations },
  { key: 'review', name: 'Review', href: HREF.review },
];
const HEAD: StepLink[] = [{ key: 'account', name: 'Account', href: '/onboarding/account' }];
const TAIL: StepLink[] = [
  { key: 'plans', name: 'Plans', href: '/onboarding/plans' },
  { key: 'checkout', name: 'Checkout', href: '/onboarding/checkout' },
];

export function stepsFor(config: VerticalConfig | null): StepLink[] {
  if (!config || !config.supported || config.vertical === 'clinic' || !config.onboarding?.length) return [...HEAD, ...DEFAULT, ...TAIL];
  const middle = config.onboarding.filter((s) => HREF[s.key]).map((s) => ({ key: s.key, name: s.title, href: HREF[s.key] }));
  return [...HEAD, ...middle, ...TAIL];
}

export function useOnboardingSteps() {
  const { config } = useVerticalConfig();
  const steps = stepsFor(config);
  const at = (href: string) => steps.findIndex((s) => s.href === href);
  return {
    steps,
    next: (href: string) => steps[at(href) + 1]?.href || '/onboarding/review',
    prev: (href: string) => steps[Math.max(at(href) - 1, 0)]?.href || '/onboarding/business',
  };
}
