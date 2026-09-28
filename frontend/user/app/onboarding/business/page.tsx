"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';
import { OnboardingController } from '../../../controllers/onboarding.controller';
import { DashboardController } from '../../../controllers/dashboard.controller';
import { StorageService } from '../../../services/storage.service';

export default function BusinessOnboardingPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    businessName: '',
    vertical: 'clinic',
    country: 'India',
    address: '',
    website: '',
    city: '',
    email: '',
    postalCode: '',
    phone: '',
    timezone: 'Asia/Kolkata',
    currency: 'INR',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [savedLogoName, setSavedLogoName] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  React.useEffect(() => {
    try {
      const saved = localStorage.getItem('onboarding_business_data');
      if (saved) {
        const parsed = JSON.parse(saved);
        setFormData((prev) => ({ ...prev, ...parsed }));
      }
      const savedLogo = localStorage.getItem('onboarding_logo_name');
      if (savedLogo) {
        setSavedLogoName(savedLogo);
      }
    } catch (e) {
      console.error('Failed to parse saved business data:', e);
    }
  }, []);

  const handleLogoUpload = (file: File | null) => {
    if (file) {
      setLogoFile(file);
      setSavedLogoName(file.name);
      localStorage.setItem('onboarding_logo_name', file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          try {
            localStorage.setItem('business_logo', reader.result);
          } catch {}
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleNext = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.businessName || !formData.vertical || !formData.address || !formData.email || !formData.phone) {
      setError(STRINGS.ONBOARDING.BUSINESS.ERROR_REQUIRED);
      return;
    }
    setError('');
    setLoading(true);

    try {
      const response = await OnboardingController.createBusiness({
        name: formData.businessName,
        vertical: formData.vertical,
        country: formData.country,
        address: formData.address,
        website: formData.website,
        city: formData.city,
        business_email: formData.email,
        business_phone: formData.phone,
        postal_code: formData.postalCode,
        timezone: formData.timezone,
        currency: formData.currency,
      });

      if (response && response.id) {
        StorageService.setBusinessId(response.id);
        localStorage.setItem('onboarding_currency', formData.currency);
        localStorage.setItem('onboarding_business_data', JSON.stringify(formData));

        if (logoFile) {
          try {
            await DashboardController.uploadBusinessLogo(logoFile, response.id);
          } catch (uploadErr) {
            console.warn('Could not upload logo during onboarding:', uploadErr);
          }
        }

        router.push('/onboarding/services');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create business');
    } finally {
      setLoading(false);
    }
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
              <option value="India">India</option>
              <option value="United States">United States</option>
              <option value="United Arab Emirates">United Arab Emirates</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
              <option value="Singapore">Singapore</option>
              <option value="Germany">Germany</option>
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
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                handleLogoUpload(file);
              }}
            />
            {logoFile || savedLogoName ? (
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 mb-2 bg-[#E6FBF3] rounded-full flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                  </svg>
                </div>
                <p className="text-xs font-bold text-gray-900">{logoFile?.name || savedLogoName}</p>
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
        <div className="pt-3 flex justify-between items-center border-t border-gray-100 mt-4">
          <button 
            type="button" 
            onClick={handleBack}
            disabled={loading}
            className="text-gray-600 hover:text-gray-900 font-semibold text-xs px-4 py-2 transition-colors disabled:opacity-50"
          >
            Back
          </button>
          
          <button 
            type="submit" 
            disabled={loading}
            className="bg-[#0066FF] hover:bg-[#0052cc] text-white font-bold px-6 py-2.5 rounded-lg text-sm transition-all shadow-sm disabled:bg-blue-300 min-w-[140px] flex items-center justify-center cursor-pointer"
          >
            {loading ? 'Saving...' : 'Save & Next →'}
          </button>
        </div>
      </form>
    </div>
  );
}
