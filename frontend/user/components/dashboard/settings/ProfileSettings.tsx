"use client";
import React, { useState, useEffect } from 'react';
import { STRINGS } from '../../../utils/strings/en';
import { StorageService } from '../../../services/storage.service';

export function ProfileSettings() {
  const content = STRINGS.DASHBOARD.SETTINGS.PROFILE;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [initials, setInitials] = useState('PV');
  const [isSaved, setIsSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const user = StorageService.getUser();
    if (user) {
      const full = user.name || user.full_name || 'Parikshit Verma';
      const parts = full.trim().split(' ');
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
      setEmail(user.email || 'parikshit@amsh.ai');
      if (parts.length >= 2) {
        setInitials((parts[0][0] + parts[1][0]).toUpperCase());
      } else {
        setInitials(full.slice(0, 2).toUpperCase());
      }
    }
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const updatedName = `${firstName} ${lastName}`.trim();
      const user = StorageService.getUser();
      if (user) {
        StorageService.setUser({
          ...user,
          name: updatedName,
          full_name: updatedName,
        });
      }
      const parts = updatedName.split(' ');
      if (parts.length >= 2) {
        setInitials((parts[0][0] + parts[1][0]).toUpperCase());
      } else {
        setInitials(updatedName.slice(0, 2).toUpperCase());
      }
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-3 max-w-4xl pb-6">
      {isSaved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-2 shadow-xs animate-in fade-in slide-in-from-top-2">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
            <polyline points="22 4 12 14.01 9 11.01"></polyline>
          </svg>
          <span>Profile information updated successfully!</span>
        </div>
      )}

      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-3">{content.TITLE}</h3>
        
        <div className="flex items-center gap-3.5 mb-4">
          <div className="w-11 h-11 rounded-full bg-blue-50 border border-blue-100 text-[#0066FF] flex items-center justify-center text-sm font-extrabold tracking-tight shadow-xs">
            {initials}
          </div>
          <div>
            <div className="text-xs font-bold text-gray-900">{firstName} {lastName}</div>
            <p className="text-[11px] text-gray-500 font-medium">{email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{content.FIRST_NAME}</label>
            <input
              type="text"
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{content.LAST_NAME}</label>
            <input
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-gray-700 mb-1">{content.EMAIL}</label>
            <input
              type="email"
              disabled
              value={email}
              className="w-full border border-gray-200 bg-gray-50 rounded-md py-1.5 px-2.5 text-xs text-gray-500 cursor-not-allowed"
            />
            <p className="text-[10px] text-gray-400 mt-1">To change your login email address, contact workspace administrator.</p>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-1.5 bg-[#0066FF] text-white rounded-md text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors cursor-pointer disabled:opacity-60"
        >
          {saving ? 'Saving...' : content.SAVE}
        </button>
      </div>
    </form>
  );
}
