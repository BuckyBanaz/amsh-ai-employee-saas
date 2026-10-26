"use client";
import React from 'react';
import { DepartmentsManager } from '../../../components/verticals/DepartmentsManager';
import { OnboardingStepShell } from '../../../components/verticals/OnboardingStepShell';

export default function OnboardingDepartmentsPage() {
  return (
    <OnboardingStepShell
      href="/onboarding/departments"
      title="Departments and transfer routing"
      subtitle="Add the teams callers can be connected to, each with its own number and a fallback. Start from the suggested list for your type of institution."
    >
      <DepartmentsManager compact />
    </OnboardingStepShell>
  );
}
