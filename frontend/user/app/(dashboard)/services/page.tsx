"use client";
import React from 'react';
import { ServicesHeader } from '../../../components/dashboard/ServicesHeader';
import { ServiceCards } from '../../../components/dashboard/ServiceCards';

export default function ServicesPage() {
  return (
    <div className="animate-in fade-in duration-500 pt-4 pb-6 flex flex-col h-full w-full">
      <ServicesHeader />
      <div className="flex-1 min-h-0">
        <ServiceCards />
      </div>
    </div>
  );
}
