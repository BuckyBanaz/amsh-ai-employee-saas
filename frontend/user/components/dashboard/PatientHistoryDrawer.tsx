"use client";
import React, { useEffect, useState } from 'react';
import { CustomerItem, DashboardController, PatientHistory } from '../../controllers/dashboard.controller';

interface PatientHistoryDrawerProps {
  patient: CustomerItem | null;
  onClose: () => void;
}

const STATUS_STYLE: Record<string, string> = {
  confirmed: 'bg-[#E6FBF3] text-[#10B981]',
  completed: 'bg-blue-50 text-[#0066FF]',
  pending: 'bg-amber-50 text-amber-600',
  cancelled: 'bg-gray-100 text-gray-500',
};

function formatDuration(seconds: number) {
  if (!seconds) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return m ? `${m}m ${s}s` : `${s}s`;
}

function formatWhen(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
}

/** Side panel with one patient's appointments and calls, read from the clinic's own records. */
export function PatientHistoryDrawer({ patient, onClose }: PatientHistoryDrawerProps) {
  const [history, setHistory] = useState<PatientHistory | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patient) return;
    let cancelled = false;
    DashboardController.getCustomerHistory(patient.id)
      .then((data) => {
        if (!cancelled) setHistory(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the history.');
      });
    return () => {
      cancelled = true;
    };
  }, [patient]);

  useEffect(() => {
    if (!patient) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [patient, onClose]);

  if (!patient) return null;
  const loading = !history && !error;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/30 backdrop-blur-xs animate-in fade-in duration-200" onClick={onClose}>
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`History of ${patient.name}`}
        className="h-full w-full max-w-md bg-white shadow-2xl border-l border-gray-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/60">
          <div className="min-w-0">
            <h2 className="text-base font-bold text-gray-900 truncate">{patient.name}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{patient.phone_number}{patient.email ? ` · ${patient.email}` : ''}</p>
          </div>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {patient.notes && (
            <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-100 text-xs text-gray-700 whitespace-pre-wrap">{patient.notes}</div>
          )}

          {error && <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">{error}</div>}

          {loading && (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          )}

          {history && (
            <>
              <section>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                  Appointments ({history.appointments.length})
                </h3>
                {history.appointments.length === 0 ? (
                  <p className="text-xs text-gray-500">No appointments yet.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {history.appointments.map((a) => (
                      <li key={a.id} className="flex items-start justify-between gap-3 p-2.5 rounded-lg border border-gray-100">
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-gray-900 truncate">{a.service_name}</p>
                          <p className="text-[11px] text-gray-500">
                            {a.preferred_date} · {a.preferred_time} · {a.doctor_name}
                          </p>
                          <p className="text-[10px] text-gray-400 mt-0.5">via {a.channel_label}</p>
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${STATUS_STYLE[a.status] || 'bg-gray-100 text-gray-500'}`}>
                          {a.status}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>

              <section>
                <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Calls ({history.calls.length})</h3>
                {history.calls.length === 0 ? (
                  <p className="text-xs text-gray-500">No calls from this number.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {history.calls.map((c) => (
                      <li key={c.id} className="p-2.5 rounded-lg border border-gray-100">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs font-semibold text-gray-900">{formatWhen(c.started_at)}</p>
                          <span className="text-[10px] text-gray-500">
                            {formatDuration(c.duration_seconds)} · {c.outcome}
                          </span>
                        </div>
                        {(c.summary || c.intent) && <p className="text-[11px] text-gray-500 mt-0.5">{c.summary || c.intent}</p>}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}
