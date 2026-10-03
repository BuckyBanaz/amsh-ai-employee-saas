"use client";
import React from 'react';
import { usePathname } from 'next/navigation';

const REAL_PAGES = [
  '/dashboard',
  '/businesses',
  '/business-users',
  '/billing',
  '/integrations',
  '/calls',
  '/health',
  '/notifications',
  '/settings',
  '/analytics',
  '/receptionists',
  '/appointments',
  '/conversations',
  '/usage',
  '/seo',
];

export function SampleDataBanner() {
  const pathname = usePathname() || '';
  if (REAL_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  return (
    <div role="note" className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800">
      <strong>Sample data.</strong> This page is a design preview and is not connected to the platform yet: nothing here is real.
    </div>
  );
}
