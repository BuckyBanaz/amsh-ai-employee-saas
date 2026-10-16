"use client";
import React, { useMemo, useState } from 'react';
import { SeoOverview, SeoPage, deleteSeoPage, saveSeoPage } from '@/lib/api';
import { BTN, Counter, Field, INPUT, PRIMARY, Section, Toggle } from './Fields';

type Props = { data: SeoOverview; onData: (d: SeoOverview) => void };

export function SeoPages({ data, onData }: Props) {
  const known = data.known_pages;
  const allPaths = useMemo(() => Array.from(new Set([...known.map((k) => k.path), ...Object.keys(data.pages)])), [known, data.pages]);
  const [path, setPath] = useState(allPaths[0] ?? '/landing');
  const [draft, setDraft] = useState<SeoPage>(() => ({ ...(data.pages[path] ?? {}), path }));
  const [newPath, setNewPath] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const select = (p: string) => { setPath(p); setDraft({ ...(data.pages[p] ?? {}), path: p }); setMsg(null); };
  const eff = data.effective[path];
  const g = data.global;
  const title = draft.title?.trim() ? g.title_template.replace('%s', draft.title.trim()) : g.default_title;
  const description = draft.description?.trim() || g.default_description;
  const image = draft.og_image?.trim() || g.default_og_image;
  const canonical = draft.canonical?.trim() || (g.site_url ? g.site_url + path : '');
  const host = g.site_url ? g.site_url.replace(/^https?:\/\//, '') : 'your-site.com';
  const hasOverride = path in data.pages;
  const label = known.find((k) => k.path === path)?.label ?? 'Custom page';

  async function run(fn: () => Promise<SeoOverview>, ok: string) {
    setBusy(true); setMsg(null);
    try { onData(await fn()); setMsg({ ok: true, text: ok }); } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not save' }); } finally { setBusy(false); }
  }
  const set = (patch: Partial<SeoPage>) => setDraft((d) => ({ ...d, ...patch }));

  return (
    <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
      <div className="space-y-3">
        <ul className="overflow-hidden rounded-lg border border-[#E2E8F0] bg-white shadow-2xs">
          {allPaths.map((p) => {
            const e = data.effective[p];
            return (
              <li key={p}>
                <button onClick={() => select(p)} aria-current={p === path} className={`flex w-full items-center justify-between gap-2 border-b border-[#F1F5F9] px-3 py-2.5 text-left last:border-0 hover:bg-slate-50 ${p === path ? 'bg-[#F0F7FF]' : ''}`}>
                  <span className="min-w-0"><span className="block truncate text-sm font-medium text-[#1E293B]">{known.find((k) => k.path === p)?.label ?? p}</span><span className="block truncate font-mono text-[11px] text-[#94A3B8]">{p}</span></span>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${e?.noindex ? 'bg-slate-100 text-slate-500' : p in data.pages ? 'bg-blue-50 text-[#0066FF]' : 'bg-emerald-50 text-emerald-700'}`}>{e?.noindex ? 'noindex' : p in data.pages ? 'custom' : 'default'}</span>
                </button>
              </li>
            );
          })}
        </ul>
        <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); if (newPath.startsWith('/')) { select(newPath); setNewPath(''); } }}>
          <input aria-label="New page path" value={newPath} onChange={(e) => setNewPath(e.target.value)} placeholder="/pricing" className={INPUT} />
          <button type="submit" className={BTN} disabled={!newPath.startsWith('/')}>Add</button>
        </form>
      </div>

      <div className="min-w-0 space-y-4">
        <Section title={label} desc={`Settings for ${path}. Empty fields use the site defaults.`}>
          <div className="space-y-3">
            <Field id="seo-title" label="Title" hint={<>Shown in the browser tab and as the blue link in search results. <Counter value={title.length} range={data.limits.title} /></>}>
              <input id="seo-title" className={INPUT} value={draft.title ?? ''} onChange={(e) => set({ title: e.target.value })} placeholder={g.default_title} />
            </Field>
            <Field id="seo-desc" label="Description" hint={<>The grey text under the link. <Counter value={description.length} range={data.limits.description} /></>}>
              <textarea id="seo-desc" rows={3} className={INPUT} value={draft.description ?? ''} onChange={(e) => set({ description: e.target.value })} placeholder={g.default_description} />
            </Field>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field id="seo-img" label="Social sharing image URL" hint="1200 x 630 works best on WhatsApp, LinkedIn and X.">
                <input id="seo-img" className={INPUT} value={draft.og_image ?? ''} onChange={(e) => set({ og_image: e.target.value })} placeholder={g.default_og_image || 'https://...'} />
              </Field>
              <Field id="seo-canon" label="Canonical URL" hint="Only if this page lives at another address too.">
                <input id="seo-canon" className={INPUT} value={draft.canonical ?? ''} onChange={(e) => set({ canonical: e.target.value })} placeholder={canonical || 'https://...'} />
              </Field>
              <Field id="seo-freq" label="Sitemap: change frequency">
                <select id="seo-freq" className={INPUT} value={draft.changefreq ?? 'monthly'} onChange={(e) => set({ changefreq: e.target.value })}>{data.changefreq.map((f) => <option key={f}>{f}</option>)}</select>
              </Field>
              <Field id="seo-prio" label="Sitemap: priority (0 to 1)">
                <input id="seo-prio" type="number" min={0} max={1} step={0.1} className={INPUT} value={draft.priority ?? 0.5} onChange={(e) => set({ priority: Number(e.target.value) })} />
              </Field>
            </div>
            <div className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-2">
              <Toggle checked={draft.noindex ?? !!eff?.noindex} onChange={(v) => set({ noindex: v })} label="Hide this page from search engines" />
              <div><p className="text-xs font-semibold text-[#1E293B]">Hide from search engines (noindex)</p><p className="text-[11px] text-[#64748B]">Keeps the page out of results and out of the sitemap. Use it for sign-in and thank-you pages.</p></div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#F1F5F9] pt-3">
            <button className={PRIMARY} disabled={busy} onClick={() => run(() => saveSeoPage({ ...draft, path, noindex: draft.noindex ?? !!eff?.noindex }), 'Saved')}>{busy ? 'Saving...' : 'Save page'}</button>
            {hasOverride && <button className={BTN} disabled={busy} onClick={() => run(() => deleteSeoPage(path), 'Back to the site defaults').then(() => setDraft({ path }))}>Reset to defaults</button>}
            <span role="status" className={`text-xs font-medium ${msg?.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg?.text}</span>
          </div>
        </Section>

        <Section title="How it will look" desc="Previews use what you typed here, falling back to the site defaults.">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">Google result</p>
              <div className="rounded-lg border border-[#E2E8F0] p-3">
                <p className="truncate text-xs text-[#475569]">{host}{path}</p>
                <p className="mt-0.5 line-clamp-2 text-base leading-snug text-[#1A0DAB]">{title}</p>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#4D5156]">{description}</p>
              </div>
            </div>
            <div>
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">Shared link (WhatsApp, LinkedIn, X)</p>
              <div className="overflow-hidden rounded-lg border border-[#E2E8F0]">
                <div className="flex h-28 items-center justify-center bg-slate-100 text-xs text-[#94A3B8]">
                  {image ? <span className="px-3 text-center">Image: <span className="break-all font-mono">{image}</span></span> : 'No image: the link shows without a picture'}
                </div>
                <div className="p-2.5"><p className="text-[11px] uppercase text-[#94A3B8]">{host}</p><p className="truncate text-sm font-semibold text-[#0F172A]">{title}</p><p className="line-clamp-2 text-xs text-[#64748B]">{description}</p></div>
              </div>
            </div>
          </div>
          {eff && <p className="mt-3 text-[11px] text-[#94A3B8]">Saved version: <span className="font-medium text-[#475569]">{eff.full_title}</span>{eff.noindex ? ' (hidden from search engines)' : ''}</p>}
        </Section>
      </div>
    </div>
  );
}
