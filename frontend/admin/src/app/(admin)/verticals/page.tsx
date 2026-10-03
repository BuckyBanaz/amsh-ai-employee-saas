"use client";

import { useEffect, useState } from 'react';
import { VerticalDetail, VerticalItem, fetchVertical, fetchVerticals } from '@/lib/api';
import { Card, Chip, Empty, ErrorBox, Loading, PageHeader, errorText, label } from '@/components/admin/ui';

export default function VerticalsPage() {
  const [items, setItems] = useState<VerticalItem[] | null>(null);
  const [unconfigured, setUnconfigured] = useState<{ name: string; businesses: number }[]>([]);
  const [source, setSource] = useState('');
  const [error, setError] = useState('');
  const [detail, setDetail] = useState<VerticalDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  useEffect(() => { fetchVerticals().then((d) => { setItems(d.items); setUnconfigured(d.unconfigured); setSource(d.source); }).catch((e: unknown) => setError(errorText(e, 'Could not load verticals'))); }, []);

  async function open(name: string, language: string) {
    setLoadingDetail(true);
    try { setDetail(await fetchVertical(name, language)); setError(''); } catch (e) { setError(errorText(e)); } finally { setLoadingDetail(false); }
  }

  if (error && !items) return <div className="p-5"><ErrorBox message={error} /></div>;
  if (!items) return <Loading what="verticals" />;

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-300">
      <PageHeader title="Vertical Templates" subtitle="The industry templates the AI is built from: wording, intents and tools per language.">
        <span className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs text-[#475569]">Read-only. Edit <code className="font-mono">{source}</code> and deploy.</span>
      </PageHeader>
      {error && <div className="mb-3"><ErrorBox message={error} /></div>}
      {unconfigured.length > 0 && (
        <p role="alert" className="mb-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          {unconfigured.map((u) => `${u.businesses} business${u.businesses === 1 ? '' : 'es'} use the vertical "${u.name}", which has no template`).join('; ')}. Their calls will fail until one is added.
        </p>
      )}
      {items.length === 0 ? <Card><Empty>No vertical templates are installed.</Empty></Card> : (
        <div className="grid gap-3.5 lg:grid-cols-2">
          {items.map((v) => (
            <Card key={v.name} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div><h2 className="text-sm font-bold text-[#0F172A]">{Object.values(v.languages)[0]?.display_name.replace(/\s*\([^)]*\)\s*$/, '') ?? v.name}</h2><p className="font-mono text-[11px] uppercase tracking-wide text-[#64748B]">{v.name}</p></div>
                <Chip tone="green">Live</Chip>
              </div>
              <p className="mt-2 text-xs text-[#475569]">{v.description}</p>
              <dl className="my-3 grid grid-cols-3 gap-2 text-center">
                {[['Businesses', v.businesses], ['Intents', v.intents.length], ['Tools', v.tools.length]].map(([k, n]) => (
                  <div key={String(k)} className="rounded-md border border-[#E2E8F0] bg-[#F8FAFC] p-2"><dt className="text-[10px] font-bold uppercase tracking-wide text-[#64748B]">{k}</dt><dd className="text-base font-bold text-[#0F172A]">{n}</dd></div>
                ))}
              </dl>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">Languages (open to read)</p>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(v.languages).map(([lang, info]) => (
                  <button key={lang} onClick={() => open(v.name, lang)} className="rounded-md border border-[#E2E8F0] bg-white px-2.5 py-1 text-xs font-medium text-[#334155] hover:border-[#0066FF] hover:text-[#0066FF]" title={`${info.display_name}, v${info.version}`}>{lang.toUpperCase()}</button>
                ))}
              </div>
              <p className="mt-3 text-[11px] text-[#94A3B8]">Tools: {v.tools.map(label).join(', ') || 'none'}</p>
            </Card>
          ))}
        </div>
      )}

      {(detail || loadingDetail) && (
        <Card className="mt-4 p-4">
          {loadingDetail || !detail ? <p className="text-sm text-[#475569]">Loading template...</p> : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3"><div><h2 className="text-sm font-bold text-[#0F172A]">{detail.display_name}</h2><p className="text-xs text-[#64748B]">Version {detail.version}, language {detail.language}</p></div><button className="text-xs font-medium text-[#0066FF] hover:underline" onClick={() => setDetail(null)}>Close</button></div>
              <div><p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">Greeting</p><p className="rounded-md bg-slate-50 p-3 text-sm text-[#1E293B]">{detail.greeting_template}</p></div>
              <div><p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">Instructions given to the AI</p><pre className="whitespace-pre-wrap rounded-md bg-slate-50 p-3 font-mono text-[12px] leading-relaxed text-[#1E293B]">{detail.system_prompt_template}</pre></div>
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">Intents</p>
                <ul className="divide-y divide-[#F1F5F9]">
                  {detail.intents.map((i) => (
                    <li key={i.name} className="py-2"><p className="text-sm font-medium text-[#1E293B]">{label(i.name)} {i.tool && <Chip tone="blue">{i.tool}</Chip>}</p><p className="text-xs text-[#64748B]">{i.description}</p>
                      {i.slots.length > 0 && <p className="mt-1 text-xs text-[#475569]">Asks for: {i.slots.map((s) => `${label(s.name)}${s.required ? '' : ' (optional)'}`).join(', ')}</p>}</li>
                  ))}
                </ul>
              </div>
              {detail.escalation_rules.length > 0 && <div><p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">Hands over to a person when the caller says</p><ul className="space-y-1 text-xs text-[#475569]">{detail.escalation_rules.map((r, n) => <li key={n}>{r.keywords.join(', ')} <span className="text-[#94A3B8]">({r.action}{r.target_role ? `, ${r.target_role}` : ''})</span></li>)}</ul></div>}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}
