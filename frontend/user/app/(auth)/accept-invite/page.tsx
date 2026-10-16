"use client";
import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';
import { AuthController } from '../../../controllers/auth.controller';

const MIN_LENGTH = 8; // same rule as the server
const INPUT =
  'w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all';

type Invite = { name: string; email: string; role: string; business_name: string | null };

function Logo() {
  return (
    <div className="flex justify-center mb-3">
      <div className="w-10 h-10 bg-[#0066FF] rounded-xl flex items-center justify-center shadow-md">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
          <path d="M12 4v16m-4-10v4m8-8v12" />
        </svg>
      </div>
    </div>
  );
}

function AcceptInviteForm() {
  const content = STRINGS.AUTH.ACCEPT_INVITE;
  const common = STRINGS.AUTH.COMMON;
  const router = useRouter();
  const token = useSearchParams().get('token') || '';
  const [invite, setInvite] = useState<Invite | null>(null);
  const [linkError, setLinkError] = useState(token ? '' : 'This invite link is missing its token. Ask the person who invited you for a new link.');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    AuthController.inviteInfo(token)
      .then(setInvite)
      .catch((err: unknown) => setLinkError(err instanceof Error ? err.message : 'This invite link is invalid or has expired.'));
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < MIN_LENGTH) return setError(`Use at least ${MIN_LENGTH} characters.`);
    if (password !== confirm) return setError('The two passwords do not match.');
    setLoading(true);
    try {
      await AuthController.acceptInvite(token, password);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not accept the invite.');
      setLoading(false);
    }
  };

  if (linkError) {
    return (
      <div className="w-full max-w-sm space-y-4 text-center">
        <Logo />
        <h2 className="text-xl font-bold text-gray-900 tracking-tight">This invite can&apos;t be used</h2>
        <p className="text-sm text-gray-600" role="alert">{linkError}</p>
        <Link href="/login" className="inline-block text-xs font-semibold text-[#0066FF] hover:underline">
          {common.BACK_TO_LOGIN}
        </Link>
      </div>
    );
  }

  if (!invite) {
    return (
      <div className="w-full max-w-sm space-y-3" aria-busy="true">
        <Logo />
        <div className="h-6 rounded bg-gray-100 animate-pulse" />
        <div className="h-4 rounded bg-gray-100 animate-pulse w-3/4 mx-auto" />
        <div className="h-24 rounded bg-gray-100 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm space-y-4">
      <Logo />
      <div className="space-y-1 text-center mb-4">
        <h2 className="text-xl font-bold text-gray-900 tracking-tight leading-snug">
          {content.TITLE_PREFIX} <span className="text-[#0066FF]">{invite.business_name || 'your clinic'}</span>
        </h2>
        <p className="text-gray-500 text-xs leading-relaxed px-2">
          Hi {invite.name}. {content.DESC} <span className="font-semibold text-gray-700">{invite.email}</span>.
        </p>
      </div>

      <form className="space-y-3" onSubmit={handleSubmit}>
        {error && <div className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</div>}
        <div className="space-y-1">
          <label htmlFor="invite-password" className="text-xs font-semibold text-gray-900">{common.PASSWORD_LABEL}</label>
          <div className="relative">
            <input
              id="invite-password"
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={STRINGS.AUTH.REGISTER.NEW_PASSWORD_PLACEHOLDER}
              autoComplete="new-password"
              className={INPUT}
              required
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                <circle cx="12" cy="12" r="3"></circle>
              </svg>
            </button>
          </div>
        </div>

        <div className="space-y-1">
          <label htmlFor="invite-confirm" className="text-xs font-semibold text-gray-900">{common.CONFIRM_PASSWORD_LABEL}</label>
          <input
            id="invite-confirm"
            type={show ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder={STRINGS.AUTH.REGISTER.CONFIRM_PASSWORD_PLACEHOLDER}
            autoComplete="new-password"
            className={INPUT}
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#0066FF] hover:bg-[#0052cc] disabled:opacity-60 text-white font-medium py-2 rounded-lg text-sm transition-colors shadow-sm mt-2"
        >
          {loading ? 'Joining...' : content.SUBMIT}
        </button>
      </form>

      <div className="flex justify-center pt-1">
        <Link href="/login" className="text-xs font-medium text-gray-500 hover:text-gray-800 underline decoration-gray-300 underline-offset-4 transition-colors">
          {content.DECLINE}
        </Link>
      </div>
    </div>
  );
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteForm />
    </Suspense>
  );
}
