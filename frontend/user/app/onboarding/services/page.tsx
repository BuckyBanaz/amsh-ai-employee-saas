"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../../utils/strings/en';

const services = [
  {
    id: 1,
    title: 'Dental Consultation',
    description: 'Standard clinic appointment slot',
    duration: '30 min',
    price: '€50',
    doctor: 'Dr. Sarah Wilson',
  },
  {
    id: 2,
    title: 'Dental Cleaning',
    description: 'Standard clinic appointment slot',
    duration: '45 min',
    price: '€80',
    doctor: 'Dr. John Miller',
  },
  {
    id: 3,
    title: 'Teeth Whitening',
    description: 'Standard clinic appointment slot',
    duration: '60 min',
    price: '€150',
    doctor: 'Dr. Emily Carter',
  },
];

export default function ServicesOnboardingPage() {
  const router = useRouter();

  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">{STRINGS.ONBOARDING.SERVICES.TITLE}</h1>
        <p className="text-gray-500">
          {STRINGS.ONBOARDING.SERVICES.SUBTITLE}
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {services.map((service) => (
          <div key={service.id} className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors bg-white group">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">{service.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{service.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1.5 text-gray-400 hover:text-[#0066FF] hover:bg-blue-50 rounded-md transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button className="p-1.5 text-gray-400 hover:text-[#0066FF] hover:bg-blue-50 rounded-md transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
                <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center bg-[#F0F7FF] px-2.5 py-1 rounded-md">
                <span className="text-xs font-semibold text-[#0066FF]">{service.duration}</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{service.price}</span>
              <div className="h-4 w-px bg-gray-200"></div>
              <div className="flex items-center gap-1.5 text-gray-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                <span className="text-xs font-medium">{service.doctor}</span>
              </div>
            </div>
          </div>
        ))}

        <button 
          type="button" 
          className="w-full border-2 border-dashed border-gray-200 rounded-xl bg-[#FAFAFB] p-6 flex flex-col items-center justify-center hover:bg-gray-50 hover:border-[#0066FF] transition-colors group"
        >
          <div className="w-10 h-10 mb-3 bg-[#F0F7FF] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
          </div>
          <p className="text-sm font-semibold text-[#0066FF]">{STRINGS.ONBOARDING.SERVICES.ADD_SERVICE}</p>
          <p className="text-xs text-gray-500 mt-1">{STRINGS.ONBOARDING.SERVICES.ADD_SERVICE_SUBTITLE}</p>
        </button>
      </div>

      {/* Footer Buttons */}
      <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/business')}
          className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.SERVICES.BACK_BTN}
        </button>
        <button 
          type="button"
          onClick={() => router.push('/onboarding/staff')} 
          className="px-8 py-2.5 rounded-lg bg-[#0066FF] text-white font-medium hover:bg-[#0052cc] transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.SERVICES.CONTINUE_BTN}
        </button>
      </div>
    </div>
  );
}

