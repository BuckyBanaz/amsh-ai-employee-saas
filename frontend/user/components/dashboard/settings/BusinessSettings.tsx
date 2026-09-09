"use client";
import React from 'react';
import { STRINGS } from '../../../utils/strings/en';

export function BusinessSettings() {
  return (
    <div className="space-y-6 max-w-4xl pb-10">
      
      {/* Business Information Card */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-[16px] font-extrabold text-gray-900 tracking-tight mb-6">Business Information</h3>
        
        <div className="flex items-center gap-6 mb-8">
          <div className="w-16 h-16 rounded-xl bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center text-[24px] font-black tracking-tight">
            S
          </div>
          <div>
            <div className="flex items-center gap-3 mb-1.5">
              <button className="px-4 py-1.5 bg-[#F0F7FF] text-[#0066FF] rounded-lg text-[12px] font-bold hover:bg-blue-100 transition-colors">
                Upload New
              </button>
              <button className="px-4 py-1.5 bg-white border border-gray-200 text-gray-600 rounded-lg text-[12px] font-bold hover:bg-gray-50 transition-colors">
                Remove
              </button>
            </div>
            <p className="text-[11px] font-medium text-gray-400">Supports PNG or JPEG, max size 2MB.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-[12px] font-bold text-gray-900 mb-2">Business Name</label>
            <input type="text" defaultValue="Smile Dental Clinic" className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-gray-900 mb-2">Business Type</label>
            <div className="relative">
              <select className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none bg-white">
                <option>Dental Clinic</option>
                <option>Medical Clinic</option>
                <option>Restaurant</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-gray-900 mb-2">Website</label>
            <input type="url" defaultValue="www.smileclinic.com" className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-gray-900 mb-2">Phone</label>
            <input type="tel" defaultValue="+31 20 123 4567" className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]" />
          </div>
        </div>
      </div>

      {/* Address & Timezone Card */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm">
        <h3 className="text-[16px] font-extrabold text-gray-900 tracking-tight mb-6">Address & Timezone</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-[12px] font-bold text-gray-900 mb-2">Country</label>
            <div className="relative">
              <select className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none bg-white">
                <option>Netherlands</option>
                <option>United States</option>
                <option>United Kingdom</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[12px] font-bold text-gray-900 mb-2">Address</label>
            <input type="text" defaultValue="123 Keizersgracht" className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-[12px] font-bold text-gray-900 mb-2">City</label>
            <input type="text" defaultValue="Amsterdam" className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-gray-900 mb-2">Postal Code</label>
            <input type="text" defaultValue="1015 AB" className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]" />
          </div>
          <div>
            <label className="block text-[12px] font-bold text-gray-900 mb-2">Timezone</label>
            <div className="relative">
              <select className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none bg-white">
                <option>Europe/Amsterdam</option>
                <option>America/New_York</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button className="px-6 py-2.5 bg-[#0066FF] text-white rounded-lg text-[13px] font-bold shadow-sm hover:bg-[#0052cc] transition-colors">
          Save Changes
        </button>
      </div>

      {/* Danger Zone Card */}
      <div className="bg-white border-2 border-red-200 rounded-2xl p-6 shadow-sm mt-8">
        <h3 className="text-[16px] font-extrabold text-[#EF4444] tracking-tight mb-1">Danger Zone</h3>
        <p className="text-[13px] font-medium text-gray-500 mb-6">Critical actions that permanently alter or disable your {STRINGS.APP.NAME} setup.</p>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-6">
            <div>
              <h4 className="text-[14px] font-bold text-gray-900 mb-1">Deactivate Business</h4>
              <p className="text-[13px] font-medium text-gray-500">Temporarily disable your business and pause the AI receptionist.</p>
            </div>
            <button className="px-5 py-2.5 bg-white border border-[#EF4444] text-[#EF4444] rounded-lg text-[13px] font-bold hover:bg-red-50 transition-colors shrink-0 ml-4">
              Deactivate Business
            </button>
          </div>
          
          <div className="flex items-center justify-between pt-2">
            <div>
              <h4 className="text-[14px] font-bold text-[#EF4444] mb-1">Delete Business</h4>
              <p className="text-[13px] font-medium text-gray-500">Permanently delete your business and all associated call logs, calendars, and AI receptionist data. This action is irreversible.</p>
            </div>
            <button className="px-5 py-2.5 bg-[#EF4444] text-white rounded-lg text-[13px] font-bold hover:bg-red-700 shadow-sm transition-colors shrink-0 ml-4">
              Delete Business
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
