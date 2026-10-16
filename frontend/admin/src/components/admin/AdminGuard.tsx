"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { adminAuth, adminFetch, AdminUser } from '../../lib/api';

/** Renders the portal only for a signed-in platform admin. The server re-checks every request; this just avoids showing the shell. */
export function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    if (!adminAuth.getToken()) {
      router.replace('/login');
      return;
    }
    adminFetch<AdminUser>('/admin/auth/me')
      .then((user) => {
        if (cancelled) return;
        adminAuth.setSession(adminAuth.getToken() as string, user); // keep the name and role fresh
        setReady(true);
      })
      .catch(() => {
        if (cancelled) return;
        adminAuth.clear();
        router.replace('/login');
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!ready) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F8FAFC]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#2563EB]/20 border-t-[#2563EB]" aria-label="Checking your session" />
      </div>
    );
  }
  return <>{children}</>;
}
