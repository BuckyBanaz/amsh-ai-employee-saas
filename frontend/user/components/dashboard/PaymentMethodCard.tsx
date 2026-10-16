"use client";
import React, { useState } from 'react';
import { ShimmerBlock } from '../common/ShimmerSkeleton';

export interface PaymentMethodProps {
  brand?: string;
  last4?: string;
  expMonth?: number;
  expYear?: number;
  isLoading?: boolean;
}

export function PaymentMethodCard({
  brand = "Visa",
  last4 = "4242",
  expMonth = 12,
  expYear = 2028,
  isLoading = false
}: PaymentMethodProps) {
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [cardLast4, setCardLast4] = useState(last4);
  const [cardBrand, setCardBrand] = useState(brand);
  const [isUpdating, setIsUpdating] = useState(false);
  const [successToast, setSuccessToast] = useState(false);

  // Form states for update modal
  const [formName, setFormName] = useState('Clinic Billing Administrator');
  const [formNumber, setFormNumber] = useState('•••• •••• •••• 4242');
  const [formExp, setFormExp] = useState('12/28');
  const [formCvc, setFormCvc] = useState('•••');

  if (isLoading) {
    return (
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShimmerBlock className="w-12 h-7 rounded" />
          <div className="space-y-1.5">
            <ShimmerBlock className="h-3.5 w-36 rounded" />
            <ShimmerBlock className="h-3 w-28 rounded" />
          </div>
        </div>
        <ShimmerBlock className="h-6 w-16 rounded" />
      </div>
    );
  }

  const handleSaveCard = (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    setTimeout(() => {
      // Mock saving update
      const extractedLast4 = formNumber.replace(/\D/g, '').slice(-4) || '8899';
      setCardLast4(extractedLast4);
      setCardBrand('Visa');
      setIsUpdating(false);
      setShowUpdateModal(false);
      setSuccessToast(true);
      setTimeout(() => setSuccessToast(false), 3000);
    }, 800);
  };

  return (
    <>
      <div className="bg-white border border-gray-200/80 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3.5">
          {/* Card Badge */}
          <div className="w-13 h-8 bg-blue-50/80 rounded-lg border border-blue-200 flex items-center justify-center text-[#0066FF] font-black text-xs italic tracking-wider shadow-2xs shrink-0">
            {cardBrand.toUpperCase()}
          </div>
          
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-gray-900 tracking-tight">
                {cardBrand} ending in <span className="font-mono text-gray-800">{cardLast4}</span>
              </h4>
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-100">
                Default
              </span>
            </div>
            <p className="text-[11px] font-medium text-gray-500 mt-0.5">
              Expires {String(expMonth).padStart(2, '0')}/{String(expYear).slice(-2)} • Used for auto-renewals
            </p>
          </div>
        </div>
        
        <button 
          type="button"
          onClick={() => setShowUpdateModal(true)}
          className="text-xs font-bold text-[#0066FF] hover:text-[#0052cc] bg-blue-50/50 hover:bg-blue-100/50 px-3 py-1.5 rounded-lg border border-blue-100/70 transition-colors cursor-pointer self-start sm:self-auto"
        >
          Update Card
        </button>
      </div>

      {/* Success Notification */}
      {successToast && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 animate-in fade-in duration-200">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span className="font-semibold">Payment method updated successfully! Auto-renewal will bill this card.</span>
        </div>
      )}

      {/* Update Card Modal */}
      {showUpdateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-gray-900">
                  Update Payment Method
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Enter your new card details for subscription renewals.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowUpdateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            <form onSubmit={handleSaveCard} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Name on Card
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
                  placeholder="Dr. Jane Doe"
                />
              </div>

              <div>
                <label className="block font-semibold text-gray-700 mb-1">
                  Card Number
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    className="w-full pl-3 pr-10 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent font-mono"
                    placeholder="4000 1234 5678 9010"
                  />
                  <div className="absolute right-3 top-2.5 text-gray-400">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect>
                      <line x1="1" y1="10" x2="23" y2="10"></line>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Expiration (MM/YY)
                  </label>
                  <input
                    type="text"
                    required
                    value={formExp}
                    onChange={(e) => setFormExp(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent font-mono"
                    placeholder="MM/YY"
                    maxLength={5}
                  />
                </div>
                <div>
                  <label className="block font-semibold text-gray-700 mb-1">
                    Security Code (CVC)
                  </label>
                  <input
                    type="password"
                    required
                    value={formCvc}
                    onChange={(e) => setFormCvc(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent font-mono"
                    placeholder="123"
                    maxLength={4}
                  />
                </div>
              </div>

              <div className="bg-gray-50 p-2.5 rounded-lg border border-gray-200/70 text-[11px] text-gray-500 flex items-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
                <span>Payments are encrypted with 256-bit SSL via PCI-DSS compliant gateway.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-gray-700 hover:bg-gray-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-4 py-1.5 bg-[#0066FF] hover:bg-[#0052cc] text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  {isUpdating ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Payment Method'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
