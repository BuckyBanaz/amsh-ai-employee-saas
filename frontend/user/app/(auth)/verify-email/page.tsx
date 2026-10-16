"use client";
import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';
import { AuthController } from '../../../controllers/auth.controller';
import { StorageService } from '../../../services/storage.service';

type State = 'idle' | 'verifying' | 'verified' | 'failed';

function VerifyEmailContent() {
  const content = STRINGS.AUTH.VERIFY_EMAIL;
  const common = STRINGS.AUTH.COMMON;
  const token = useSearchParams().get('token') || '';
  const [state, setState] = useState<State>(token ? 'verifying' : 'idle');
  const [error, setError] = useState('');
  const [resent, setResent] = useState(false);
  const [sending, setSending] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true; // React strict mode runs effects twice in development; the link should be used once
    AuthController.verifyEmail(token)
      .then(() => setState('verified'))
      .catch((err: any) => {
        setError(err?.message || 'This verification link is invalid or has expired.');
        setState('failed');
      });
  }, [token]);

  const signedIn = typeof window !== 'undefined' && !!StorageService.getToken();

  const resend = async () => {
    setError('');
    setSending(true);
    try {
      await AuthController.sendVerification();
      setResent(true);
    } catch (err: any) {
      setError(err?.message || 'Could not send the email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const title = state === 'verified' ? 'Email verified' : state === 'verifying' ? 'Verifying...' : state === 'failed' ? 'Link problem' : content.TITLE;
  const desc =
    state === 'verified'
      ? 'Thanks, your email address is confirmed.'
      : state === 'verifying'
        ? 'One moment while we confirm your email address.'
        : state === 'failed'
          ? error
          : content.DESC;

  return (
    <div className="w-full max-w-sm space-y-5 text-center">
      <div className="flex justify-center mb-4">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center ${state === 'verified' ? 'bg-emerald-50' : state === 'failed' ? 'bg-red-50' : 'bg-blue-50'}`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={state === 'verified' ? '#059669' : state === 'failed' ? '#DC2626' : '#0066FF'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
            <polyline points="22,6 12,13 2,6"></polyline>
          </svg>
        </div>
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight">{title}</h2>
        <p className="text-gray-500 text-xs leading-relaxed">{desc}</p>
      </div>

      {state === 'verified' && (
        <Link href={signedIn ? '/dashboard' : '/login'} className="block w-full bg-[#0066FF] hover:bg-[#0052cc] text-white font-medium py-2 rounded-lg text-sm transition-colors shadow-sm mt-4">
          {signedIn ? 'Go to dashboard' : 'Sign in'}
        </Link>
      )}

      {(state === 'idle' || state === 'failed') && (
        <>
          {resent && <p className="text-xs text-emerald-600">A new link is on its way. Check your inbox and spam folder.</p>}
          {signedIn ? (
            <button
              type="button"
              onClick={resend}
              disabled={sending}
              className="w-full bg-[#0066FF] hover:bg-[#0052cc] disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors shadow-sm mt-4"
            >
              {sending ? 'Sending...' : content.SUBMIT}
            </button>
          ) : (
            <p className="text-xs text-gray-500">Sign in, then ask for a new link from this page.</p>
          )}
        </>
      )}

      <div className="flex justify-center pt-2">
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailContent />
    </Suspense>
  );
}
