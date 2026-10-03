"use client";
import React, { useRef, useState } from 'react';
import { CHANNELS, EVENTS, Channel, Template, render, smsInfo } from './catalog';

const META_STYLE: Record<string, string> = {
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  rejected: 'bg-red-50 text-red-700 border-red-200',
};

export function TemplateEditor({ eventKey, channel, template, onClose, onChange }: {
  eventKey: string;
  channel: Channel;
  template: Template | undefined;
  onClose: () => void;
  onChange: (t: Template) => void;
}) {
  const event = EVENTS.find((e) => e.key === eventKey)!;
  const channelLabel = CHANNELS.find((c) => c.key === channel)!.label;
  const area = useRef<HTMLTextAreaElement>(null);
  const [lang, setLang] = useState('EN');
  const [toast, setToast] = useState('');

  const t: Template = template ?? { status: 'missing', languages: [], body: '', version: 0, updatedBy: '-', updatedAt: '-' };
  const set = (patch: Partial<Template>) => onChange({ ...t, ...patch, status: t.status === 'missing' ? 'draft' : t.status });
  const flash = (msg: string) => { setToast(msg); window.setTimeout(() => setToast(''), 2200); };

  const insert = (v: string) => {
    const el = area.current;
    const token = `{{${v}}}`;
    if (!el) return set({ body: t.body + token });
    const { selectionStart: s, selectionEnd: e } = el;
    set({ body: t.body.slice(0, s) + token + t.body.slice(e) });
    window.requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + token.length, s + token.length); });
  };

  const rendered = render(t.body);
  const sms = smsInfo(rendered);
  const unknown = Array.from(t.body.matchAll(/\{\{(\w+)\}\}/g)).map((m) => m[1]).filter((k) => !event.vars.includes(k));

  return (
    <aside className="flex flex-col rounded-lg border border-[#E2E8F0] bg-white shadow-2xs min-w-0">
      <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">{event.group} &middot; to {event.to}</p>
          <h2 className="text-sm font-bold text-[#0F172A] truncate">{event.label} <span className="font-normal text-[#475569]">on {channelLabel}</span></h2>
          <code className="text-[11px] text-[#64748B]">{event.key}</code>
        </div>
        <button onClick={onClose} aria-label="Close editor" className="rounded p-1 text-[#64748B] hover:bg-slate-100">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
        </button>
      </div>

      <div className="space-y-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-[#475569]">Language</span>
          {['EN', 'HI'].map((l) => (
            <button key={l} onClick={() => setLang(l)} className={`rounded-md border px-2.5 py-1 text-xs font-medium ${lang === l ? 'border-[#0066FF] bg-blue-50 text-[#0066FF]' : 'border-[#E2E8F0] text-[#475569] hover:bg-slate-50'}`}>
              {l === 'EN' ? 'English' : 'Hindi'}{t.languages.includes(l) ? '' : ' (not written)'}
            </button>
          ))}
          {channel === 'whatsapp' && t.meta && (
            <span className={`ml-auto rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${META_STYLE[t.meta]}`}>Meta: {t.meta}</span>
          )}
        </div>

        {channel === 'email' && (
          <label className="block">
            <span className="text-xs font-medium text-[#475569]">Subject</span>
            <input value={t.subject ?? ''} onChange={(e) => set({ subject: e.target.value })} className="mt-1 w-full rounded-md border border-[#E2E8F0] px-3 py-2 text-sm text-[#0F172A] focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-blue-100" />
          </label>
        )}

        <div>
          <label htmlFor="tpl-body" className="text-xs font-medium text-[#475569]">Message</label>
          <textarea id="tpl-body" ref={area} value={t.body} onChange={(e) => set({ body: e.target.value })} rows={6} placeholder="Write the message. Use the variables below." className="mt-1 w-full resize-y rounded-md border border-[#E2E8F0] px-3 py-2 font-mono text-[13px] leading-relaxed text-[#0F172A] focus:border-[#0066FF] focus:outline-none focus:ring-2 focus:ring-blue-100" />
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B]">
            <span>{channel === 'sms' ? `${sms.len} characters, ${sms.segments} SMS segment${sms.segments > 1 ? 's' : ''}${sms.unicode ? ' (unicode)' : ''}` : `${rendered.length} characters`}</span>
            {unknown.length > 0 && <span className="font-medium text-red-600">Unknown variable: {unknown.join(', ')}</span>}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-[#475569]">Variables for this event</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {event.vars.map((v) => (
              <button key={v} onClick={() => insert(v)} className="rounded-full border border-[#E2E8F0] bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-[#334155] hover:border-[#0066FF] hover:text-[#0066FF]">{`{{${v}}}`}</button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-[#475569]">Preview with a sample patient</p>
          <div className={`mt-1.5 rounded-lg p-3 ${channel === 'whatsapp' ? 'bg-[#E7F3EA]' : 'bg-slate-50 border border-[#E2E8F0]'}`}>
            {channel === 'email' && <p className="mb-2 border-b border-[#E2E8F0] pb-2 text-xs font-semibold text-[#0F172A]">{render(t.subject ?? '') || <span className="font-normal text-[#94A3B8]">No subject</span>}</p>}
            {channel === 'push' && <p className="mb-1 text-[11px] font-semibold text-[#64748B]">AMSh notification</p>}
            <p className={`whitespace-pre-wrap text-[13px] leading-relaxed text-[#0F172A] ${channel === 'whatsapp' ? 'max-w-[85%] rounded-lg rounded-tl-none bg-white p-2.5 shadow-2xs' : ''}`}>
              {rendered || <span className="text-[#94A3B8]">Nothing written yet.</span>}
            </p>
          </div>
        </div>

        {channel === 'sms' && (
          <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-[#475569]">Regulator template id (India DLT): <code className="font-mono text-[#0F172A]">{t.dltId ?? 'not set'}</code></p>
        )}
        {channel === 'whatsapp' && (
          <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-[#475569]">Outside the 24-hour window only an approved Meta template is sent. Variables map to {'{{1}}'}, {'{{2}}'}. If this one is not approved, the next channel is used.</p>
        )}

        <div className="border-t border-[#E2E8F0] pt-3">
          <p className="text-xs font-medium text-[#475569]">Version history</p>
          <ul className="mt-1.5 space-y-1 text-xs text-[#64748B]">
            {t.version === 0 ? <li>No versions yet.</li> : Array.from({ length: Math.min(t.version, 3) }, (_, i) => t.version - i).map((v, i) => (
              <li key={v} className="flex items-center justify-between">
                <span>v{v}{i === 0 ? ' (current)' : ''} &middot; {i === 0 ? t.updatedBy : 'Parikshit'}, {i === 0 ? t.updatedAt : 'earlier'}</span>
                {i > 0 && <button onClick={() => flash(`Restore v${v}: design preview`)} className="font-medium text-[#0066FF] hover:underline">Restore</button>}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[#E2E8F0] bg-slate-50/60 px-4 py-3">
        <button onClick={() => flash('Test sent: design preview')} className="rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-slate-50">Send test to me</button>
        {channel === 'whatsapp' && <button onClick={() => { set({ meta: 'pending' }); flash('Submitted to Meta: design preview'); }} className="rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-slate-50">Submit for approval</button>}
        <span className="ml-auto text-xs font-medium text-emerald-700" role="status">{toast}</span>
        <button onClick={() => onChange({ ...t, status: 'draft' })} className="rounded-md border border-[#E2E8F0] bg-white px-3 py-1.5 text-xs font-medium text-[#334155] hover:bg-slate-50">Save draft</button>
        <button onClick={() => { onChange({ ...t, status: 'active', version: t.version + 1, updatedBy: 'You', updatedAt: 'Just now' }); flash('Activated: design preview'); }} className="rounded-md bg-[#0066FF] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0052CC]">Activate</button>
      </div>
    </aside>
  );
}
