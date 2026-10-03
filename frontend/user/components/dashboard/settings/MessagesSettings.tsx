"use client";
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Channel, MessageEventItem, MessageList, MessageLogDto, MessagesService, PreviewDto, TemplateCellDto } from '../../../services/messages.service';

const INPUT =
  'w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]';
const BTN = 'px-3 py-1.5 rounded-md border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
const CHANNEL_LABEL: Record<string, string> = { whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email', push: 'In-app' };
const META_STYLE: Record<string, string> = { approved: 'bg-emerald-50 text-emerald-700', pending: 'bg-amber-50 text-amber-700', rejected: 'bg-red-50 text-red-700' };
const STATUS_STYLE: Record<string, string> = { read: 'text-emerald-600', delivered: 'text-emerald-600', sent: 'text-gray-500', queued: 'text-gray-500', failed: 'text-red-600' };
const errText = (e: unknown) => (e instanceof Error ? e.message : 'Something went wrong');

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={onChange}
      className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${checked ? 'bg-[#0066FF]' : 'bg-gray-200'}`}>
      <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-2xs transition-transform ${checked ? 'translate-x-3.5' : 'translate-x-0'}`} />
    </button>
  );
}

function Card({ title, desc, children }: { title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <h3 className="text-sm font-bold text-gray-900 tracking-tight mb-0.5">{title}</h3>
      <p className="text-xs text-gray-500 mb-3">{desc}</p>
      {children}
    </div>
  );
}

