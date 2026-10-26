"use client";
import React from 'react';

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 py-1">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 font-medium mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2.5">{action}</div>}
    </header>
  );
}

export function PrimaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`px-3.5 py-1.5 bg-[#0066FF] hover:bg-[#0052cc] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold shadow-xs transition-colors cursor-pointer ${props.className || ''}`}
    />
  );
}

export function SecondaryButton(props: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 disabled:opacity-50 text-gray-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${props.className || ''}`}
    />
  );
}

/** Loading, error (with retry) and empty states, so no page ever shows invented rows while data is missing. */
export function DataState({ loading, error, empty, emptyText, onRetry, children }: {
  loading: boolean; error: string | null; empty: boolean; emptyText: string; onRetry?: () => void; children: React.ReactNode;
}) {
  if (loading) return <div role="status" className="bg-white border border-gray-100 rounded-xl p-8 text-center text-xs text-gray-500">Loading…</div>;
  if (error) {
    return (
      <div role="alert" className="bg-red-50 border border-red-100 rounded-xl p-4 text-xs text-red-700 flex items-center justify-between gap-3">
        <span>{error}</span>
        {onRetry && <SecondaryButton onClick={onRetry}>Try again</SecondaryButton>}
      </div>
    );
  }
  if (empty) return <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center text-xs text-gray-500">{emptyText}</div>;
  return <>{children}</>;
}

export function Field({ label, htmlFor, hint, children }: { label: string; htmlFor: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={htmlFor} className="text-[11px] font-semibold text-gray-600">{label}</label>
      {children}
      {hint && <span className="text-[10px] text-gray-400">{hint}</span>}
    </div>
  );
}

export const inputClass = 'w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 bg-white';

export function StatusChip({ value }: { value: string }) {
  const tone: Record<string, string> = {
    new: 'bg-blue-50 text-blue-700', contacted: 'bg-amber-50 text-amber-700', closed: 'bg-gray-100 text-gray-600',
    completed: 'bg-green-50 text-green-700', initiated: 'bg-blue-50 text-blue-700', no_answer: 'bg-amber-50 text-amber-700',
    busy: 'bg-amber-50 text-amber-700', failed: 'bg-red-50 text-red-700', canceled: 'bg-gray-100 text-gray-600',
    no_destination: 'bg-red-50 text-red-700',
  };
  return <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${tone[value] || 'bg-gray-100 text-gray-600'}`}>{value.replace(/_/g, ' ')}</span>;
}
