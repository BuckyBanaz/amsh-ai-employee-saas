"use client";
import React, { useState, useEffect } from 'react';
import { STRINGS } from '../../../utils/strings/en';

interface DaySchedule {
  day: string;
  active: boolean;
  ranges: { start: string; end: string }[];
}

const defaultSchedule: DaySchedule[] = [
  { day: 'Monday', active: true, ranges: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }] },
  { day: 'Tuesday', active: true, ranges: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }] },
  { day: 'Wednesday', active: true, ranges: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }] },
  { day: 'Thursday', active: true, ranges: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '18:00' }] },
  { day: 'Friday', active: true, ranges: [{ start: '09:00', end: '13:00' }, { start: '14:00', end: '17:00' }] },
  { day: 'Saturday', active: true, ranges: [{ start: '09:00', end: '14:00' }] },
  { day: 'Sunday', active: false, ranges: [] },
];

export function BusinessSettings({ focusDangerZone }: { focusDangerZone?: boolean }) {
  useEffect(() => {
    if (focusDangerZone) {
      document.getElementById('danger-zone')?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [focusDangerZone]);
  const [formData, setFormData] = useState({
    name: 'Smile Dental Clinic',
    vertical: 'Dental Clinic',
    businessSubtype: 'General Dentistry & Orthodontics',
    taxId: 'NL-88392019B01',
    description: 'Smile Dental Clinic provides preventative checkups, cosmetic dentistry, orthodontics, and emergency appointments in central Amsterdam.',
    email: 'reception@smileclinic.com',
    phone: '+31 20 123 4567',
    emergencyPhone: '+31 6 9876 5432',
    website: 'https://www.smileclinic.com',
    country: 'Netherlands',
    address: '123 Keizersgracht, Suite 200',
    city: 'Amsterdam',
    state: 'North Holland',
    postalCode: '1015 AB',
    timezone: 'Europe/Amsterdam',
    currency: 'EUR',
    language: 'English (US)',
    dateFormat: 'DD/MM/YYYY',
  });

  const [schedule, setSchedule] = useState<DaySchedule[]>(defaultSchedule);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [businessStatus, setBusinessStatus] = useState<'active' | 'deactivated'>('active');

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setIsSaved(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setLogoPreview(url);
      setIsSaved(false);
    }
  };

  const handleRemoveLogo = () => {
    setLogoPreview(null);
    setIsSaved(false);
  };

  const toggleDay = (dayName: string) => {
    setSchedule(
      schedule.map((d) =>
        d.day === dayName
          ? { ...d, active: !d.active, ranges: d.active ? [] : [{ start: '09:00', end: '17:00' }] }
          : d
      )
    );
    setIsSaved(false);
  };

  const updateRange = (dayName: string, idx: number, field: 'start' | 'end', val: string) => {
    setSchedule(
      schedule.map((d) => {
        if (d.day === dayName) {
          const newRanges = [...d.ranges];
          newRanges[idx] = { ...newRanges[idx], [field]: val };
          return { ...d, ranges: newRanges };
        }
        return d;
      })
    );
    setIsSaved(false);
  };

  const addRange = (dayName: string) => {
    setSchedule(
      schedule.map((d) =>
        d.day === dayName ? { ...d, ranges: [...d.ranges, { start: '14:00', end: '18:00' }] } : d
      )
    );
    setIsSaved(false);
  };

  const removeRange = (dayName: string, idx: number) => {
    setSchedule(
      schedule.map((d) => {
        if (d.day === dayName) {
          return { ...d, ranges: d.ranges.filter((_, i) => i !== idx) };
        }
        return d;
      })
    );
    setIsSaved(false);
  };

  const applyPreset = (preset: 'standard' | 'extended' | 'allWeek') => {
    if (preset === 'standard') {
      setSchedule(
        schedule.map((d) =>
          d.day === 'Saturday' || d.day === 'Sunday'
            ? { ...d, active: false, ranges: [] }
            : { ...d, active: true, ranges: [{ start: '09:00', end: '17:00' }] }
        )
      );
    } else if (preset === 'extended') {
      setSchedule(
        schedule.map((d) =>
          d.day === 'Sunday'
            ? { ...d, active: false, ranges: [] }
            : { ...d, active: true, ranges: [{ start: '08:30', end: '19:00' }] }
        )
      );
    } else if (preset === 'allWeek') {
      setSchedule(
        schedule.map((d) => ({
          ...d,
          active: true,
          ranges: [{ start: '09:00', end: '18:00' }],
        }))
      );
    }
    setIsSaved(false);
  };

  const handleSave = () => {
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  return (
    <div className="space-y-4 max-w-4xl pb-8">
      {/* Toast Notification */}
      {isSaved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>All business settings and operating hours saved successfully!</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-medium">Just now</span>
        </div>
      )}

      {/* 1. Business Identity & Profile */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2.5">
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-tight">Business Profile</h3>
            <p className="text-[11px] text-gray-500">Primary business classification, branding, and description used across caller dialogues.</p>
          </div>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-[#0066FF] border border-blue-100">
            Tenant ID: biz_9942a1
          </span>
        </div>

        {/* Logo and Avatar Section */}
        <div className="flex items-center gap-3.5 mb-4 p-3 bg-gray-50/60 rounded-lg border border-gray-100">
          <div className="w-12 h-12 rounded-xl bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center text-lg font-bold tracking-tight shadow-xs overflow-hidden border border-blue-100 shrink-0">
            {logoPreview ? (
              <img src={logoPreview} alt="Business logo" className="w-full h-full object-cover" />
            ) : (
              formData.name.charAt(0) || 'B'
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <label className="px-2.5 py-1 bg-[#0066FF] text-white rounded-md text-xs font-semibold hover:bg-blue-600 transition-colors cursor-pointer shadow-2xs">
                Upload Logo
                <input type="file" accept="image/png, image/jpeg, image/webp" className="hidden" onChange={handleLogoUpload} />
              </label>
              {logoPreview && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="px-2.5 py-1 bg-white border border-gray-200 text-gray-600 rounded-md text-xs font-semibold hover:bg-gray-50 transition-colors"
                >
                  Remove
                </button>
              )}
            </div>
            <p className="text-[10px] text-gray-400">Recommended 400x400px square PNG, JPEG, or WebP (max 2MB).</p>
          </div>
        </div>

        {/* Grid Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Business Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleInputChange('name', e.target.value)}
              className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              placeholder="e.g. Smile Dental Clinic"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Business Type / Vertical <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={formData.vertical}
                onChange={(e) => handleInputChange('vertical', e.target.value)}
                className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none bg-white"
              >
                <option value="Dental Clinic">Dental Clinic</option>
                <option value="Medical Clinic">Medical Clinic</option>
                <option value="Hospital & Diagnostics">Hospital & Diagnostics</option>
                <option value="Physiotherapy & Rehab">Physiotherapy & Rehab</option>
                <option value="Salon & Spa">Salon & Spa</option>
                <option value="Restaurant & Cafe">Restaurant & Cafe</option>
                <option value="Fitness & Gym">Fitness & Gym</option>
                <option value="Veterinary Clinic">Veterinary Clinic</option>
                <option value="Professional Services">Professional Services</option>
              </select>
              <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-gray-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Sub-type / Specialization
            </label>
            <input
              type="text"
              value={formData.businessSubtype}
              onChange={(e) => handleInputChange('businessSubtype', e.target.value)}
              className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              placeholder="e.g. General Dentistry & Orthodontics"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Registration / Tax / NPI ID
            </label>
            <input
              type="text"
              value={formData.taxId}
              onChange={(e) => handleInputChange('taxId', e.target.value)}
              className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              placeholder="e.g. NL-88392019B01"
            />
          </div>
        </div>

        {/* Short Description for AI Receptionist */}
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Business Summary & Overview
            <span className="text-[10px] text-gray-400 font-normal ml-1.5">(Used by AI Receptionist to introduce your clinic and services)</span>
          </label>
          <textarea
            rows={2}
            value={formData.description}
            onChange={(e) => handleInputChange('description', e.target.value)}
            className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] resize-none"
            placeholder="Brief overview of clinic specialties, history, and patient care philosophy..."
          />
        </div>
      </div>

      {/* 2. Contact & Communications */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <div className="mb-3 border-b border-gray-100 pb-2">
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">Contact & Channels</h3>
          <p className="text-[11px] text-gray-500">Official channels for customer outreach, caller transfers, and notifications.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Primary Business Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              placeholder="reception@smileclinic.com"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Primary Phone Number <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              placeholder="+31 20 123 4567"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Emergency / Forwarding Line
              <span className="text-[10px] text-gray-400 font-normal ml-1">(AI transfer target for urgent calls)</span>
            </label>
            <input
              type="tel"
              value={formData.emergencyPhone}
              onChange={(e) => handleInputChange('emergencyPhone', e.target.value)}
              className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              placeholder="+31 6 9876 5432"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Website URL
            </label>
            <input
              type="url"
              value={formData.website}
              onChange={(e) => handleInputChange('website', e.target.value)}
              className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              placeholder="https://www.smileclinic.com"
            />
          </div>
        </div>
      </div>

      {/* 3. Location, Address & Regional Defaults */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <div className="mb-3 border-b border-gray-100 pb-2">
          <h3 className="text-sm font-bold text-gray-900 tracking-tight">Location & Regional Settings</h3>
          <p className="text-[11px] text-gray-500">Physical address for in-person visits and localization defaults for currency and timezone.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Country</label>
            <div className="relative">
              <select
                value={formData.country}
                onChange={(e) => handleInputChange('country', e.target.value)}
                className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none bg-white"
              >
                <option value="Netherlands">Netherlands</option>
                <option value="United States">United States</option>
                <option value="United Kingdom">United Kingdom</option>
                <option value="Canada">Canada</option>
                <option value="Germany">Germany</option>
                <option value="Australia">Australia</option>
                <option value="India">India</option>
              </select>
              <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-gray-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Street Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => handleInputChange('address', e.target.value)}
              className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              placeholder="123 Keizersgracht, Suite 200"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">City</label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => handleInputChange('city', e.target.value)}
              className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              placeholder="Amsterdam"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">State / Province</label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => handleInputChange('state', e.target.value)}
              className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              placeholder="North Holland"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Postal Code</label>
            <input
              type="text"
              value={formData.postalCode}
              onChange={(e) => handleInputChange('postalCode', e.target.value)}
              className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
              placeholder="1015 AB"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Timezone</label>
            <div className="relative">
              <select
                value={formData.timezone}
                onChange={(e) => handleInputChange('timezone', e.target.value)}
                className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none bg-white"
              >
                <option value="Europe/Amsterdam">Europe/Amsterdam (CET / UTC+1)</option>
                <option value="Europe/London">Europe/London (GMT / UTC+0)</option>
                <option value="America/New_York">America/New_York (EST / UTC-5)</option>
                <option value="America/Chicago">America/Chicago (CST / UTC-6)</option>
                <option value="America/Denver">America/Denver (MST / UTC-7)</option>
                <option value="America/Los_Angeles">America/Los_Angeles (PST / UTC-8)</option>
                <option value="Asia/Kolkata">Asia/Kolkata (IST / UTC+5:30)</option>
                <option value="Australia/Sydney">Australia/Sydney (AEST / UTC+10)</option>
              </select>
              <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-gray-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Currency</label>
            <div className="relative">
              <select
                value={formData.currency}
                onChange={(e) => handleInputChange('currency', e.target.value)}
                className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none bg-white"
              >
                <option value="EUR">EUR (€) - Euro</option>
                <option value="USD">USD ($) - US Dollar</option>
                <option value="GBP">GBP (£) - British Pound</option>
                <option value="INR">INR (₹) - Indian Rupee</option>
                <option value="CAD">CAD ($) - Canadian Dollar</option>
                <option value="AUD">AUD ($) - Australian Dollar</option>
              </select>
              <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-gray-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Date Format</label>
            <div className="relative">
              <select
                value={formData.dateFormat}
                onChange={(e) => handleInputChange('dateFormat', e.target.value)}
                className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none bg-white"
              >
                <option value="DD/MM/YYYY">DD/MM/YYYY (e.g. 12/08/2026)</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY (e.g. 08/12/2026)</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD (e.g. 2026-08-12)</option>
              </select>
              <div className="absolute inset-y-0 right-2.5 flex items-center pointer-events-none text-gray-500">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Operating & Business Hours */}
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3 border-b border-gray-100 pb-2.5">
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-tight">Operating & Business Hours</h3>
            <p className="text-[11px] text-gray-500">When your practice is open for bookings and when the AI handles after-hours inquiries.</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-gray-400 font-medium mr-1">Presets:</span>
            <button
              type="button"
              onClick={() => applyPreset('standard')}
              className="px-2 py-0.5 rounded border border-gray-200 text-[10px] font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              Mon-Fri (9-5)
            </button>
            <button
              type="button"
              onClick={() => applyPreset('extended')}
              className="px-2 py-0.5 rounded border border-gray-200 text-[10px] font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              Mon-Sat
            </button>
            <button
              type="button"
              onClick={() => applyPreset('allWeek')}
              className="px-2 py-0.5 rounded border border-gray-200 text-[10px] font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 transition-colors"
            >
              7 Days
            </button>
          </div>
        </div>

        <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
          {schedule.map((item) => (
            <div
              key={item.day}
              className={`flex flex-col sm:flex-row sm:items-center justify-between px-3.5 py-2.5 gap-2 transition-colors ${
                !item.active ? 'bg-gray-50/50 opacity-65' : 'bg-white'
              }`}
            >
              {/* Day & Toggle */}
              <div className="flex items-center gap-2.5 w-36 shrink-0">
                <button
                  type="button"
                  onClick={() => toggleDay(item.day)}
                  className={`relative inline-flex h-4 w-8 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none ${
                    item.active ? 'bg-[#0066FF]' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-3 w-3 transform rounded-full bg-white shadow-xs transition-transform ${
                      item.active ? 'translate-x-4' : 'translate-x-0.5'
                    }`}
                  />
                </button>
                <span className="text-xs font-semibold text-gray-900">{item.day}</span>
              </div>

              {/* Time Slots */}
              <div className="flex-1 flex flex-wrap items-center gap-2">
                {item.active ? (
                  <>
                    {item.ranges.map((range, idx) => (
                      <div key={idx} className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md border border-gray-200">
                        {idx > 0 && <span className="text-[10px] text-gray-400 font-bold mr-0.5">&amp;</span>}
                        <input
                          type="time"
                          value={range.start}
                          onChange={(e) => updateRange(item.day, idx, 'start', e.target.value)}
                          className="text-xs text-gray-900 bg-transparent focus:outline-none font-medium cursor-pointer"
                        />
                        <span className="text-[10px] text-gray-400 font-medium">to</span>
                        <input
                          type="time"
                          value={range.end}
                          onChange={(e) => updateRange(item.day, idx, 'end', e.target.value)}
                          className="text-xs text-gray-900 bg-transparent focus:outline-none font-medium cursor-pointer"
                        />
                        {item.ranges.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRange(item.day, idx)}
                            className="text-gray-400 hover:text-red-500 transition-colors ml-1 p-0.5"
                            title="Remove time range"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                          </button>
                        )}
                      </div>
                    ))}

                    {item.ranges.length < 2 && (
                      <button
                        type="button"
                        onClick={() => addRange(item.day)}
                        className="text-[11px] text-[#0066FF] font-semibold hover:underline flex items-center gap-1 px-1.5 py-0.5"
                      >
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
                        Add Split / Break
                      </button>
                    )}
                  </>
                ) : (
                  <span className="text-xs font-medium text-gray-400 italic">Closed all day</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Save / Discard Bar */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-xs text-gray-400">All changes affect AI Receptionist scheduling immediately.</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setSchedule(defaultSchedule);
              setIsSaved(false);
            }}
            className="px-3.5 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-md text-xs font-semibold hover:bg-gray-50 transition-colors shadow-2xs"
          >
            Discard
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-1.5 bg-[#0066FF] text-white rounded-md text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors flex items-center gap-1.5"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            Save Changes
          </button>
        </div>
      </div>

      {/* 5. Danger Zone Card */}
      <div id="danger-zone" className="bg-white border border-red-200 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] mt-6">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-bold text-[#EF4444] tracking-tight">Danger Zone</h3>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
            businessStatus === 'active' 
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
              : 'bg-amber-50 text-amber-700 border-amber-200'
          }`}>
            Status: {businessStatus === 'active' ? 'Active' : 'Deactivated / Paused'}
          </span>
        </div>
        <p className="text-xs text-gray-500 mb-3">Critical actions that permanently alter or disable your {STRINGS.APP.NAME} receptionist operations.</p>

        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <div>
              <h4 className="text-xs font-bold text-gray-900 mb-0.5">
                {businessStatus === 'active' ? 'Deactivate Business' : 'Reactivate Business'}
              </h4>
              <p className="text-xs text-gray-500">
                {businessStatus === 'active' 
                  ? 'Temporarily pause inbound call reception and automated scheduling without deleting tenant records.'
                  : 'Reactivate your receptionist to resume answering patient calls and syncing appointments.'}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setBusinessStatus(businessStatus === 'active' ? 'deactivated' : 'active');
              }}
              className="px-3 py-1.5 bg-white border border-[#EF4444] text-[#EF4444] rounded-md text-xs font-semibold hover:bg-red-50 transition-colors shrink-0 ml-4"
            >
              {businessStatus === 'active' ? 'Deactivate Business' : 'Reactivate Business'}
            </button>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div>
              <h4 className="text-xs font-bold text-[#EF4444] mb-0.5">Delete Business Tenant</h4>
              <p className="text-xs text-gray-500">Permanently delete this practice profile, all patient logs, voice transcripts, and API keys. This cannot be undone.</p>
            </div>
            <button
              type="button"
              onClick={() => alert('To delete this business account, please contact team support or enter your admin confirmation credentials.')}
              className="px-3 py-1.5 bg-[#EF4444] text-white rounded-md text-xs font-semibold hover:bg-red-700 shadow-xs transition-colors shrink-0 ml-4"
            >
              Delete Business
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
