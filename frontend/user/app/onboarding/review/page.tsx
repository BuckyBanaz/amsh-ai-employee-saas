"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';

export default function ReviewOnboardingPage() {
  const router = useRouter();

  return (
    <div className="w-full max-w-5xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">{STRINGS.ONBOARDING.REVIEW.TITLE}</h1>
        <p className="text-gray-500 leading-relaxed max-w-3xl">
          {STRINGS.ONBOARDING.REVIEW.SUBTITLE}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        
        {/* Business Details */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wide">{STRINGS.ONBOARDING.REVIEW.SECTIONS.BUSINESS.TITLE}</h2>
            <button className="text-[13px] font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors">{STRINGS.ONBOARDING.REVIEW.EDIT_BTN}</button>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <span className="text-[13px] text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.BUSINESS.PRACTICE_NAME}</span>
              <span className="text-[13px] font-semibold text-gray-900 text-right">Smile Dental Clinic</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-[13px] text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.BUSINESS.TYPE}</span>
              <span className="text-[13px] font-semibold text-gray-900 text-right">Dental Clinic</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-[13px] text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.BUSINESS.LOCATION}</span>
              <span className="text-[13px] font-semibold text-gray-900 text-right">Amsterdam, Netherlands</span>
            </div>
          </div>
        </div>

        {/* Business Hours */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wide">{STRINGS.ONBOARDING.REVIEW.SECTIONS.HOURS.TITLE}</h2>
            <button className="text-[13px] font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors">{STRINGS.ONBOARDING.REVIEW.EDIT_BTN}</button>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <span className="text-[13px] text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.HOURS.MON_FRI}</span>
              <span className="text-[13px] font-semibold text-gray-900 text-right">09:00 - 18:00</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-[13px] text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.HOURS.SAT}</span>
              <span className="text-[13px] font-semibold text-gray-900 text-right">09:00 - 13:00</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-[13px] text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.HOURS.SUN}</span>
              <span className="text-[13px] font-semibold text-gray-900 text-right">{STRINGS.ONBOARDING.REVIEW.SECTIONS.HOURS.CLOSED}</span>
            </div>
          </div>
        </div>

        {/* Configured Services */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wide">{STRINGS.ONBOARDING.REVIEW.SECTIONS.SERVICES.TITLE}</h2>
            <button className="text-[13px] font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors">{STRINGS.ONBOARDING.REVIEW.EDIT_BTN}</button>
          </div>
          <ul className="space-y-3">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]"></div>
              <span className="text-[13px] font-medium text-gray-900">Dental Consultation</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]"></div>
              <span className="text-[13px] font-medium text-gray-900">Dental Cleaning</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]"></div>
              <span className="text-[13px] font-medium text-gray-900">Teeth Whitening</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]"></div>
              <span className="text-[13px] font-medium text-gray-900">Root Canal</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]"></div>
              <span className="text-[13px] font-medium text-gray-900">Dental X-Ray</span>
            </li>
          </ul>
        </div>

        {/* Clinical Team */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wide">{STRINGS.ONBOARDING.REVIEW.SECTIONS.TEAM.TITLE}</h2>
            <button className="text-[13px] font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors">{STRINGS.ONBOARDING.REVIEW.EDIT_BTN}</button>
          </div>
          <ul className="space-y-3">
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div>
              <span className="text-[13px] font-medium text-gray-900">Dr. Sarah Wilson</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div>
              <span className="text-[13px] font-medium text-gray-900">Dr. John Miller</span>
            </li>
            <li className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div>
              <span className="text-[13px] font-medium text-gray-900">Dr. Emily Carter</span>
            </li>
          </ul>
        </div>

        {/* AI Receptionist */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wide">{STRINGS.ONBOARDING.REVIEW.SECTIONS.AI.TITLE}</h2>
            <button className="text-[13px] font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors">{STRINGS.ONBOARDING.REVIEW.EDIT_BTN}</button>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <span className="text-[13px] text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.AI.AGENT_NAME}</span>
              <span className="text-[13px] font-semibold text-gray-900 text-right">Sarah</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-[13px] text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.AI.LANGUAGES}</span>
              <span className="text-[13px] font-semibold text-gray-900 text-right">English + Dutch</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-[13px] text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.AI.CAPABILITIES}</span>
              <span className="text-[13px] font-semibold text-gray-900 text-right">8 active skills</span>
            </div>
          </div>
        </div>

        {/* Knowledge Base */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white hover:border-gray-300 transition-colors">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wide">{STRINGS.ONBOARDING.REVIEW.SECTIONS.KNOWLEDGE.TITLE}</h2>
            <button className="text-[13px] font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors">{STRINGS.ONBOARDING.REVIEW.EDIT_BTN}</button>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-start">
              <span className="text-[13px] text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.KNOWLEDGE.DOCS}</span>
              <span className="text-[13px] font-semibold text-gray-900 text-right">2 uploaded PDFs</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-[13px] text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.KNOWLEDGE.WEBSITES}</span>
              <span className="text-[13px] font-semibold text-gray-900 text-right">1 core site</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-[13px] text-gray-500">{STRINGS.ONBOARDING.REVIEW.SECTIONS.KNOWLEDGE.FAQS}</span>
              <span className="text-[13px] font-semibold text-gray-900 text-right">5 manual Q&amp;As</span>
            </div>
          </div>
        </div>

        {/* Integrations Connected */}
        <div className="border border-gray-200 rounded-xl p-6 bg-white hover:border-gray-300 transition-colors lg:col-span-2">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-[13px] font-bold text-gray-900 uppercase tracking-wide">{STRINGS.ONBOARDING.REVIEW.SECTIONS.INTEGRATIONS.TITLE}</h2>
            <button className="text-[13px] font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors">{STRINGS.ONBOARDING.REVIEW.EDIT_BTN}</button>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center py-1">
              <div className="flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
                <span className="text-[13px] font-medium text-gray-900">Google Calendar</span>
              </div>
              <span className="bg-[#E6FBF3] text-[#10B981] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                {STRINGS.ONBOARDING.REVIEW.SECTIONS.INTEGRATIONS.CONNECTED}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <div className="flex items-center gap-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                </svg>
                <span className="text-[13px] font-medium text-gray-900">Twilio Carrier Link</span>
              </div>
              <span className="bg-[#E6FBF3] text-[#10B981] text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider">
                {STRINGS.ONBOARDING.REVIEW.SECTIONS.INTEGRATIONS.CONNECTED}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Footer Buttons */}
      <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/integrations')}
          className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.REVIEW.BACK_BTN}
        </button>
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/success')}
          className="px-8 py-2.5 rounded-lg bg-[#0066FF] text-white font-medium hover:bg-[#0052cc] transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.REVIEW.FINISH_BTN}
        </button>
      </div>
    </div>
  );
}
