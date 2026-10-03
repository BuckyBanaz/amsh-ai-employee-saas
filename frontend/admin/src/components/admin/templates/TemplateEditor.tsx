"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { TemplateCell, TemplatePreview, TemplateRow, fetchTemplateCell, previewTemplate, resetTemplate, restoreTemplate, saveTemplate } from '@/lib/api';
import { BTN, Chip, ErrorBox, INPUT, PRIMARY, errorText, label, when } from '@/components/admin/ui';
import type { Tone } from '@/components/admin/ui';

const META_TONE: Record<string, Tone> = { approved: 'green', pending: 'amber', rejected: 'red' };
const CHANNEL_NAME: Record<string, string> = { email: 'Email', sms: 'SMS', whatsapp: 'WhatsApp', push: 'In-app' };

export function TemplateEditor({ eventKey, channel, onClose, onChanged }: { eventKey: string; channel: string; onClose: () => void; onChanged: () => void }) {
  const [cell, setCell] = useState<TemplateCell | null>(null);
  const [error, setError] = useState('');
  const [lang, setLang] = useState('en');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [dlt, setDlt] = useState('');
  const [waName, setWaName] = useState('');
  const [preview, setPreview] = useState<TemplatePreview | null>(null);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);

  const fill = useCallback((c: TemplateCell, language: string) => {
    const row: TemplateRow | undefined = c.own[language];
    const fallback = !row ? (language === 'en' ? c.default : null) : null;
    setSubject(row?.subject ?? fallback?.subject ?? '');
    setBody(row?.body ?? fallback?.body ?? '');
    setDlt(row?.sms_template_id ?? '');
    setWaName(row?.whatsapp_name ?? '');
  }, []);

  const load = useCallback(async (language?: string) => {
    try {
      const c = await fetchTemplateCell(eventKey, channel);
      setCell(c);
      const l = language ?? (c.own.en ? 'en' : Object.keys(c.own)[0] ?? 'en');
      setLang(l);
      fill(c, l);
      setError('');
    } catch (e) { setError(errorText(e, 'Could not load the template')); }
  }, [eventKey, channel, fill]);

  useEffect(() => { void load(); }, [load]);

  // Live preview from the server (it knows the sample patient and counts SMS segments), debounced while typing.
  useEffect(() => {
    if (!cell) return;
    const t = window.setTimeout(() => { previewTemplate(eventKey, channel, { subject, body }).then(setPreview).catch(() => setPreview(null)); }, 250);
    return () => window.clearTimeout(t);
  }, [cell, eventKey, channel, subject, body]);

  const row = cell?.own[lang];
  const isDefault = !row;
  const insert = (v: string) => {
    const el = area.current; const token = `{{${v}}}`;
    if (!el) { setBody((b) => b + token); return; }
    const { selectionStart: s, selectionEnd: e } = el;
    setBody(body.slice(0, s) + token + body.slice(e));
    window.requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + token.length, s + token.length); });
  };

  async function run(fn: () => Promise<unknown>, ok: string) {
    setBusy(true); setNote(''); setError('');
    try { await fn(); setNote(ok); await load(lang); onChanged(); } catch (e) { setError(errorText(e)); } finally { setBusy(false); }
  }
  const save = (status: 'draft' | 'active') => run(() => saveTemplate(eventKey, channel, { language: lang, subject: channel === 'email' ? subject : null, body, status, sms_template_id: channel === 'sms' ? dlt || null : null, whatsapp_name: channel === 'whatsapp' ? waName || null : null }), status === 'active' ? 'Activated.' : 'Saved as a draft.');

  if (!cell) return <aside className="rounded-lg border border-[#E2E8F0] bg-white p-4 text-sm text-[#475569] shadow-2xs">{error ? <ErrorBox message={error} /> : 'Loading template...'}</aside>;
  const unknown = preview?.unknown_variables ?? [];

  return (
    <aside className="flex min-w-0 flex-col rounded-lg border border-[#E2E8F0] bg-white shadow-2xs">
      <div className="flex items-start justify-between gap-3 border-b border-[#E2E8F0] px-4 py-3">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#94A3B8]">To {cell.to}</p>
          <h2 className="truncate text-sm font-bold text-[#0F172A]">{cell.label} <span className="font-normal text-[#475569]">on {CHANNEL_NAME[channel]}</span></h2>
          <code className="text-[11px] text-[#64748B]">{cell.event_key}</code>
        </div>
        <button onClick={onClose} aria-label="Close editor" className="rounded p-1 text-[#64748B] hover:bg-slate-100"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg></button>
      </div>

      <div className="space-y-4 p-4">
        {error && <ErrorBox message={error} />}
        <div className="flex flex-wrap items-center gap-2">
          <label htmlFor="tpl-lang" className="text-xs font-medium text-[#475569]">Language</label>
          <select id="tpl-lang" className={`${INPUT} !w-auto !py-1 text-xs`} value={lang} onChange={(e) => { setLang(e.target.value); fill(cell, e.target.value); setNote(''); }}>
            {cell.languages.map((l) => <option key={l} value={l}>{l.toUpperCase()}{cell.own[l] ? '' : l === 'en' && cell.default ? ' (built-in default)' : ' (not written)'}</option>)}
          </select>
          {row && <Chip tone={row.status === 'active' ? 'green' : 'amber'}>{row.status}</Chip>}
          {isDefault && <Chip tone="grey">Using the built-in text</Chip>}
          {channel === 'whatsapp' && row?.meta_status && <Chip tone={META_TONE[row.meta_status]}>Meta: {row.meta_status}</Chip>}
        </div>

        {channel === 'email' && <label className="block text-xs font-medium text-[#475569]">Subject<input className={`${INPUT} mt-1`} value={subject} onChange={(e) => setSubject(e.target.value)} /></label>}

        <div>
          <label htmlFor="tpl-body" className="text-xs font-medium text-[#475569]">Message</label>
          <textarea id="tpl-body" ref={area} rows={6} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the message. Use the variables below." className={`${INPUT} mt-1 resize-y font-mono text-[13px] leading-relaxed`} />
          <div className="mt-1 flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#64748B]">
            <span>{channel === 'sms' && preview?.sms ? `${preview.sms.characters} characters, ${preview.sms.segments} SMS segment${preview.sms.segments > 1 ? 's' : ''}${preview.sms.unicode ? ' (unicode)' : ''}` : `${(preview?.body ?? body).length} characters`}</span>
            {unknown.length > 0 && <span className="font-medium text-red-600">Unknown variable: {unknown.join(', ')}</span>}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-[#475569]">Variables for this event</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">{cell.variables.map((v) => <button key={v} onClick={() => insert(v)} className="rounded-full border border-[#E2E8F0] bg-slate-50 px-2.5 py-1 font-mono text-[11px] text-[#334155] hover:border-[#0066FF] hover:text-[#0066FF]">{`{{${v}}}`}</button>)}</div>
        </div>

        <div>
          <p className="text-xs font-medium text-[#475569]">Preview with a sample patient</p>
          <div className={`mt-1.5 rounded-lg p-3 ${channel === 'whatsapp' ? 'bg-[#E7F3EA]' : 'border border-[#E2E8F0] bg-slate-50'}`}>
            {channel === 'email' && <p className="mb-2 border-b border-[#E2E8F0] pb-2 text-xs font-semibold text-[#0F172A]">{preview?.subject || <span className="font-normal text-[#94A3B8]">No subject</span>}</p>}
            <p className={`whitespace-pre-wrap text-[13px] leading-relaxed text-[#0F172A] ${channel === 'whatsapp' ? 'max-w-[85%] rounded-lg rounded-tl-none bg-white p-2.5 shadow-2xs' : ''}`}>{preview?.body || <span className="text-[#94A3B8]">Nothing written yet.</span>}</p>
          </div>
        </div>

        {channel === 'sms' && <label className="block text-xs font-medium text-[#475569]">Regulator template ID (India DLT)<input className={`${INPUT} mt-1 font-mono`} value={dlt} onChange={(e) => setDlt(e.target.value)} placeholder="Leave empty where not required" /></label>}
        {channel === 'whatsapp' && (
          <div className="space-y-2">
            <label className="block text-xs font-medium text-[#475569]">Meta template name<input className={`${INPUT} mt-1 font-mono`} value={waName} onChange={(e) => setWaName(e.target.value)} placeholder="appointment_reminder_v1" /></label>
            <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-[#475569]">Outside the 24-hour window only a Meta-approved template can be sent. Submitting templates to Meta from this screen, and reading back their approval status, are not built yet: create the template in Meta Business Manager under the name above. Changing approved text clears its recorded approval.</p>
          </div>
        )}

        {row && row.history.length > 0 && (
          <div className="border-t border-[#E2E8F0] pt-3">
            <p className="text-xs font-medium text-[#475569]">Earlier versions (current is v{row.version})</p>
            <ul className="mt-1.5 space-y-1 text-xs text-[#64748B]">
              {row.history.slice(0, 5).map((h) => (
                <li key={h.version} className="flex items-center justify-between gap-2"><span className="truncate">v{h.version} &middot; {when(h.updated_at)} &middot; {h.body.slice(0, 48)}{h.body.length > 48 ? '...' : ''}</span>
                  <button className="shrink-0 font-medium text-[#0066FF] hover:underline" disabled={busy} onClick={() => run(() => restoreTemplate(eventKey, channel, { language: lang, version: h.version }), `Restored v${h.version} as a new version.`)}>Restore</button></li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-[#E2E8F0] bg-slate-50/60 px-4 py-3">
        {row && <button className={BTN} disabled={busy} onClick={() => run(() => resetTemplate(eventKey, channel, lang), 'Back to the built-in text.')}>Reset to default</button>}
        <span role="status" className="ml-auto text-xs font-medium text-emerald-700">{note}</span>
        <button className={BTN} disabled={busy || !body.trim()} onClick={() => save('draft')}>Save draft</button>
        <button className={PRIMARY} disabled={busy || !body.trim()} onClick={() => save('active')}>Activate</button>
      </div>
      <p className="px-4 pb-3 text-[11px] text-[#94A3B8]">{label(cell.event_key.split('.')[0])} messages use this text as soon as it is active. Sending itself is switched on event by event; until then these templates are saved but the app still sends its built-in wording.</p>
    </aside>
  );
}
