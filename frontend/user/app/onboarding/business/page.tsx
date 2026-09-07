"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../../utils/strings/en';

export default function BusinessOnboardingPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    businessName: 'Smile Dental Clinic',
    type: 'Dental Clinic',
    country: 'United States',
    address: '456 Medical Parkway, Suite 100',
    website: 'www.smiledentalclinic.com',
    city: 'Austin',
    email: 'reception@smiledental.com',
    postalCode: '78701',
    phone: '+1 (555) 234-5678',
    timezone: 'Central Time (US & Canada)',
  });
  const [error, setError] = useState('');

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName || !formData.type || !formData.address || !formData.email || !formData.phone) {
      setError(STRINGS.ONBOARDING.BUSINESS.ERROR_REQUIRED);
      return;
    }
    setError('');
    router.push('/onboarding/services');
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">{STRINGS.ONBOARDING.BUSINESS.TITLE}</h1>
        <p className="text-gray-500">
          {STRINGS.ONBOARDING.BUSINESS.SUBTITLE}
        </p>
      </div>

      <form onSubmit={handleNext} className="space-y-8">
        {error && <div className="text-red-500 text-sm font-medium p-3 bg-red-50 rounded-lg border border-red-100">{error}</div>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.NAME}</label>
            <input 
              type="text" 
              value={formData.businessName}
              onChange={(e) => setFormData({...formData, businessName: e.target.value})}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.COUNTRY}</label>
            <select 
              value={formData.country}
              onChange={(e) => setFormData({...formData, country: e.target.value})}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all appearance-none bg-white"
            >
              <option>United States</option>
              <option>Canada</option>
              <option>United Kingdom</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.TYPE}</label>
            <select 
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all appearance-none bg-white"
            >
              <option>Dental Clinic</option>
              <option>Medical Clinic</option>
              <option>Physiotherapy</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.ADDRESS}</label>
            <input 
              type="text" 
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.WEBSITE}</label>
            <input 
              type="url" 
              value={formData.website}
              onChange={(e) => setFormData({...formData, website: e.target.value})}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.CITY}</label>
            <input 
              type="text" 
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.EMAIL}</label>
            <input 
              type="email" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.POSTAL_CODE}</label>
            <input 
              type="text" 
              value={formData.postalCode}
              onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.PHONE}</label>
            <input 
              type="tel" 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.TIMEZONE}</label>
            <select 
              value={formData.timezone}
              onChange={(e) => setFormData({...formData, timezone: e.target.value})}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all appearance-none bg-white"
            >
              <option>Central Time (US & Canada)</option>
              <option>Eastern Time (US & Canada)</option>
              <option>Pacific Time (US & Canada)</option>
            </select>
          </div>
        </div>

        {/* File Upload Area */}
        <div className="space-y-2 pt-2">
          <label className="text-sm font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.UPLOAD_LOGO}</label>
          <div className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 p-10 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-[#0066FF] transition-colors group">
            <div className="w-10 h-10 mb-3 bg-white rounded-full shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#0066FF]">{STRINGS.ONBOARDING.BUSINESS.UPLOAD_DRAG}</p>
            <p className="text-xs text-gray-500 mt-1">{STRINGS.ONBOARDING.BUSINESS.UPLOAD_HINT}</p>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
          <button 
            type="button" 
            onClick={handleBack}
            className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            {STRINGS.ONBOARDING.BUSINESS.BACK_BTN}
          </button>
          <button 
            type="submit" 
            className="px-8 py-2.5 rounded-lg bg-[#0066FF] text-white font-medium hover:bg-[#0052cc] transition-colors shadow-sm"
          >
            {STRINGS.ONBOARDING.BUSINESS.CONTINUE_BTN}
          </button>
        </div>
      </form>
    </div>
  );
}
