"use client";

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { AlertFeed, fetchAlerts, markAlertsRead, saveAlertPrefs } from '@/lib/api';
import { BTN, Card, Chip, Empty, ErrorBox, Loading, PageHeader, Tone, errorText, when } from '@/components/admin/ui';

const LEVEL_TONE: Record<string, Tone> = { info: 'grey', success: 'green', warning: 'amber', critical: 'red' };
const DOT: Record<string, string> = { info: 'bg-slate-300', success: 'bg-emerald-500', warning: 'bg-amber-500', critical: 'bg-red-500' };

export default function AlertsPage() {
  const [feed, setFeed] = useState<AlertFeed | null>(null);
  const [category, setCategory] = useState('');
  const [error, setError] = useState('');
  const [showMute, setShowMute] = useState(false);

  const load = useCallback((cat: string) => fetchAlerts(cat || undefined).then((d) => { setFeed(d); setError(''); }).catch((e: unknown) => setError(errorText(e, 'Could not load the alerts'))), []);
  useEffect(() => { void load(category); }, [load, category]);

  async function readAll() {
    try { await markAlertsRead(); window.dispatchEvent(new Event('alerts-read')); await load(category); } catch (e) { setError(errorText(e)); }
  }
  async function toggleMute(key: string) {
    if (!feed) return;
    const next = feed.muted.includes(key) ? feed.muted.filter((m) => m !== key) : [...feed.muted, key];
    try { await saveAlertPrefs(next); if (next.includes(category)) setCategory(''); await load(category); } catch (e) { setError(errorText(e)); }
  }

  if (!feed && error) return <div className="p-5"><ErrorBox message={error} /></div>;
  if (!feed) return <Loading what="alerts" />;
  const visible = Object.keys(feed.categories).filter((k) => !feed.muted.includes(k));

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <PageHeader title="Alerts" subtitle={`Sign-ups, sign-ins, trials, plan changes, tickets and security events from the last ${feed.window_days} days.`}>
        <button className={BTN} onClick={() => setShowMute((v) => !v)}>Choose what to show</button>
        <button className={BTN} onClick={readAll} disabled={!feed.unread}>Mark all read{feed.unread ? ` (${feed.unread})` : ''}</button>
      </PageHeader>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}

      {showMute && (
        <Card className="mb-4 p-4">
          <h2 className="mb-2 text-sm font-bold text-[#0F172A]">Show these alerts</h2>
          <div className="flex flex-wrap gap-3">
            {Object.entries(feed.categories).map(([key, name]) => (
              <label key={key} className="flex items-center gap-2 text-xs font-medium text-[#475569]">
                <input type="checkbox" checked={!feed.muted.includes(key)} onChange={() => void toggleMute(key)} /> {name}
              </label>
            ))}
          </div>
          <p className="mt-2 text-[11px] text-[#94A3B8]">Only affects you. Muted alerts are hidden here and left out of the unread count.</p>
        </Card>
      )}

      {feed.attention.length > 0 && (
        <Card className="mb-4 border-red-200 p-4" >
          <h2 className="mb-2 text-sm font-bold text-[#0F172A]">Needs attention now</h2>
          <ul className="space-y-2">
            {feed.attention.map((a) => (
              <li key={a.id} className="flex items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[a.level] ?? DOT.info}`} aria-hidden="true" />
                <div className="min-w-0 flex-1"><p className="text-sm font-bold text-[#1E293B]">{a.title}</p><p className="text-sm text-[#475569]">{a.message}</p></div>
                {a.link && <Link href={a.link} className="shrink-0 text-xs font-medium text-[#0066FF] hover:underline">Open</Link>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="mb-3 flex flex-wrap gap-1.5" role="tablist" aria-label="Alert type">
        {[['', 'All'], ...visible.map((k) => [k, feed.categories[k]])].map(([key, name]) => (
          <button key={key || 'all'} role="tab" aria-selected={category === key} onClick={() => setCategory(key)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${category === key ? 'border-[#0066FF] bg-[#EFF6FF] text-[#0066FF]' : 'border-[#E2E8F0] bg-white text-[#475569] hover:bg-[#F8FAFC]'}`}>
            {name}{key && feed.counts[key] ? ` · ${feed.counts[key]}` : ''}
          </button>
        ))}
      </div>

      {feed.items.length === 0 ? <Empty>Nothing yet. New sign-ups, trials and plan changes will appear here.</Empty> : (
        <ul className="space-y-2" data-testid="alerts">
          {feed.items.map((a) => (
            <li key={a.id} className={`flex items-start justify-between gap-4 rounded-lg border bg-white p-3.5 shadow-2xs ${a.unread ? 'border-[#BFDBFE]' : 'border-[#E2E8F0]'}`}>
              <div className="flex min-w-0 items-start gap-3">
                <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[a.level] ?? DOT.info}`} aria-hidden="true" />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#1E293B]">{a.title} {a.unread && <span className="ml-1 align-middle rounded bg-[#0066FF] px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">New</span>}</p>
                  <p className="mt-0.5 text-sm text-[#475569]">{a.message}</p>
                  <div className="mt-1 flex items-center gap-2"><Chip tone={LEVEL_TONE[a.level] ?? 'grey'}>{feed.categories[a.category] ?? a.category}</Chip>{a.link && <Link href={a.link} className="text-xs font-medium text-[#0066FF] hover:underline">Open</Link>}</div>
                </div>
              </div>
              <span className="shrink-0 text-xs text-[#94A3B8]">{when(a.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
