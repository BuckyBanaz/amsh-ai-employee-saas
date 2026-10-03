"use client";
import React, { useRef, useState } from 'react';
import {
  CHANNEL_LABEL, Channel, Lang, LOG, MESSAGE_EVENTS, MessageEvent, renderSample, smsSegments,
} from './messagesCatalog';

const INPUT =
  'w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]';
const BTN = 'px-3 py-1.5 rounded-md border border-gray-200 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 transition-colors';
const META_STYLE = { approved: 'bg-emerald-50 text-emerald-700', pending: 'bg-amber-50 text-amber-700', rejected: 'bg-red-50 text-red-700' };
const STATUS_STYLE = { read: 'text-emerald-600', delivered: 'text-emerald-600', sent: 'text-gray-500', failed: 'text-red-600' };

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

/** Settings > Messages: wording, channel order and timing for the clinic's own patient and staff messages. Design preview: not saved. */
export function MessagesSettings() {
  const [events, setEvents] = useState<MessageEvent[]>(MESSAGE_EVENTS);
  const [selected, setSelected] = useState('booking.reminder');
  const [channel, setChannel] = useState<Channel>('whatsapp');
  const [lang, setLang] = useState<Lang>('en');
  const [quiet, setQuiet] = useState({ on: true, from: '21:00', to: '08:00' });
  const [toast, setToast] = useState('');
  const area = useRef<HTMLTextAreaElement>(null);

  const ev = events.find((e) => e.key === selected)!;
  const channels = Object.keys(ev.templates) as Channel[];
  const activeChannel: Channel = ev.templates[channel] ? channel : channels[0];
  const tpl = ev.templates[activeChannel]!;
  const body = (lang === 'hi' ? tpl.hi : tpl.en) ?? '';
  const rendered = renderSample(body);
  const sms = smsSegments(rendered);

  const flash = (m: string) => { setToast(m); window.setTimeout(() => setToast(''), 2200); };
  const patch = (key: string, fn: (e: MessageEvent) => MessageEvent) => setEvents((prev) => prev.map((e) => (e.key === key ? fn(e) : e)));
  const setBody = (text: string) => patch(ev.key, (e) => ({
    ...e, customized: true,
    templates: { ...e.templates, [activeChannel]: { ...tpl, [lang]: text, ...(activeChannel === 'whatsapp' && tpl.meta ? { meta: 'pending' as const } : {}) } },
  }));
  const insert = (v: string) => {
    const el = area.current; const token = `{{${v}}}`;
    if (!el) return setBody(body + token);
    const { selectionStart: s, selectionEnd: e } = el;
    setBody(body.slice(0, s) + token + body.slice(e));
    window.requestAnimationFrame(() => { el.focus(); el.setSelectionRange(s + token.length, s + token.length); });
  };
  const move = (key: string, ch: Channel, dir: -1 | 1) => patch(key, (e) => {
    const o = [...e.order]; const i = o.indexOf(ch); const j = i + dir;
    if (i < 0 || j < 0 || j >= o.length) return e;
    [o[i], o[j]] = [o[j], o[i]]; return { ...e, order: o };
  });
  const toggleChannel = (key: string, ch: Channel) => patch(key, (e) => ({ ...e, order: e.order.includes(ch) ? e.order.filter((c) => c !== ch) : [...e.order, ch] }));

  return (
    <div className="space-y-4 max-w-4xl">
      <div role="note" className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
        <strong>Design preview.</strong> Changes here are not saved or sent yet. Previews use your clinic name, doctor and a sample patient.
      </div>

      <Card title="Messages AMSh sends for your clinic" desc="Each message starts as the AMSh default. Customize it to sound like your clinic; you can always go back to the default.">
        <ul className="divide-y divide-gray-100 -my-1">
          {events.map((e) => (
            <li key={e.key} className={`flex flex-wrap items-center gap-x-3 gap-y-2 py-2.5 ${selected === e.key ? 'bg-[#F7FAFF] -mx-2 px-2 rounded-md' : ''}`}>
              <Toggle checked={e.enabled} onChange={() => patch(e.key, (x) => ({ ...x, enabled: !x.enabled }))} label={`Send: ${e.label}`} />
              <div className="min-w-0 flex-1 basis-48">
                <p className="text-xs font-bold text-gray-900">{e.label} <span className="ml-1 font-medium text-gray-400">to {e.to.toLowerCase()}</span></p>
                <p className="text-[11px] text-gray-500">{e.when}</p>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${e.customized ? 'bg-blue-50 text-[#0066FF]' : 'bg-gray-100 text-gray-500'}`}>{e.customized ? 'Customized' : 'AMSh default'}</span>
              <span className="flex items-center gap-1 text-[11px] text-gray-500">
                {e.order.length ? e.order.map((c, i) => <span key={c}>{i > 0 && <span className="mx-0.5 text-gray-300">&rarr;</span>}{CHANNEL_LABEL[c]}</span>) : 'No channel'}
              </span>
              <button onClick={() => { setSelected(e.key); setChannel(Object.keys(e.templates)[0] as Channel); setLang('en'); }} className={BTN}>{selected === e.key ? 'Editing' : e.customized ? 'Edit' : 'Customize'}</button>
            </li>
          ))}
        </ul>
      </Card>

      <Card title={`Edit: ${ev.label}`} desc="Pick a channel and language. Only the variables listed for this message can be used.">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {channels.map((c) => (
            <button key={c} onClick={() => setChannel(c)} aria-pressed={activeChannel === c}
              className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${activeChannel === c ? 'border-[#0066FF] bg-[#F0F7FF] text-[#0066FF]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{CHANNEL_LABEL[c]}</button>
          ))}
          <span className="mx-1 h-4 w-px bg-gray-200" />
          {(['en', 'hi'] as Lang[]).map((l) => (
            <button key={l} onClick={() => setLang(l)} aria-pressed={lang === l}
              className={`px-2.5 py-1 rounded-md border text-xs font-semibold ${lang === l ? 'border-[#0066FF] bg-[#F0F7FF] text-[#0066FF]' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {l === 'en' ? 'English' : 'Hindi'}{(l === 'hi' ? tpl.hi : tpl.en) ? '' : ' (not written)'}
            </button>
          ))}
          {activeChannel === 'whatsapp' && tpl.meta && <span className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold capitalize ${META_STYLE[tpl.meta]}`}>WhatsApp approval: {tpl.meta}</span>}
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="min-w-0">
            {activeChannel === 'email' && tpl.subject && (
              <label className="mb-2 block"><span className="text-xs font-semibold text-gray-700">Subject</span><input className={`${INPUT} mt-1`} defaultValue={tpl.subject} /></label>
            )}
            <label htmlFor="msg-body" className="text-xs font-semibold text-gray-700">Message</label>
            <textarea id="msg-body" ref={area} rows={7} value={body} onChange={(e) => setBody(e.target.value)} placeholder="Write the message in this language." className={`${INPUT} mt-1 resize-y font-mono leading-relaxed`} />
            <p className="mt-1 text-[11px] text-gray-500">{activeChannel === 'sms' ? `${sms.len} characters, ${sms.segments} SMS segment${sms.segments > 1 ? 's' : ''}${sms.unicode ? ' (Hindi uses shorter segments)' : ''}` : `${rendered.length} characters`}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {ev.vars.map((v) => <button key={v} onClick={() => insert(v)} className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] text-gray-700 hover:border-[#0066FF] hover:text-[#0066FF]">{`{{${v}}}`}</button>)}
            </div>
          </div>

          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-700">Preview</p>
            <div className={`mt-1 rounded-lg p-3 ${activeChannel === 'whatsapp' ? 'bg-[#E7F3EA]' : 'border border-gray-100 bg-gray-50'}`}>
              {activeChannel === 'email' && <p className="mb-2 border-b border-gray-200 pb-2 text-xs font-semibold text-gray-900">{renderSample(tpl.subject ?? '')}</p>}
              <p className={`whitespace-pre-wrap text-xs leading-relaxed text-gray-900 ${activeChannel === 'whatsapp' ? 'max-w-[90%] rounded-lg rounded-tl-none bg-white p-2.5 shadow-2xs' : ''}`}>
                {rendered || <span className="text-gray-400">Nothing written for this language yet.</span>}
              </p>
            </div>
            {activeChannel === 'whatsapp' && <p className="mt-2 text-[11px] text-gray-500">WhatsApp only sends business-started messages once Meta has approved the wording. Until then the next channel in your order is used. Editing the text sends it for approval again.</p>}
            {activeChannel === 'sms' && <p className="mt-2 text-[11px] text-gray-500">Keep SMS free of medical detail. India needs the wording registered (DLT); AMSh handles that for the default text.</p>}
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-3">
          <button onClick={() => flash('Test sent: design preview')} className={BTN}>Send test to my phone</button>
          {activeChannel === 'whatsapp' && <button onClick={() => flash('Sent to Meta: design preview')} className={BTN}>Submit for approval</button>}
          <button onClick={() => { patch(ev.key, (e) => ({ ...e, customized: false })); flash('Back to the AMSh default: design preview'); }} disabled={!ev.customized} className={`${BTN} disabled:opacity-40 disabled:cursor-not-allowed`}>Reset to default</button>
          <span role="status" className="ml-auto text-xs font-semibold text-emerald-700">{toast}</span>
          <button onClick={() => flash('Saved: design preview')} className="px-4 py-1.5 rounded-md bg-[#0066FF] text-white text-xs font-semibold hover:bg-blue-600 transition-colors shadow-xs">Save changes</button>
        </div>
      </Card>

      <Card title="Channels and timing" desc="Choose which channel goes first. If it fails or is not allowed, the next one is tried.">
        <div className="space-y-2">
          {events.filter((e) => e.enabled).map((e) => (
            <div key={e.key} className="flex flex-wrap items-center gap-2">
              <span className="w-44 text-xs font-semibold text-gray-800">{e.label}</span>
              {(Object.keys(CHANNEL_LABEL) as Channel[]).map((c) => {
                const on = e.order.includes(c); const i = e.order.indexOf(c);
                return (
                  <span key={c} className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px] font-semibold ${on ? 'border-[#0066FF] bg-[#F0F7FF] text-[#0066FF]' : 'border-gray-200 text-gray-400'}`}>
                    <button onClick={() => toggleChannel(e.key, c)} aria-pressed={on} aria-label={`${on ? 'Remove' : 'Add'} ${CHANNEL_LABEL[c]} for ${e.label}`}>{on ? `${i + 1}. ` : '+ '}{CHANNEL_LABEL[c]}</button>
                    {on && <>
                      <button onClick={() => move(e.key, c, -1)} disabled={i === 0} aria-label={`Move ${CHANNEL_LABEL[c]} earlier`} className="px-0.5 disabled:opacity-30">&larr;</button>
                      <button onClick={() => move(e.key, c, 1)} disabled={i === e.order.length - 1} aria-label={`Move ${CHANNEL_LABEL[c]} later`} className="px-0.5 disabled:opacity-30">&rarr;</button>
                    </>}
                  </span>
                );
              })}
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-gray-100 pt-3">
          <Toggle checked={quiet.on} onChange={() => setQuiet((q) => ({ ...q, on: !q.on }))} label="Quiet hours" />
          <div className="mr-2"><p className="text-xs font-bold text-gray-900">Quiet hours</p><p className="text-[11px] text-gray-500">No patient messages at night, in your clinic&apos;s timezone (Asia/Kolkata). Alerts to staff still go out.</p></div>
          <input aria-label="Quiet hours start" type="time" value={quiet.from} disabled={!quiet.on} onChange={(e) => setQuiet((q) => ({ ...q, from: e.target.value }))} className={`${INPUT} !w-32 disabled:opacity-40`} />
          <span className="text-xs text-gray-500">to</span>
          <input aria-label="Quiet hours end" type="time" value={quiet.to} disabled={!quiet.on} onChange={(e) => setQuiet((q) => ({ ...q, to: e.target.value }))} className={`${INPUT} !w-32 disabled:opacity-40`} />
        </div>
      </Card>

      <Card title="Message log" desc="The last messages sent for your clinic. Phone numbers are partly hidden.">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-xs">
            <thead><tr className="border-b border-gray-100 text-[11px] font-semibold uppercase tracking-wide text-gray-400"><th className="py-1.5 pr-3">When</th><th className="pr-3">Message</th><th className="pr-3">To</th><th className="pr-3">Channel</th><th>Status</th></tr></thead>
            <tbody>
              {LOG.map((r, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0">
                  <td className="py-2 pr-3 text-gray-500">{r.when}</td><td className="pr-3 font-semibold text-gray-800">{r.event}</td>
                  <td className="pr-3 font-mono text-gray-600">{r.to}</td><td className="pr-3 text-gray-600">{CHANNEL_LABEL[r.channel]}</td>
                  <td className={`font-semibold capitalize ${STATUS_STYLE[r.status]}`}>{r.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
