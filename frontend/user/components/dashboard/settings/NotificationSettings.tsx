"use client";
import React, { useEffect, useState } from 'react';
import { DashboardController, AgentItem } from '../../../controllers/dashboard.controller';

const EVENTS: { id: string; label: string }[] = [
  { id: 'booking', label: 'A new appointment is booked' },
  { id: 'escalation', label: 'A call is handed to staff or is an emergency' },
  { id: 'missed_call', label: 'A caller hangs up without speaking' },
];

const INPUT =
  'w-full border border-gray-200 rounded-md py-1.5 px-2.5 text-xs text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF]';

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onChange}
      className={`w-8 h-4.5 rounded-full transition-colors relative flex items-center px-0.5 shrink-0 ${checked ? 'bg-[#0066FF]' : 'bg-gray-200'}`}
    >
      <div className={`w-3.5 h-3.5 bg-white rounded-full shadow-2xs transition-transform ${checked ? 'translate-x-3.5' : 'translate-x-0'}`}></div>
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

/** Automations and alerts: everything here is saved in the agent's settings and used by the server (not just displayed). */
export function NotificationSettings() {
  const [loading, setLoading] = useState(true);
  const [reminders, setReminders] = useState(false);
  const [leadHours, setLeadHours] = useState(24);
  const [template, setTemplate] = useState('');
  const [language, setLanguage] = useState('en');
  const [missedCall, setMissedCall] = useState(false);
  const [alertPhone, setAlertPhone] = useState('');
  const [alertEmail, setAlertEmail] = useState('');
  const [events, setEvents] = useState<string[]>(EVENTS.map((e) => e.id));
  const [feedUrl, setFeedUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    DashboardController.getAgent()
      .then((agent: AgentItem) => {
        const c = agent?.config || {};
        setReminders(c.toggles?.reminders === true);
        setMissedCall(c.toggles?.missed_call_followup === true);
        setLeadHours(Number(c.reminders?.lead_hours) || 24);
        setTemplate(c.reminders?.whatsapp_template || '');
        setLanguage(c.reminders?.whatsapp_language || 'en');
        setAlertPhone(c.alerts?.phone || '');
        setAlertEmail(c.alerts?.email || '');
        if (Array.isArray(c.alerts?.events)) setEvents(c.alerts!.events!);
      })
      .catch((err) => console.warn('Failed to load automation settings:', err))
      .finally(() => setLoading(false));
    DashboardController.getCalendarFeedUrl()
      .then((res) => setFeedUrl(res.url))
      .catch(() => setFeedUrl(''));
  }, []);

  const toggleEvent = (id: string) => setEvents((prev) => (prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]));

  const save = async () => {
    setMessage(null);
    if (alertEmail && !/^\S+@\S+\.\S+$/.test(alertEmail)) return setMessage({ kind: 'error', text: 'That alert email does not look right.' });
    setSaving(true);
    try {
      await DashboardController.updateAgent({
        config: {
          toggles: { reminders, missed_call_followup: missedCall },
          reminders: { lead_hours: leadHours, whatsapp_template: template.trim(), whatsapp_language: language.trim() || 'en' },
          alerts: { phone: alertPhone.trim(), email: alertEmail.trim(), events },
        },
      });
      setMessage({ kind: 'ok', text: 'Saved.' });
    } catch (err: any) {
      setMessage({ kind: 'error', text: err?.message || 'Could not save.' });
    } finally {
      setSaving(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(feedUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* the field is selectable, so the URL can still be copied by hand */
    }
  };

  if (loading) {
    return <div className="text-xs text-gray-500 py-6">Loading automation settings...</div>;
  }

  return (
    <div className="space-y-3 max-w-4xl pb-6">
      <Card title="Appointment reminders" desc="Message patients before their visit so fewer forget. Sent by SMS; WhatsApp needs a template approved by Meta.">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-semibold text-gray-800">Send reminders</div>
          <Toggle checked={reminders} onChange={() => setReminders(!reminders)} label="Send reminders" />
        </div>
        <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2.5 ${reminders ? '' : 'opacity-50 pointer-events-none'}`}>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Send before the visit</label>
            <select value={leadHours} onChange={(e) => setLeadHours(Number(e.target.value))} className={INPUT}>
              {[3, 6, 12, 24, 48].map((h) => (
                <option key={h} value={h}>{h} hours</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">WhatsApp template (optional)</label>
            <input value={template} onChange={(e) => setTemplate(e.target.value)} placeholder="appointment_reminder" className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Template language</label>
            <input value={language} onChange={(e) => setLanguage(e.target.value)} placeholder="en" className={INPUT} />
          </div>
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Reminders also need to be enabled on the AMSh server by your administrator. The template takes three values: patient name, clinic name, date and time.
        </p>
      </Card>

      <Card title="Missed calls" desc="When someone calls and hangs up before speaking, send them a text so they can call back.">
        <div className="flex items-center justify-between">
          <div className="text-xs font-semibold text-gray-800">Text back callers we missed</div>
          <Toggle checked={missedCall} onChange={() => setMissedCall(!missedCall)} label="Text back missed callers" />
        </div>
      </Card>

      <Card title="Alerts to your team" desc="Tell your own staff when something needs them. Leave both fields empty to turn alerts off.">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-3 max-w-xl">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Phone for SMS alerts</label>
            <input value={alertPhone} onChange={(e) => setAlertPhone(e.target.value)} placeholder="+91 98765 43210" className={INPUT} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Email for alerts</label>
            <input value={alertEmail} onChange={(e) => setAlertEmail(e.target.value)} placeholder="frontdesk@yourclinic.com" className={INPUT} />
          </div>
        </div>
        <div className="space-y-2">
          {EVENTS.map((ev) => (
            <label key={ev.id} className="flex items-center gap-2 text-xs text-gray-800 cursor-pointer select-none">
              <input type="checkbox" checked={events.includes(ev.id)} onChange={() => toggleEvent(ev.id)} className="accent-[#0066FF]" />
              {ev.label}
            </label>
          ))}
        </div>
      </Card>

      <Card title="See bookings in your own calendar" desc="Subscribe Google Calendar, Outlook or Apple Calendar to this link (Add calendar, From URL). It updates itself and is read-only.">
        {feedUrl ? (
          <div className="flex gap-2 max-w-2xl">
            <input readOnly value={feedUrl} onFocus={(e) => e.currentTarget.select()} className={`${INPUT} font-mono`} />
            <button type="button" onClick={copy} className="px-3 py-1.5 bg-white border border-gray-200 text-gray-900 rounded-md text-xs font-semibold hover:bg-gray-50 shrink-0">
              {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        ) : (
          <p className="text-xs text-gray-500">The calendar link is not available right now.</p>
        )}
        <p className="text-[11px] text-gray-400 mt-2">Anyone with this link can see your appointments. Do not share it publicly.</p>
      </Card>

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="px-4 py-1.5 bg-gray-900 text-white rounded-md text-xs font-semibold shadow-xs hover:bg-black disabled:opacity-60 transition-colors"
        >
          {saving ? 'Saving...' : 'Save changes'}
        </button>
        {message && <span className={`text-xs font-medium ${message.kind === 'ok' ? 'text-emerald-600' : 'text-red-600'}`}>{message.text}</span>}
      </div>
    </div>
  );
}
