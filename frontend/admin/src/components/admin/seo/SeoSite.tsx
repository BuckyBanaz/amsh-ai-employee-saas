"use client";
import React, { useState } from 'react';
import { SeoGlobal, SeoOverview, saveSeoGlobal } from '@/lib/api';
import { BTN, Field, INPUT, PRIMARY, Section, Toggle } from './Fields';

type Props = { data: SeoOverview; onData: (d: SeoOverview) => void };

export function SeoSite({ data, onData }: Props) {
  const [g, setG] = useState<SeoGlobal>(data.global);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [blocked, setBlocked] = useState(data.global.disallow_paths.join('\n'));
  const [sameAs, setSameAs] = useState(data.global.organization.same_as.join('\n'));
  const set = (patch: Partial<SeoGlobal>) => setG((x) => ({ ...x, ...patch }));
  const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);

  async function save() {
    setBusy(true); setMsg(null);
    try {
      onData(await saveSeoGlobal({ ...g, disallow_paths: lines(blocked), organization: { ...g.organization, same_as: lines(sameAs) } }));
      setMsg({ ok: true, text: 'Saved. The marketing site picks it up within 5 minutes.' });
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not save' }); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-4">
      <Section title="Identity" desc="The name and address of the marketing site, and how page titles are written.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="s-name" label="Site name"><input id="s-name" className={INPUT} value={g.site_name} onChange={(e) => set({ site_name: e.target.value })} /></Field>
          <Field id="s-url" label="Site URL" hint="The public address with https, no trailing slash. Sitemap and canonical links need it."><input id="s-url" className={INPUT} value={g.site_url} onChange={(e) => set({ site_url: e.target.value })} placeholder="https://amsh.ai" /></Field>
          <Field id="s-tpl" label="Title template" hint="%s becomes the page title, e.g. Pricing | AMSh."><input id="s-tpl" className={INPUT} value={g.title_template} onChange={(e) => set({ title_template: e.target.value })} /></Field>
          <Field id="s-loc" label="Locale" hint="Language and country, like en_IN."><input id="s-loc" className={INPUT} value={g.locale} onChange={(e) => set({ locale: e.target.value })} /></Field>
        </div>
      </Section>

      <Section title="Defaults for search and social" desc="Used by every page that does not set its own.">
        <div className="space-y-3">
          <Field id="s-dtitle" label="Default title"><input id="s-dtitle" className={INPUT} value={g.default_title} onChange={(e) => set({ default_title: e.target.value })} /></Field>
          <Field id="s-ddesc" label="Default description"><textarea id="s-ddesc" rows={3} className={INPUT} value={g.default_description} onChange={(e) => set({ default_description: e.target.value })} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="s-og" label="Default social sharing image URL"><input id="s-og" className={INPUT} value={g.default_og_image} onChange={(e) => set({ default_og_image: e.target.value })} placeholder="https://.../og.png" /></Field>
            <Field id="s-tw" label="Twitter / X handle"><input id="s-tw" className={INPUT} value={g.twitter_handle} onChange={(e) => set({ twitter_handle: e.target.value })} placeholder="@amsh_ai" /></Field>
          </div>
        </div>
      </Section>

      <Section title="Search engine access" desc="Controls robots.txt and the sitemap.">
        <div className="flex items-center gap-3 rounded-md bg-slate-50 px-3 py-2">
          <Toggle checked={g.index_site} onChange={(v) => set({ index_site: v })} label="Let search engines list the site" />
          <div><p className="text-xs font-semibold text-[#1E293B]">Let search engines list the site</p><p className="text-[11px] text-[#64748B]">Turn off on staging or before launch: robots.txt blocks everything and the sitemap is empty.</p></div>
        </div>
        {!g.index_site && <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">The site is currently hidden from Google and Bing.</p>}
        <div className="mt-3">
          <Field id="s-block" label="Blocked paths (one per line)" hint="Pages behind a login should stay here. Each line starts with /."><textarea id="s-block" rows={5} className={`${INPUT} font-mono text-[13px]`} value={blocked} onChange={(e) => setBlocked(e.target.value)} /></Field>
        </div>
      </Section>

      <Section title="Analytics and verification" desc="Tags added to the marketing site. Leave empty to add nothing.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="a-ga" label="Google Analytics 4 ID" hint="Looks like G-XXXXXXXXXX."><input id="a-ga" className={INPUT} value={g.analytics.ga4_id} onChange={(e) => set({ analytics: { ...g.analytics, ga4_id: e.target.value.trim() } })} placeholder="G-" /></Field>
          <Field id="a-gtm" label="Google Tag Manager ID" hint="Looks like GTM-XXXXXXX."><input id="a-gtm" className={INPUT} value={g.analytics.gtm_id} onChange={(e) => set({ analytics: { ...g.analytics, gtm_id: e.target.value.trim() } })} placeholder="GTM-" /></Field>
          <Field id="v-g" label="Google Search Console verification code"><input id="v-g" className={INPUT} value={g.verification.google} onChange={(e) => set({ verification: { ...g.verification, google: e.target.value.trim() } })} /></Field>
          <Field id="v-b" label="Bing Webmaster verification code"><input id="v-b" className={INPUT} value={g.verification.bing} onChange={(e) => set({ verification: { ...g.verification, bing: e.target.value.trim() } })} /></Field>
        </div>
      </Section>

      <Section title="Structured data (Organization)" desc="Lets search engines show your name and logo. Needs a site URL.">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field id="o-name" label="Organization name"><input id="o-name" className={INPUT} value={g.organization.name} onChange={(e) => set({ organization: { ...g.organization, name: e.target.value } })} /></Field>
          <Field id="o-logo" label="Logo URL"><input id="o-logo" className={INPUT} value={g.organization.logo_url} onChange={(e) => set({ organization: { ...g.organization, logo_url: e.target.value } })} placeholder="https://.../logo.png" /></Field>
          <Field id="o-phone" label="Support phone"><input id="o-phone" className={INPUT} value={g.organization.phone} onChange={(e) => set({ organization: { ...g.organization, phone: e.target.value } })} /></Field>
          <Field id="o-mail" label="Support email"><input id="o-mail" className={INPUT} value={g.organization.email} onChange={(e) => set({ organization: { ...g.organization, email: e.target.value } })} /></Field>
        </div>
        <div className="mt-3"><Field id="o-same" label="Social profiles (one URL per line)"><textarea id="o-same" rows={3} className={INPUT} value={sameAs} onChange={(e) => setSameAs(e.target.value)} placeholder="https://www.linkedin.com/company/..." /></Field></div>
      </Section>

      <div className="sticky bottom-0 -mx-1 flex flex-wrap items-center gap-3 border-t border-[#E2E8F0] bg-[#F8FAFC]/95 px-1 py-3 backdrop-blur">
        <button className={PRIMARY} onClick={save} disabled={busy}>{busy ? 'Saving...' : 'Save site settings'}</button>
        <button className={BTN} onClick={() => { setG(data.global); setBlocked(data.global.disallow_paths.join('\n')); setSameAs(data.global.organization.same_as.join('\n')); setMsg(null); }} disabled={busy}>Discard changes</button>
        <span role="status" className={`text-xs font-medium ${msg?.ok ? 'text-emerald-700' : 'text-red-600'}`}>{msg?.text}</span>
      </div>
    </div>
  );
}
