"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function InviteMemberModal({ isOpen, onClose }: InviteMemberModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-[500px] relative z-10 p-8 animate-in fade-in zoom-in-95 duration-200">
        
        <h2 className="text-[20px] font-extrabold text-gray-900 tracking-tight mb-1">Invite Team Member</h2>
        <p className="text-[13px] font-medium text-gray-500 mb-6">
          Provide their details below to invite them to the {STRINGS.APP.NAME} platform.
        </p>

        <form className="space-y-5">
          {/* Email */}
          <div>
            <label className="block text-[12px] font-bold text-gray-900 mb-2">Email Address</label>
            <input 
              type="email" 
              placeholder="e.g., alex@smileclinic.com" 
              className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] placeholder:text-gray-400"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-[12px] font-bold text-gray-900 mb-2">Select Role</label>
            <div className="relative">
              <select className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] appearance-none bg-white cursor-pointer">
                <option>Receptionist</option>
                <option>Doctor</option>
                <option>Admin</option>
                <option>Manager</option>
              </select>
              <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-gray-500">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-[12px] font-bold text-gray-900 mb-2">Personal Message (Optional)</label>
            <textarea 
              placeholder="Hi, please join our Smile Dental Clinic dashboard to manage calls and appointments..." 
              rows={3}
              className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-[13px] font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] placeholder:text-gray-400 resize-none"
            ></textarea>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button 
              type="button" 
              onClick={onClose}
              className="px-5 py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-[13px] font-bold hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 bg-[#0066FF] text-white rounded-lg text-[13px] font-bold hover:bg-[#0052cc] shadow-sm transition-colors"
            >
              Send Invitation
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
