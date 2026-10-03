"use client";
import React from 'react';

export interface TestAction {
  kind: 'book' | 'cancel' | 'reschedule' | 'transfer' | string;
  summary: string;
  at?: string;
}

const KIND_LABEL: Record<string, string> = { book: 'Booking', cancel: 'Cancellation', reschedule: 'Reschedule', transfer: 'Transfer' };

/**
 * Shown on every playground. The AI really talks and reads your real clinic data, but anything it books, moves, cancels
 * or transfers is only listed here: no appointment is saved, no SMS or WhatsApp is sent, no call is placed.
 */
export function TestModeBanner({ actions }: { actions: TestAction[] }) {
  return (
    <div className="rounded-xl border border-amber-200/80 bg-amber-50/70 px-3 py-2 text-xs text-amber-900" data-testid="test-mode-banner">
      <div className="flex items-center gap-2 font-bold">
        <span className="inline-flex items-center rounded-full bg-amber-200/70 px-2 py-0.5 text-[10px] uppercase tracking-wide">Test mode</span>
        <span>Nothing here is real: no booking is saved and no message is sent.</span>
      </div>
      {actions.length > 0 && (
        <ul className="mt-1.5 space-y-1" data-testid="test-actions">
          {actions.map((a, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-px shrink-0 rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-amber-800 border border-amber-200">{KIND_LABEL[a.kind] ?? a.kind}</span>
              <span className="text-amber-900/90">{a.summary}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
