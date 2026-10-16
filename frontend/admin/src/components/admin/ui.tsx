"use client";
import React from 'react';

export { BTN, INPUT, PRIMARY } from './seo/Fields';

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: string; children?: React.ReactNode }) {
  return (
    <header className="mb-4 flex flex-wrap items-center justify-between gap-2.5 border-b border-[#E2E8F0] pb-3">
      <div>
        <h1 className="text-lg font-bold leading-tight tracking-tight text-[#0F172A]">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-[#475569]">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`rounded-lg border border-[#E2E8F0] bg-white shadow-2xs ${className}`}>{children}</div>;
}

const TONES = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  blue: 'bg-blue-50 text-[#0066FF] border-blue-200',
  grey: 'bg-slate-50 text-slate-600 border-slate-200',
};
export type Tone = keyof typeof TONES;

export function Chip({ tone = 'grey', children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-bold first-letter:uppercase ${TONES[tone]}`}>{children}</span>;
}

export const PRIORITY_TONE: Record<string, Tone> = { low: 'grey', normal: 'blue', high: 'amber', urgent: 'red' };
export const STATUS_TONE: Record<string, Tone> = { open: 'blue', in_progress: 'amber', waiting: 'grey', resolved: 'green', closed: 'grey' };

export function ErrorBox({ message }: { message: string }) {
  return <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{message}</p>;
}

export function Loading({ what }: { what: string }) {
  return <div className="p-5 text-sm text-[#475569]">Loading {what}...</div>;
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-4 py-10 text-center text-sm text-[#64748B]">{children}</div>;
}

export const errorText = (e: unknown, fallback = 'Something went wrong') => (e instanceof Error ? e.message : fallback);

export function when(iso: string | null | undefined): string {
  if (!iso) return 'Never';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
}

export const label = (s: string) => s.replace(/_/g, ' ');
