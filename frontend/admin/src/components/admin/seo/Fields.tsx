"use client";
import React from 'react';

export const INPUT = 'w-full rounded-md border border-[#E2E8F0] bg-white px-3 py-2 text-sm text-[#0F172A] focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50';
export const BTN = 'rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-slate-50 disabled:opacity-50';
export const PRIMARY = 'rounded-md bg-[#0066FF] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0052CC] disabled:opacity-50';

export function Field({ label, hint, children, id }: { label: string; hint?: React.ReactNode; children: React.ReactNode; id: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-xs font-medium text-[#475569]">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-[#94A3B8]">{hint}</p>}
    </div>
  );
}

export function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-[#E2E8F0] bg-white p-4 shadow-2xs">
      <h2 className="text-sm font-bold text-[#0F172A]">{title}</h2>
      {desc && <p className="mb-3 mt-0.5 text-xs text-[#64748B]">{desc}</p>}
      <div className={desc ? '' : 'mt-3'}>{children}</div>
    </section>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)}
      className={`relative flex h-5 w-9 shrink-0 items-center rounded-full px-0.5 transition-colors ${checked ? 'bg-[#0066FF]' : 'bg-slate-300'}`}>
      <span className={`h-4 w-4 rounded-full bg-white shadow-2xs transition-transform ${checked ? 'translate-x-4' : 'translate-x-0'}`} />
    </button>
  );
}

/** Characters used out of a recommended range: grey when empty, green inside, amber outside. */
export function Counter({ value, range }: { value: number; range: [number, number] }) {
  const tone = value === 0 ? 'text-[#94A3B8]' : value >= range[0] && value <= range[1] ? 'text-emerald-600' : 'text-amber-600';
  return <span className={`text-[11px] font-medium ${tone}`}>{value} / {range[0]}-{range[1]}</span>;
}
