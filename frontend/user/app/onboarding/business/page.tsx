"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';

export default function BusinessOnboardingPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    businessName: 'Smile Dental Clinic',
    vertical: 'clinic',
    country: 'United States',
    address: '456 Medical Parkway, Suite 100',
    website: 'https://www.smiledentalclinic.com',
    city: 'Austin',
    email: 'reception@smiledental.com',
    postalCode: '78701',
    phone: '+1 (555) 234-5678',
    timezone: 'America/Chicago',
    currency: 'USD',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName || !formData.vertical || !formData.address || !formData.email || !formData.phone) {
      setError(STRINGS.ONBOARDING.BUSINESS.ERROR_REQUIRED);
      return;
    }
    setError('');
    localStorage.setItem('onboarding_currency', formData.currency);
    router.push('/onboarding/services');
  };

  const handleBack = () => {
    router.push('/');
  };

  return (
    <div className="w-full max-w-3xl bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1.5">{STRINGS.ONBOARDING.BUSINESS.TITLE}</h1>
        <p className="text-sm text-gray-500">
          {STRINGS.ONBOARDING.BUSINESS.SUBTITLE}
        </p>
      </div>

      <form onSubmit={handleNext} className="space-y-5">
        {error && <div className="text-red-500 text-xs font-medium p-2.5 bg-red-50 rounded-lg border border-red-100">{error}</div>}
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3.5">
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.NAME}</label>
            <input 
              type="text" 
              value={formData.businessName}
              onChange={(e) => setFormData({...formData, businessName: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>
          
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.COUNTRY}</label>
            <select 
              value={formData.country}
              onChange={(e) => setFormData({...formData, country: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all appearance-none bg-white"
            >
              <option>United States</option>
              <option>Canada</option>
              <option>United Kingdom</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.TYPE}</label>
            <select 
              value={formData.vertical}
              onChange={(e) => setFormData({...formData, vertical: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all appearance-none bg-white"
            >
              <option value="clinic">Clinic / Dental Practice</option>
              <option value="hospital">Hospital / Medical Center</option>
              <option value="restaurant">Restaurant / Cafe</option>
              <option value="gym">Gym / Fitness Center</option>
              <option value="salon">Salon / Spa</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.ADDRESS}</label>
            <input 
              type="text" 
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.WEBSITE}</label>
            <input 
              type="url" 
              value={formData.website}
              onChange={(e) => setFormData({...formData, website: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.CITY}</label>
            <input 
              type="text" 
              value={formData.city}
              onChange={(e) => setFormData({...formData, city: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.EMAIL}</label>
            <input 
              type="email" 
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.POSTAL_CODE}</label>
            <input 
              type="text" 
              value={formData.postalCode}
              onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.PHONE}</label>
            <input 
              type="tel" 
              value={formData.phone}
              onChange={(e) => setFormData({...formData, phone: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.FIELDS.TIMEZONE}</label>
            <select 
              value={formData.timezone}
              onChange={(e) => setFormData({...formData, timezone: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all appearance-none bg-white"
            >
              <option value="America/New_York">Eastern Time (US)</option>
              <option value="America/Chicago">Central Time (US)</option>
              <option value="America/Denver">Mountain Time (US)</option>
              <option value="America/Los_Angeles">Pacific Time (US)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris / Berlin (CET)</option>
              <option value="Asia/Kolkata">India (IST)</option>
              <option value="Asia/Dubai">Dubai (GST)</option>
              <option value="Australia/Sydney">Sydney (AEST)</option>
              <option value="UTC">UTC</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-900">Currency</label>
            <select 
              value={formData.currency}
              onChange={(e) => setFormData({...formData, currency: e.target.value})}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all appearance-none bg-white"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="INR">INR (₹)</option>
              <option value="CAD">CAD ($)</option>
              <option value="AUD">AUD ($)</option>
            </select>
          </div>
        </div>

        {/* File Upload Area */}
        <div className="space-y-1.5 pt-1">
          <label className="text-xs font-semibold text-gray-900">{STRINGS.ONBOARDING.BUSINESS.UPLOAD_LOGO}</label>
          <label className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 p-5 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-[#0066FF] transition-colors group relative overflow-hidden">
            <input 
              type="file" 
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              accept="image/png, image/jpeg"
              onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
            />
            {logoFile ? (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 mb-2 bg-[#E6FBF3] rounded-full flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <p className="text-xs font-bold text-gray-900">{logoFile.name}</p>
                <p className="text-[11px] text-[#0066FF] mt-0.5 font-medium hover:underline">Click to change logo</p>
              </div>
            ) : (
              <>
                <div className="w-8 h-8 mb-2 bg-white rounded-full shadow-xs flex items-center justify-center group-hover:scale-110 transition-transform">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="17 8 12 3 7 8"></polyline>
                    <line x1="12" y1="3" x2="12" y2="15"></line>
                  </svg>
                </div>
                <p className="text-xs font-semibold text-[#0066FF]">{STRINGS.ONBOARDING.BUSINESS.UPLOAD_DRAG}</p>
                <p className="text-[11px] text-gray-500 mt-0.5">{STRINGS.ONBOARDING.BUSINESS.UPLOAD_HINT}</p>
              </>
            )}
          </label>
        </div>

        {/* Footer Buttons */}
        <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
          <button 
            type="button" 
            onClick={handleBack}
            className="px-5 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
          >
            {STRINGS.ONBOARDING.BUSINESS.BACK_BTN}
          </button>
          <button 
            type="submit" 
            className="px-6 py-2 rounded-lg bg-[#0066FF] text-white text-sm font-medium hover:bg-[#0052cc] transition-colors shadow-sm"
          >
            {STRINGS.ONBOARDING.BUSINESS.CONTINUE_BTN}
          </button>
        </div>
      </form>
    </div>
  );
}
