"use client";
import React, { useState, useEffect } from 'react';
import { ServiceItem } from '../../controllers/dashboard.controller';

interface ServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (serviceData: {
    title: string;
    description?: string;
    duration_minutes?: number;
    price_amount?: number;
    price_currency?: string;
  }) => Promise<void>;
  editingService?: ServiceItem | null;
}

export function ServiceModal({ isOpen, onClose, onSave, editingService }: ServiceModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [priceAmount, setPriceAmount] = useState<number | ''>(50);
  const [priceCurrency, setPriceCurrency] = useState('USD');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingService) {
      setTitle(editingService.title || '');
      setDescription(editingService.description || '');
      setDurationMinutes(editingService.duration_minutes || 30);
      setPriceAmount(editingService.price_amount ?? 0);
      setPriceCurrency(editingService.price_currency || 'USD');
    } else {
      setTitle('');
      setDescription('');
      setDurationMinutes(30);
      setPriceAmount(50);
      setPriceCurrency('USD');
    }
    setError(null);
  }, [editingService, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Service title is required.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        duration_minutes: Number(durationMinutes) || 30,
        price_amount: priceAmount === '' ? undefined : Number(priceAmount),
        price_currency: priceCurrency,
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save service. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-gray-100 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-white">
          <div>
            <h2 className="text-base font-extrabold text-gray-900 tracking-tight">
              {editingService ? 'Edit Service' : 'Add New Service'}
            </h2>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              {editingService
                ? 'Update pricing, duration, or details for this service.'
                : 'Define a service offering for callers and appointments.'}
            </p>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 flex items-center justify-center transition-colors cursor-pointer"
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
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Service Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Dental Checkup & Cleaning"
              className="w-full border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what is included in this service..."
              className="w-full border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Duration (Minutes)
              </label>
              <select
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] bg-white transition-all"
              >
                <option value={15}>15 minutes</option>
                <option value={30}>30 minutes</option>
                <option value={45}>45 minutes</option>
                <option value={60}>60 minutes (1 hour)</option>
                <option value={90}>90 minutes (1.5 hours)</option>
                <option value={120}>120 minutes (2 hours)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Price Amount
              </label>
              <div className="flex gap-2">
                <select
                  value={priceCurrency}
                  onChange={(e) => setPriceCurrency(e.target.value)}
                  className="w-20 border border-gray-200 rounded-lg py-2 px-2 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] bg-white transition-all font-semibold"
                >
                  <option value="USD">USD ($)</option>
                  <option value="INR">INR (₹)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                </select>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={priceAmount}
                  onChange={(e) => setPriceAmount(e.target.value === '' ? '' : Number(e.target.value))}
                  placeholder="0.00"
                  className="flex-1 border border-gray-200 rounded-lg py-2 px-3 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all"
                />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 bg-[#0066FF] hover:bg-[#0052cc] text-white rounded-lg text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <span className="w-3 h-3 rounded-full border-2 border-white/30 border-t-white animate-spin"></span>
                  Saving...
                </>
              ) : editingService ? (
                'Save Changes'
              ) : (
                'Create Service'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
