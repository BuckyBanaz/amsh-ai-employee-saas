"use client";
import React, { useEffect, useState } from 'react';
import { ApiService } from '../../services/api.service';
import { BASE_URL } from '../../utils/api_endpoints';

interface Notice {
  id: string;
  title: string;
  body: string;
  level: 'info' | 'feature' | 'warning' | 'critical';
}

const STYLE: Record<Notice['level'], string> = {
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  feature: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
  critical: 'border-red-200 bg-red-50 text-red-900',
};
const KEY = 'amsh_dismissed_notices';

function dismissed(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || '[]') as string[];
  } catch {
    return [];
  }
}

/** Notices from AMSh (admin portal > Announcements). A person can hide one on this browser; critical notices cannot be hidden. */
export function AnnouncementBanner() {
  const [notices, setNotices] = useState<Notice[]>([]);

  useEffect(() => {
    let cancelled = false;
    ApiService.get<{ items: Notice[] }>(`${BASE_URL}/announcements`)
      .then((d) => { if (!cancelled) setNotices(d.items.filter((n) => n.level === 'critical' || !dismissed().includes(n.id))); })
      .catch(() => undefined); // a notice is never worth an error on the dashboard
    return () => { cancelled = true; };
  }, []);

  if (notices.length === 0) return null;
  const hide = (id: string) => {
    try { localStorage.setItem(KEY, JSON.stringify([...dismissed(), id])); } catch { /* storage unavailable: the notice just comes back next time */ }
    setNotices((all) => all.filter((n) => n.id !== id));
  };

  return (
    <div className="space-y-2 px-3.5 pt-3 sm:px-6 lg:px-8" aria-label="Announcements">
      {notices.map((n) => (
        <div key={n.id} role={n.level === 'critical' ? 'alert' : 'status'} className={`flex items-start gap-3 rounded-lg border px-3.5 py-2.5 text-sm ${STYLE[n.level]}`}>
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{n.title}</p>
            {n.body && <p className="mt-0.5 whitespace-pre-wrap text-[13px] opacity-90">{n.body}</p>}
          </div>
          {n.level !== 'critical' && <button onClick={() => hide(n.id)} aria-label={`Hide: ${n.title}`} className="shrink-0 rounded px-1.5 text-lg leading-none opacity-60 hover:opacity-100">&times;</button>}
        </div>
      ))}
    </div>
  );
}
