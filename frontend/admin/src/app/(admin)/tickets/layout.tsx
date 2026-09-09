"use client";
import React from 'react';
import { TicketsProvider } from './store';

// Provider lives in the layout so ticket state survives navigation between list and detail.
export default function TicketsLayout({ children }: { children: React.ReactNode }) {
  return <TicketsProvider>{children}</TicketsProvider>;
}
