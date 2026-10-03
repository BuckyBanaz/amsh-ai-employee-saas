"use client";

import { useEffect, useState } from 'react';
import { API_BASE, SeoIssue, SeoOverview, fetchSeo } from '@/lib/api';
import { SeoPages } from '@/components/admin/seo/SeoPages';
import { SeoSite } from '@/components/admin/seo/SeoSite';
import { Section } from '@/components/admin/seo/Fields';

type Tab = 'overview' | 'pages' | 'site' | 'files';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'pages', label: 'Pages' },
  { id: 'site', label: 'Site settings' },
  { id: 'files', label: 'Robots and sitemap' },
];
const LEVEL: Record<SeoIssue['level'], { label: string; chip: string }> = {
  error: { label: 'Fix now', chip: 'bg-red-50 text-red-700 border-red-200' },
  warning: { label: 'Improve', chip: 'bg-amber-50 text-amber-700 border-amber-200' },
  info: { label: 'Opportunity', chip: 'bg-slate-50 text-slate-600 border-slate-200' },
};

function scoreTone(score: number) {
  return score >= 85 ? 'text-emerald-600' : score >= 60 ? 'text-amber-600' : 'text-red-600';
}

export default function SeoPage() {
  const [tab, setTab] = useState<Tab>('overview');
  const [data, setData] = useState<SeoOverview | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSeo().then(setData).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load SEO settings'));
  }, []);

  if (error) return <div className="p-5"><p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p></div>;
  if (!data) return <div className="p-5 text-sm text-[#475569]">Loading SEO settings...</div>;

  const counts = { error: 0, warning: 0, info: 0 };
  data.health.issues.forEach((i) => { counts[i.level] += 1; });
  const tabFor = (where: string): Tab => (where === 'Site' ? 'site' : 'pages');

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <header className="mb-4 flex flex-wrap items-center justify-between gap-2.5 border-b border-[#E2E8F0] pb-3">
        <div>
          <h1 className="text-lg font-bold leading-tight tracking-tight text-[#0F172A]">SEO</h1>
          <p className="mt-0.5 text-xs text-[#475569]">How the AMSh public website appears in Google and when links are shared. Changes reach the site within 5 minutes.</p>
        </div>
        <nav className="flex gap-1 rounded-lg border border-[#E2E8F0] bg-white p-1 text-xs font-medium" aria-label="SEO sections">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} aria-current={tab === t.id} className={`rounded-md px-3 py-1.5 ${tab === t.id ? 'bg-[#0066FF] text-white' : 'text-[#475569] hover:bg-slate-50'}`}>{t.label}</button>
          ))}
        </nav>
      </header>

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
          <div className="rounded-lg border border-[#E2E8F0] bg-white p-4 text-center shadow-2xs">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">SEO health</p>
            <p className={`mt-1 text-5xl font-extrabold ${scoreTone(data.health.score)}`}>{data.health.score}</p>
            <p className="text-xs text-[#64748B]">out of 100</p>
            <dl className="mt-3 grid grid-cols-3 gap-1 text-center text-[11px]">
              <div><dt className="text-[#94A3B8]">Fix now</dt><dd className="text-base font-bold text-red-600">{counts.error}</dd></div>
              <div><dt className="text-[#94A3B8]">Improve</dt><dd className="text-base font-bold text-amber-600">{counts.warning}</dd></div>
              <div><dt className="text-[#94A3B8]">Ideas</dt><dd className="text-base font-bold text-slate-600">{counts.info}</dd></div>
            </dl>
          </div>
          <Section title="What to work on" desc="Checked against the saved settings. Fix the red items first.">
            {data.health.issues.length === 0 ? (
              <p className="text-sm text-emerald-700">Nothing to fix. The site is set up well for search.</p>
            ) : (
              <ul className="divide-y divide-[#F1F5F9] -my-1">
                {[...data.health.issues].sort((a, b) => ['error', 'warning', 'info'].indexOf(a.level) - ['error', 'warning', 'info'].indexOf(b.level)).map((i, n) => (
                  <li key={n} className="flex flex-wrap items-start gap-x-3 gap-y-1 py-2.5">
                    <span className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold ${LEVEL[i.level].chip}`}>{LEVEL[i.level].label}</span>
                    <div className="min-w-0 flex-1"><p className="text-sm text-[#1E293B]">{i.message}</p><p className="font-mono text-[11px] text-[#94A3B8]">{i.where}</p></div>
                    <button onClick={() => setTab(tabFor(i.where))} className="shrink-0 text-xs font-medium text-[#0066FF] hover:underline">Open</button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      )}

      {tab === 'pages' && <SeoPages data={data} onData={setData} />}
      {tab === 'site' && <SeoSite key={data.updated_at ?? 'new'} data={data} onData={setData} />}

      {tab === 'files' && (
        <div className="grid gap-4 lg:grid-cols-2">
          <Section title="robots.txt" desc="Tells crawlers what they may visit. Built from the site settings.">
            <pre className="overflow-x-auto rounded-md bg-slate-50 p-3 font-mono text-[12px] leading-relaxed text-[#1E293B]">{data.previews.robots_txt}</pre>
            <a className="mt-2 inline-block text-xs font-medium text-[#0066FF] hover:underline" href={`${API_BASE}/seo/robots.txt`} target="_blank" rel="noreferrer">Open the live file</a>
          </Section>
          <Section title="sitemap.xml" desc="The pages search engines are invited to list.">
            {data.previews.sitemap_urls.length === 0 ? (
              <p className="text-sm text-amber-700">The sitemap is empty: set a Site URL and let search engines list the site.</p>
            ) : (
              <ul className="space-y-1 font-mono text-[12px] text-[#1E293B]">
                {data.previews.sitemap_urls.map((u) => <li key={u.loc} className="flex justify-between gap-3"><span className="truncate">{u.loc}</span><span className="shrink-0 text-[#94A3B8]">{u.changefreq}, {u.priority}</span></li>)}
              </ul>
            )}
            <a className="mt-2 inline-block text-xs font-medium text-[#0066FF] hover:underline" href={`${API_BASE}/seo/sitemap.xml`} target="_blank" rel="noreferrer">Open the live file</a>
          </Section>
          <div className="lg:col-span-2">
            <Section title="Structured data (JSON-LD)" desc="Added to the landing page so search engines understand who you are.">
              {data.previews.json_ld ? <pre className="overflow-x-auto rounded-md bg-slate-50 p-3 font-mono text-[12px] leading-relaxed text-[#1E293B]">{JSON.stringify(data.previews.json_ld, null, 2)}</pre> : <p className="text-sm text-[#64748B]">Not generated yet: it needs a Site URL and an organization name (Site settings).</p>}
            </Section>
          </div>
        </div>
      )}
    </div>
  );
}
