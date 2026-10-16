"use client";
import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';
import { AuthController } from '../../../controllers/auth.controller';

const MIN_LENGTH = 8; // same rule as the server

function ResetPasswordForm() {
  const common = STRINGS.AUTH.COMMON;
  const router = useRouter();
  const token = useSearchParams().get('token') || '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`);
    if (password !== confirm) return setError('The two passwords do not match.');
    setLoading(true);
    try {
      await AuthController.resetPassword(token, password);
      setDone(true);
      setTimeout(() => router.push('/login'), 2500);
    } catch (err: any) {
      setError(err?.message || 'This reset link is invalid or has expired.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-sm text-gray-700">This reset link is missing its token.</p>
        <Link href="/forgot-password" className="text-xs font-semibold text-[#0066FF] hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-5">
      <div className="space-y-1">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Choose a new password</h2>
        <p className="text-gray-500 text-xs">At least {MIN_LENGTH} characters. This link works once.</p>
      </div>

      {done ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs text-emerald-800">
          Password updated. Taking you to sign in...
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {error}{' '}
              <Link href="/forgot-password" className="font-semibold underline">
                Request a new link
              </Link>
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-900">New password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
              required
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-semibold text-gray-900">Confirm new password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0066FF] hover:bg-[#0052cc] disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors shadow-sm"
          >
            {loading ? 'Saving...' : 'Update password'}
          </button>
        </form>
      )}

      <div className="flex justify-center pt-1">
        <Link href="/login" className="text-xs font-semibold text-[#0066FF] hover:underline">
          {common.BACK_TO_LOGIN}
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
