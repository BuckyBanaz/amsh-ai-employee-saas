"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';

export default function ReviewOnboardingPage() {
  const router = useRouter();

  return (
    <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1.5">{STRINGS.ONBOARDING.REVIEW.TITLE}</h1>
        <p className="text-sm text-gray-500 leading-relaxed max-w-3xl">
          {STRINGS.ONBOARDING.REVIEW.SUBTITLE}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-6">
        
        {/* Business Details */}
        <div className="border border-gray-200 rounded-lg p-3.5 bg-white hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">{STRINGS.ONBOARDING.REVIEW.SECTIONS.BUSINESS.TITLE}</h2>
            <button 
              type="button"
              onClick={() => router.push('/onboarding/business')}
              className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors cursor-pointer"
            >
              {STRINGS.ONBOARDING.REVIEW.EDIT_BTN}
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.BUSINESS.PRACTICE_NAME}</span>
              <span className="text-xs font-semibold text-gray-900 text-right">Smile Dental Clinic</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.BUSINESS.TYPE}</span>
              <span className="text-xs font-semibold text-gray-900 text-right">Dental Clinic</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.BUSINESS.LOCATION}</span>
              <span className="text-xs font-semibold text-gray-900 text-right">Amsterdam, Netherlands</span>
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div className="border border-gray-200 rounded-lg p-3.5 bg-white hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">{STRINGS.ONBOARDING.REVIEW.SECTIONS.HOURS.TITLE}</h2>
            <button 
              type="button"
              onClick={() => router.push('/onboarding/hours')}
              className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors cursor-pointer"
            >
              {STRINGS.ONBOARDING.REVIEW.EDIT_BTN}
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.HOURS.MON_FRI}</span>
              <span className="text-xs font-semibold text-gray-900 text-right">09:00 - 18:00</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.HOURS.SAT}</span>
              <span className="text-xs font-semibold text-gray-900 text-right">09:00 - 13:00</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.HOURS.SUN}</span>
              <span className="text-xs font-semibold text-gray-900 text-right">{STRINGS.ONBOARDING.REVIEW.SECTIONS.HOURS.CLOSED}</span>
            </div>
          </div>
        </div>

        {/* Configured Services */}
        <div className="border border-gray-200 rounded-lg p-3.5 bg-white hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">{STRINGS.ONBOARDING.REVIEW.SECTIONS.SERVICES.TITLE}</h2>
            <button 
              type="button"
              onClick={() => router.push('/onboarding/services')}
              className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors cursor-pointer"
            >
              {STRINGS.ONBOARDING.REVIEW.EDIT_BTN}
            </button>
          </div>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]"></div>
              <span className="text-xs font-medium text-gray-900">Dental Consultation</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]"></div>
              <span className="text-xs font-medium text-gray-900">Dental Cleaning</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]"></div>
              <span className="text-xs font-medium text-gray-900">Teeth Whitening</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]"></div>
              <span className="text-xs font-medium text-gray-900">Root Canal</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]"></div>
              <span className="text-xs font-medium text-gray-900">Dental X-Ray</span>
            </li>
          </ul>
        </div>

        {/* Clinical Team */}
        <div className="border border-gray-200 rounded-lg p-3.5 bg-white hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">{STRINGS.ONBOARDING.REVIEW.SECTIONS.TEAM.TITLE}</h2>
            <button 
              type="button"
              onClick={() => router.push('/onboarding/staff')}
              className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors cursor-pointer"
            >
              {STRINGS.ONBOARDING.REVIEW.EDIT_BTN}
            </button>
          </div>
          <ul className="space-y-2">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div>
              <span className="text-xs font-medium text-gray-900">Dr. Sarah Wilson</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div>
              <span className="text-xs font-medium text-gray-900">Dr. John Miller</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div>
              <span className="text-xs font-medium text-gray-900">Dr. Emily Carter</span>
            </li>
          </ul>
        </div>

        {/* AI Receptionist */}
        <div className="border border-gray-200 rounded-lg p-3.5 bg-white hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">{STRINGS.ONBOARDING.REVIEW.SECTIONS.AI.TITLE}</h2>
            <button 
              type="button"
              onClick={() => router.push('/onboarding/ai-receptionist')}
              className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors cursor-pointer"
            >
              {STRINGS.ONBOARDING.REVIEW.EDIT_BTN}
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.AI.AGENT_NAME}</span>
              <span className="text-xs font-semibold text-gray-900 text-right">Sarah</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.AI.LANGUAGES}</span>
              <span className="text-xs font-semibold text-gray-900 text-right">English + Dutch</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.AI.CAPABILITIES}</span>
              <span className="text-xs font-semibold text-gray-900 text-right">8 active skills</span>
            </div>
          </div>
        </div>

        {/* Knowledge Base */}
        <div className="border border-gray-200 rounded-lg p-3.5 bg-white hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">{STRINGS.ONBOARDING.REVIEW.SECTIONS.KNOWLEDGE.TITLE}</h2>
            <button 
              type="button"
              onClick={() => router.push('/onboarding/knowledge')}
              className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors cursor-pointer"
            >
              {STRINGS.ONBOARDING.REVIEW.EDIT_BTN}
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.KNOWLEDGE.DOCS}</span>
              <span className="text-xs font-semibold text-gray-900 text-right">2 uploaded PDFs</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.KNOWLEDGE.WEBSITES}</span>
              <span className="text-xs font-semibold text-gray-900 text-right">1 core site</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.KNOWLEDGE.FAQS}</span>
              <span className="text-xs font-semibold text-gray-900 text-right">5 manual Q&amp;As</span>
            </div>
          </div>
        </div>

        {/* Integrations Connected */}
        <div className="border border-gray-200 rounded-lg p-3.5 bg-white hover:border-gray-300 transition-colors lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide">{STRINGS.ONBOARDING.REVIEW.SECTIONS.INTEGRATIONS.TITLE}</h2>
            <button 
              type="button"
              onClick={() => router.push('/onboarding/integrations')}
              className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors cursor-pointer"
            >
              {STRINGS.ONBOARDING.REVIEW.EDIT_BTN}
            </button>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-center py-0.5">
              <div className="flex items-center gap-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span className="text-xs font-medium text-gray-900">Google Calendar</span>
              </div>
              <span className="bg-[#E6FBF3] text-[#10B981] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                {STRINGS.ONBOARDING.REVIEW.SECTIONS.INTEGRATIONS.CONNECTED}
              </span>
            </div>
            <div className="flex justify-between items-center py-0.5">
              <div className="flex items-center gap-2.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span className="text-xs font-medium text-gray-900">Twilio Carrier Link</span>
              </div>
              <span className="bg-[#E6FBF3] text-[#10B981] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                {STRINGS.ONBOARDING.REVIEW.SECTIONS.INTEGRATIONS.CONNECTED}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Buttons */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/integrations')}
          className="px-5 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm cursor-pointer"
        >
          {STRINGS.ONBOARDING.REVIEW.BACK_BTN}
        </button>
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/plans')}
          className="px-6 py-2 rounded-lg bg-[#0066FF] text-white text-sm font-medium hover:bg-[#0052cc] transition-colors shadow-sm cursor-pointer"
        >
          Select Subscription Plan
        </button>
      </div>
    </div>
  );
}
