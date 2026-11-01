"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { DashboardController, type CallLogItem } from '../../controllers/dashboard.controller';

// One fetch per call while the page is open: hovering the same enquiry again shows it at once.
const cache = new Map<string, Promise<CallLogItem | null>>();
const loadCall = (callId: string) => {
  if (!cache.has(callId)) cache.set(callId, DashboardController.getCallDetail(callId));
  return cache.get(callId)!;
};

const isAI = (role: string) => role === 'assistant' || role === 'ai';
const WIDTH = 420;

/** The call an enquiry came from, shown on hover (or focus / tap): summary, intent and the whole transcript. */
export default function ConversationPreview({ callId, callerName, children }: { callId: string; callerName: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [call, setCall] = useState<CallLogItem | null | undefined>(undefined);
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number }>({ top: 0, left: 0, maxHeight: 400 });
  const anchor = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const place = useCallback(() => {
    const r = anchor.current?.getBoundingClientRect();
    if (!r) return;
    const width = Math.min(WIDTH, window.innerWidth - 32);
    const left = Math.max(16, Math.min(r.left, window.innerWidth - width - 16));
    const below = window.innerHeight - r.bottom - 16;
    const above = r.top - 16;
    // Fixed, not absolute: the table scrolls sideways and would clip a popover inside it.
    setPos(below >= 260 || below >= above
      ? { top: r.bottom + 6, left, maxHeight: Math.max(200, below) }
      : { top: Math.max(16, r.top - Math.min(480, above) - 6), left, maxHeight: Math.min(480, above) });
  }, []);

  const show = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      place();
      setOpen(true);
      loadCall(callId).then(setCall);
    }, 200);
  }, [callId, place]);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 250);  // time to move the pointer onto the popover and scroll it
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    const onMove = () => place();
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onMove);
    window.addEventListener('scroll', onMove, true);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onMove);
      window.removeEventListener('scroll', onMove, true);
    };
  }, [open, place]);

  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);

  const messages = [...(call?.messages || [])].sort((a, b) => a.sequence - b.sequence);

  return (
    <div ref={anchor} onMouseEnter={show} onMouseLeave={hide} onFocus={show} onBlur={hide}>
      {children}
      <button
        type="button"
        onClick={() => (open ? setOpen(false) : show())}
        aria-expanded={open}
        className="mt-1 text-[10px] font-semibold text-[#0066FF] hover:underline cursor-pointer"
      >
        View conversation
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Call conversation"
          onMouseEnter={show}
          onMouseLeave={hide}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: Math.min(WIDTH, typeof window !== 'undefined' ? window.innerWidth - 32 : WIDTH), maxHeight: pos.maxHeight }}
          className="z-50 flex flex-col bg-white border border-gray-200 rounded-xl shadow-xl text-xs overflow-hidden"
        >
          {call === undefined ? (
            <p className="p-4 text-gray-500">Loading conversation...</p>
          ) : call === null ? (
            <p className="p-4 text-gray-500">The call for this enquiry could not be loaded.</p>
          ) : (
            <>
              <div className="p-3 border-b border-gray-100 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[10px] font-semibold text-gray-500">
                  {call.intent && <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{call.intent}</span>}
                  {call.sentiment && <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{call.sentiment}</span>}
                  {call.started_at && <span>{new Date(call.started_at).toLocaleString()}</span>}
                  {call.duration_seconds > 0 && <span>· {Math.round(call.duration_seconds / 60)} min</span>}
                </div>
                {call.summary && <p className="text-gray-700 leading-relaxed">{call.summary}</p>}
              </div>
              <div className="p-3 space-y-2 overflow-y-auto">
                {messages.length === 0 ? (
                  <p className="text-gray-500">No transcript was saved for this call.</p>
                ) : messages.map((m) => (
                  <div key={m.id} className={isAI(m.role) ? 'pr-6' : 'pl-6'}>
                    <div className="text-[10px] font-semibold text-gray-400">{isAI(m.role) ? 'AI receptionist' : callerName || 'Caller'}</div>
                    <div className={`mt-0.5 px-2.5 py-1.5 rounded-lg leading-relaxed whitespace-pre-wrap ${isAI(m.role) ? 'bg-gray-50 text-gray-800' : 'bg-blue-50 text-gray-900'}`}>
                      {m.content}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