/** Settings > Messages: the clinic's own wording, channel order and quiet hours for patient and staff messages (saved on the server). */
export function MessagesSettings() {
  const [data, setData] = useState<MessageList | null>(null);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<{ key: string; channel: Channel } | null>(null);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [log, setLog] = useState<MessageLogDto[]>([]);

  const load = useCallback(async () => {
    try { const d = await MessagesService.list(); setData(d); setError(''); } catch (e) { setError(errText(e)); }
  }, []);
  useEffect(() => { void load(); MessagesService.log().then((d) => setLog(d.items)).catch(() => undefined); }, [load]);

  const flash = (ok: boolean, text: string) => { setToast({ ok, text }); window.setTimeout(() => setToast(null), 3500); };
  async function prefs(body: Parameters<typeof MessagesService.savePreferences>[0], ok = 'Saved') {
    try { await MessagesService.savePreferences(body); await load(); flash(true, ok); } catch (e) { flash(false, errText(e)); }
  }

  if (error && !data) return <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>;
  if (!data) return <p className="text-xs text-gray-500">Loading messages...</p>;

  const move = (e: MessageEventItem, ch: Channel, dir: -1 | 1) => {
    const o = [...e.order]; const i = o.indexOf(ch); const j = i + dir;
    if (i < 0 || j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]];
    void prefs({ events: { [e.key]: { order: o } } }, 'Order saved');
  };
  const allChannels = (e: MessageEventItem) => e.channels.map((c) => c.channel);
  const q = data.quiet_hours;

  return (
    <div className="space-y-4 max-w-4xl">
      <div role="note" className="rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-900">
        Messages marked <strong>Live</strong> are sent with the wording you save here. The others are saved and kept with their history, but AMSh still sends its built-in text for them until they are switched over.
      </div>
      {toast && <p role="status" className={`rounded-md px-3 py-2 text-xs font-semibold ${toast.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{toast.text}</p>}

      <Card title="Messages AMSh sends for your clinic" desc="Each message starts as the AMSh default. Customize it to sound like your clinic; you can always go back to the default.">
        <ul className="divide-y divide-gray-100 -my-1">
          {data.items.map((e) => (
            <li key={e.key} className={`flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 ${selected?.key === e.key ? 'bg-[#F7FAFF] -mx-2 px-2 rounded-md' : ''}`}>
              <Toggle checked={e.enabled} onChange={() => void prefs({ events: { [e.key]: { enabled: !e.enabled } } }, e.enabled ? 'Turned off' : 'Turned on')} label={`Send: ${e.label}`} />
              <div className="min-w-0 flex-1 basis-48">
                <p className="text-xs font-bold text-gray-900">{e.label} <span className="ml-1 font-medium text-gray-400">to {e.to.toLowerCase()}</span></p>
              </div>
              {e.live && <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">Live</span>}
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${e.customized ? 'bg-blue-50 text-[#0066FF]' : 'bg-gray-100 text-gray-500'}`}>{e.customized ? 'Customized' : 'AMSh default'}</span>
              <span className="text-[11px] text-gray-500">{e.order.length ? e.order.map((c) => CHANNEL_LABEL[c]).join(' → ') : 'No channel'}</span>
              <button onClick={() => setSelected({ key: e.key, channel: (e.channels.find((c) => c.customized)?.channel ?? e.channels[0]?.channel) as Channel })} className={BTN}>{selected?.key === e.key ? 'Editing' : e.customized ? 'Edit' : 'Customize'}</button>
            </li>
          ))}
        </ul>
      </Card>

      {selected && <Editor key={`${selected.key}|${selected.channel}`} event={data.items.find((i) => i.key === selected.key)!} channel={selected.channel} languages={data.languages}
        onChannel={(channel) => setSelected({ key: selected.key, channel })} onChanged={() => void load()} flash={flash} />}

      <Card title="Channels and timing" desc="Choose which channel goes first. If it fails or is not allowed, the next one is tried.">
        <div className="space-y-2">
          {data.items.filter((e) => e.enabled).map((e) => (
            <div key={e.key} className="flex flex-wrap items-center gap-2">
              <span className="w-44 text-xs font-semibold text-gray-800">{e.label}</span>
              {allChannels(e).map((c) => {
                const on = e.order.includes(c); const i = e.order.indexOf(c);
                return (
                  <span key={c} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${on ? 'border-[#0066FF] bg-[#F0F7FF] text-[#0066FF]' : 'border-gray-200 text-gray-400'}`}>
                    <button onClick={() => void prefs({ events: { [e.key]: { order: on ? e.order.filter((x) => x !== c) : [...e.order, c] } } }, 'Channels saved')} aria-pressed={on} aria-label={`${on ? 'Remove' : 'Add'} ${CHANNEL_LABEL[c]} for ${e.label}`}>{on ? `${i + 1}. ` : '+ '}{CHANNEL_LABEL[c]}</button>
                    {on && <>
                      <button onClick={() => move(e, c, -1)} disabled={i === 0} aria-label={`Move ${CHANNEL_LABEL[c]} earlier`} className="px-0.5 disabled:opacity-30">&larr;</button>
                      <button onClick={() => move(e, c, 1)} disabled={i === e.order.length - 1} aria-label={`Move ${CHANNEL_LABEL[c]} later`} className="px-0.5 disabled:opacity-30">&rarr;</button>
                    </>}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        <QuietHours key={`${q.enabled}${q.from}${q.to}`} initial={q} onSave={(v) => prefs({ quiet_hours: v }, 'Quiet hours saved')} />
      </Card>

      <Card title="Message log" desc="The last messages sent for your clinic. Phone numbers are partly hidden.">
        {log.length === 0 ? <p className="text-xs text-gray-500">Nothing has been sent through the template system yet.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-xs">
              <thead><tr className="border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-400"><th className="py-1.5 pr-3">When</th><th className="pr-3">Message</th><th className="pr-3">To</th><th className="pr-3">Channel</th><th>Status</th></tr></thead>
              <tbody>{log.map((r) => (
                <tr key={r.id} className="border-b border-gray-50 last:border-0"><td className="py-2 pr-3 text-gray-500">{r.created_at ? new Date(r.created_at).toLocaleString() : ''}</td><td className="pr-3 font-semibold text-gray-800">{r.event}</td><td className="pr-3 font-mono text-gray-600">{r.recipient}</td><td className="pr-3 text-gray-600">{CHANNEL_LABEL[r.channel] ?? r.channel}</td><td className={`font-semibold capitalize ${STATUS_STYLE[r.status] ?? 'text-gray-500'}`}>{r.status}{r.error ? ` (${r.error})` : ''}</td></tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function QuietHours({ initial, onSave }: { initial: { enabled: boolean; from: string; to: string }; onSave: (v: { enabled: boolean; from: string; to: string }) => void }) {
  const [v, setV] = useState(initial);
  const dirty = v.enabled !== initial.enabled || v.from !== initial.from || v.to !== initial.to;
  return (
    <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
      <Toggle checked={v.enabled} onChange={() => setV({ ...v, enabled: !v.enabled })} label="Quiet hours" />
      <div className="mr-2"><p className="text-xs font-bold text-gray-900">Quiet hours</p><p className="text-[11px] text-gray-500">No patient messages at night, in your clinic&apos;s timezone. Alerts to staff still go out.</p></div>
      <input aria-label="Quiet hours start" type="time" value={v.from} disabled={!v.enabled} onChange={(e) => setV({ ...v, from: e.target.value })} className={`${INPUT} !w-32 disabled:opacity-40`} />
      <span className="text-xs text-gray-500">to</span>
      <input aria-label="Quiet hours end" type="time" value={v.to} disabled={!v.enabled} onChange={(e) => setV({ ...v, to: e.target.value })} className={`${INPUT} !w-32 disabled:opacity-40`} />
      {dirty && <button className={BTN} onClick={() => onSave(v)}>Save</button>}
    </div>
  );
}

function Editor({ event, channel, languages, onChannel, onChanged, flash }: {
  event: MessageEventItem; channel: Channel; languages: string[]; onChannel: (c: Channel) => void; onChanged: () => void; flash: (ok: boolean, text: string) => void;
}) {
  const [cell, setCell] = useState<TemplateCellDto | null>(null);
  const [lang, setLang] = useState('en');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [preview, setPreview] = useState<PreviewDto | null>(null);
  const [busy, setBusy] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  const fill = useCallback((c: TemplateCellDto, language: string) => {
    const row = c.own[language] ?? c.inherited[language];
    const fallback = !row && language === 'en' ? c.default : null;
    setSubject(row?.subject ?? fallback?.subject ?? '');
    setBody(row?.body ?? fallback?.body ?? '');
  }, []);
  const load = useCallback(async (language?: string) => {
    try {
      const c = await MessagesService.cell(event.key, channel);
      setCell(c);
      const l = language ?? (c.own.en || c.inherited.en || c.default ? 'en' : Object.keys(c.own)[0] ?? 'en');
      setLang(l); fill(c, l);
    } catch (e) { flash(false, errText(e)); }
  }, [event.key, channel, fill, flash]);
  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!cell) return;
    const t = window.setTimeout(() => { MessagesService.preview(event.key, channel, { subject, body }).then(setPreview).catch(() => setPreview(null)); }, 250);
    return () => window.clearTimeout(t);
  }, [cell, event.key, channel, subject, body]);

  const own = cell?.own[lang];
  const insert = (v: string) => {
    const el = area.current; const token = `{{${v}}}`;
    if (!el) { setBody((b) => b + token); return; }
    const { selectionStart: s, selectionEnd: e } = el;
    setBody(body.slice(0, s) + token + body.slice(e));
    window.requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + token.length, s + token.length); });
  };
  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try { await fn(); await load(lang); onChanged(); flash(true, ok); } catch (e) { flash(false, errText(e)); } finally { setBusy(false); }
  }
  const source = own ? 'Your version' : cell?.inherited[lang] ? 'AMSh standard text' : cell?.default && lang === 'en' ? 'AMSh built-in text' : 'Not written yet';
  const unknown = preview?.unknown_variables ?? [];
  const metaStatus = own?.meta_status ?? cell?.inherited[lang]?.meta_status ?? null;

  return (
    <Card title={`Edit: ${event.label}`} desc="Pick a channel and language. Only the variables listed for this message can be used.">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {event.channels.map((c) => (
          <button key={c.channel} onClick={() => onChannel(c.channel)} aria-pressed={channel === c.channel}
            className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${channel === c.channel ? 'border-[#0066FF] bg-[#F0F7FF] text-[#0066FF]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{CHANNEL_LABEL[c.channel]}</button>
        ))}
        <span className="mx-1 h-4 w-px bg-gray-200" />
        <select aria-label="Language" className={`${INPUT} !w-auto`} value={lang} onChange={(e) => { setLang(e.target.value); if (cell) fill(cell, e.target.value); }}>
          {(cell?.languages ?? languages).map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
        </select>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">{source}</span>
        {channel === 'whatsapp' && metaStatus && <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${META_STYLE[metaStatus]}`}>WhatsApp approval: {metaStatus}</span>}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="min-w-0">
          {channel === 'email' && <label className="mb-2 block"><span className="text-xs font-semibold text-gray-700">Subject</span><input className={`${INPUT} mt-1`} value={subject} onChange={(e) => setSubject(e.target.value)} /></label>}
          <label htmlFor="msg-body" className="text-xs font-semibold text-gray-700">Message</label>
          <textarea id="msg-body" ref={area} rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the message in this language." className={`${INPUT} mt-1 resize-y font-mono leading-relaxed`} />
          <p className="mt-1 text-[11px] text-gray-500">
            {channel === 'sms' && preview?.sms ? `${preview.sms.characters} characters, ${preview.sms.segments} SMS segment${preview.sms.segments > 1 ? 's' : ''}${preview.sms.unicode ? ' (Hindi uses shorter segments)' : ''}` : `${(preview?.body ?? body).length} characters`}
            {unknown.length > 0 && <span className="ml-2 font-semibold text-red-600">Unknown variable: {unknown.join(', ')}</span>}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">{(cell?.variables ?? event.variables).map((v) => <button key={v} onClick={() => insert(v)} className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] text-gray-700 hover:border-[#0066FF] hover:text-[#0066FF]">{`{{${v}}}`}</button>)}</div>
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-gray-700">Preview with a sample patient</p>
          <div className={`mt-1 rounded-lg p-3 ${channel === 'whatsapp' ? 'bg-[#E7F3EA]' : 'border border-gray-100 bg-gray-50'}`}>
            {channel === 'email' && <p className="mb-2 border-b border-gray-200 pb-2 text-xs font-semibold text-gray-900">{preview?.subject}</p>}
            <p className={`whitespace-pre-wrap text-xs leading-relaxed text-gray-900 ${channel === 'whatsapp' ? 'max-w-[90%] rounded-lg rounded-tl-none bg-white p-2.5 shadow-2xs' : ''}`}>{preview?.body || <span className="text-gray-400">Nothing written for this language yet.</span>}</p>
          </div>
          {channel === 'whatsapp' && <p className="mt-2 text-[11px] text-gray-500">WhatsApp only sends business-started messages once Meta has approved the wording. Until then the next channel in your order is used. Changing approved text clears its approval.</p>}
          {channel === 'sms' && <p className="mt-2 text-[11px] text-gray-500">Keep SMS free of medical detail. In India the wording has to be registered (DLT); ask AMSh support before changing a registered message.</p>}
        </div>
      </div>

      {own && own.history.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-3">
          <p className="text-xs font-semibold text-gray-700">Earlier versions (current is v{own.version})</p>
          <ul className="mt-1 space-y-1 text-[11px] text-gray-500">{own.history.slice(0, 4).map((h) => (
            <li key={h.version} className="flex items-center justify-between gap-2"><span className="truncate">v{h.version}: {h.body.slice(0, 60)}{h.body.length > 60 ? '...' : ''}</span>
              <button className="shrink-0 font-semibold text-[#0066FF] hover:underline" disabled={busy} onClick={() => void act(() => MessagesService.restore(event.key, channel, { language: lang, version: h.version }), `Restored v${h.version}`)}>Restore</button></li>
          ))}</ul>
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
        <button className={BTN} disabled={busy || !own} onClick={() => void act(() => MessagesService.reset(event.key, channel, lang), 'Back to the AMSh default')}>Reset to default</button>
        <button className={BTN} disabled={busy || !body.trim()} onClick={() => void act(() => MessagesService.save(event.key, channel, { language: lang, subject: channel === 'email' ? subject : null, body, status: 'draft' }), 'Saved as a draft (not used yet)')}>Save as draft</button>
        <button className="ml-auto px-4 py-1.5 rounded-md bg-[#0066FF] text-white text-xs font-semibold hover:bg-blue-600 transition-colors shadow-xs disabled:opacity-50" disabled={busy || !body.trim()} onClick={() => void act(() => MessagesService.save(event.key, channel, { language: lang, subject: channel === 'email' ? subject : null, body, status: 'active' }), 'Saved')}>Save and use</button>
      </div>
    </Card>
  );
}
