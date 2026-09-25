"use client";
import React, { useState } from 'react';

interface NewStaffModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    role: string;
    specialty?: string;
    email?: string;
    phone?: string;
  }) => Promise<void>;
}

export function NewStaffModal({ isOpen, onClose, onSubmit }: NewStaffModalProps) {
  const [name, setName] = useState('');
  const [role, setRole] = useState('DOCTOR');
  const [specialty, setSpecialty] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please provide staff / doctor name.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        name: name.trim(),
        role: role,
        specialty: specialty.trim() || 'General Practice',
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      });
      setName('');
      setSpecialty('');
      setEmail('');
      setPhone('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save staff member');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
          <div>
            <h2 className="text-base font-bold text-gray-900">Add Doctor / Staff</h2>
            <p className="text-xs text-gray-500 mt-0.5">Register staff member for AI appointment matching</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Dr. Sarah Wilson"
              className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-colors"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] bg-white cursor-pointer"
              >
                <option value="DOCTOR">Doctor</option>
                <option value="SPECIALIST">Specialist</option>
                <option value="RECEPTIONIST">Receptionist</option>
                <option value="STAFF">General Staff</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Specialty</label>
              <input
                type="text"
                value={specialty}
                onChange={(e) => setSpecialty(e.target.value)}
                placeholder="e.g. Orthodontics"
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. doctor@clinic.com"
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  <span>Saving...</span>
                </>
              ) : (
                <span>Add Member</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
