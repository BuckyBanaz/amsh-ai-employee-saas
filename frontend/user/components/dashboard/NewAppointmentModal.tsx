"use client";
import React, { useState } from 'react';
import { STRINGS } from '../../utils/strings/en';

interface NewAppointmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    customer_name: string;
    phone_number: string;
    service_name: string;
    doctor_name: string;
    preferred_date: string;
    preferred_time: string;
    notes?: string;
  }) => Promise<void>;
  doctors?: Array<{ id: string; name: string }>;
  services?: Array<{ id: string; title: string }>;
}

export function NewAppointmentModal({
  isOpen,
  onClose,
  onSubmit,
  doctors = [],
  services = [],
}: NewAppointmentModalProps) {
  const today = new Date().toISOString().split('T')[0];

  const [customerName, setCustomerName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [serviceName, setServiceName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [preferredDate, setPreferredDate] = useState(today);
  const [preferredTime, setPreferredTime] = useState('10:00 AM');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !phoneNumber.trim()) {
      setError('Please provide patient name and phone number.');
      return;
    }
    if (!preferredDate) {
      setError('Please select an appointment date.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError(null);
      await onSubmit({
        customer_name: customerName.trim(),
        phone_number: phoneNumber.trim(),
        service_name: serviceName || (services.length > 0 ? services[0].title : 'General Consultation'),
        doctor_name: doctorName || (doctors.length > 0 ? doctors[0].name : 'Duty Doctor'),
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        notes: notes.trim(),
      });
      // Reset form
      setCustomerName('');
      setPhoneNumber('');
      setServiceName('');
      setDoctorName('');
      setNotes('');
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to create appointment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultTimes = [
    '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM',
    '11:00 AM', '11:30 AM', '12:00 PM', '01:00 PM',
    '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
    '04:00 PM', '04:30 PM', '05:00 PM'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50/60">
          <div>
            <h2 className="text-base font-bold text-gray-900">New Appointment</h2>
            <p className="text-xs text-gray-500 mt-0.5">Schedule a manual clinic appointment</p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Patient Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                required
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-colors"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Service / Treatment</label>
              {services.length > 0 ? (
                <select
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] bg-white cursor-pointer"
                >
                  <option value="">Select Service...</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.title}>{s.title}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={serviceName}
                  onChange={(e) => setServiceName(e.target.value)}
                  placeholder="e.g. Consultation / Checkup"
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-colors"
                />
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Doctor / Practitioner</label>
              {doctors.length > 0 ? (
                <select
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] bg-white cursor-pointer"
                >
                  <option value="">Select Doctor / Staff...</option>
                  {doctors.map((d) => (
                    <option key={d.id} value={d.name}>{d.name}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g. Duty Doctor / Practitioner"
                  className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-colors"
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                required
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Time Slot</label>
              <select
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] bg-white cursor-pointer"
              >
                {defaultTimes.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Notes / Reason (Optional)</label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. First-time patient, requested morning slot..."
              className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-colors resize-none"
            />
          </div>

          {/* Footer Actions */}
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
                  <span>Scheduling...</span>
                </>
              ) : (
                <span>Schedule Appointment</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
