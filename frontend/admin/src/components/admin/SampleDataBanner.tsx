"use client";
import React from 'react';
import { usePathname } from 'next/navigation';

/** Pages that read real data. Every other admin page is still a design mock and says so at the top. */
const REAL_PAGES = ['/dashboard', '/businesses', '/billing', '/integrations', '/calls'];

export function SampleDataBanner() {
  const pathname = usePathname() || '';
  if (REAL_PAGES.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;
  return (
    <div role="note" className="flex-shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800">
      <strong>Sample data.</strong> This page is a design preview and is not connected to the platform yet: nothing here is real.
    </div>
  );
}
