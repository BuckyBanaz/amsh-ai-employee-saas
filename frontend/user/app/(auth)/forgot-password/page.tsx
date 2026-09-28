"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { STRINGS } from '../../../utils/strings/en';
import { AuthController } from '../../../controllers/auth.controller';

export default function ForgotPasswordPage() {
  const content = STRINGS.AUTH.FORGOT_PASSWORD;
  const common = STRINGS.AUTH.COMMON;
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await AuthController.forgotPassword(email.trim());
      setSent(true); // the server answers the same for unknown emails, so this never reveals who has an account
    } catch (err: any) {
      setError(err?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-sm space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{content.TITLE}</h2>
        <p className="text-gray-500 text-xs">{content.DESC}</p>
      </div>

      {sent ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-800 leading-relaxed">
          If <span className="font-semibold">{email}</span> has an account, a reset link is on its way. It is valid for 30 minutes
          and works once. Check your spam folder if it does not arrive.
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-900">{common.EMAIL_LABEL}</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={common.EMAIL_PLACEHOLDER}
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0066FF] hover:bg-[#0052cc] disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors shadow-sm"
          >
            {loading ? 'Sending...' : content.SUBMIT}
          </button>
        </form>
      )}

      <div className="flex justify-center pt-1">
        <Link href="/login" className="flex items-center gap-2 text-xs font-semibold text-[#0066FF] hover:underline">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          {common.BACK_TO_LOGIN}
        </Link>
      </div>
    </div>
  );
}
