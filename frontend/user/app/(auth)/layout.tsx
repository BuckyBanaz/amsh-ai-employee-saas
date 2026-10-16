import React from 'react';
import { Sora } from 'next/font/google';
import AuthShowcase from '../../components/landing/AuthShowcase';

const sora = Sora({ subsets: ['latin'], variable: '--font-display', display: 'swap' });

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${sora.variable} flex min-h-screen bg-white`}>
      {/* Brand + live product showcase */}
      <aside className="hidden lg:block lg:w-1/2 lg:sticky lg:top-0 lg:h-screen">
        <AuthShowcase />
      </aside>

      {/* Forms */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-8">
        {children}
      </div>
    </div>
  );
}
