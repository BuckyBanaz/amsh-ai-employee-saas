"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminAuth, adminFetch, AdminUser } from '../../lib/api';

interface LoginResponse {
  access_token: string;
  user: AdminUser;
}

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (adminAuth.getToken()) router.replace('/dashboard'); // already signed in (the guard sends stale sessions back here)
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await adminFetch<LoginResponse>('/admin/auth/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email: email.trim(), password }),
      });
      adminAuth.setSession(res.access_token, res.user);
      router.replace('/dashboard');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 bg-[#F8FAFC] min-h-screen">
      <div className="w-full max-w-[360px] bg-white rounded-xl shadow-2xs border border-[#E2E8F0] p-6 space-y-5">
        {/* Header */}
        <div className="flex flex-col items-center text-center space-y-2.5">
          <div className="w-9 h-9 bg-[#2563EB] rounded-lg flex items-center justify-center shadow-2xs">
            <span className="text-white text-base font-bold">A</span>
          </div>
          <div className="space-y-0.5">
            <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">Admin Portal</h1>
            <p className="text-xs text-[#64748B]">Secure access to Amsh platform administration.</p>
          </div>
        </div>

        {/* Form */}
        <form className="space-y-3.5" onSubmit={handleSubmit}>
          {error && (
            <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </div>
          )}
          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#334155]">Admin email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              placeholder="you@amsh.ai"
              className="w-full px-3 py-1.5 rounded-md border border-[#CBD5E1] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
              required
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-[#334155]">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="••••••••••••"
              className="w-full px-3 py-1.5 rounded-md border border-[#CBD5E1] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB] focus:border-transparent transition-all"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#2563EB] hover:bg-blue-700 disabled:opacity-60 text-white font-semibold py-2 rounded-md transition-colors shadow-2xs text-xs"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <p className="text-[11px] text-[#94A3B8] text-center">Lost access? Another platform admin can reset it with the create_platform_admin command.</p>
        </form>

        {/* Footer Badge */}
        <div className="bg-[#EFF6FF] rounded-md py-1.5 flex items-center justify-center gap-1.5 text-[#2563EB]">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
          <span className="text-[11px] font-bold">Protected admin environment</span>
        </div>
      </div>
    </div>
  );
}
