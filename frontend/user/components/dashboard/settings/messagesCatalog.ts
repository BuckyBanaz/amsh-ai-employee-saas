// Design-preview data for DOCS/24 (clinic message templates). Nothing here is read from or saved to the server yet.
export type Channel = 'whatsapp' | 'sms' | 'email';
export type Lang = 'en' | 'hi';
export type MetaStatus = 'approved' | 'pending' | 'rejected';

export const CHANNEL_LABEL: Record<Channel, string> = { whatsapp: 'WhatsApp', sms: 'SMS', email: 'Email' };

export type ChannelTemplate = { en: string; hi?: string; subject?: string; meta?: MetaStatus };

export type MessageEvent = {
  key: string;
  label: string;
  when: string;
  to: 'Patient' | 'Staff';
  vars: string[];
  customized: boolean;
  enabled: boolean;
  order: Channel[];
  templates: Partial<Record<Channel, ChannelTemplate>>;
};

const PATIENT_VARS = ['patient_name', 'service', 'doctor', 'date', 'time', 'clinic_name', 'clinic_phone', 'manage_link'];

export const MESSAGE_EVENTS: MessageEvent[] = [
  {
    key: 'booking.confirmed', label: 'Booking confirmed', when: 'Right after the AI or your team books an appointment', to: 'Patient',
    vars: PATIENT_VARS, customized: false, enabled: true, order: ['whatsapp', 'sms'],
    templates: {
      whatsapp: { en: 'Hi {{patient_name}}, your {{service}} with {{doctor}} is confirmed for {{date}} at {{time}}.\nNeed to change it? {{manage_link}}', hi: 'नमस्ते {{patient_name}}, {{doctor}} के साथ आपकी {{service}} {{date}} को {{time}} बजे confirm हो गई है।\nबदलना है? {{manage_link}}', meta: 'approved' },
      sms: { en: 'Hi {{patient_name}}, your {{service}} with {{doctor}} is confirmed for {{date}} at {{time}}. {{clinic_name}}, {{clinic_phone}}' },
    },
  },
  {
    key: 'booking.reminder', label: 'Appointment reminder', when: '24 hours before the appointment (never within 1 hour of booking)', to: 'Patient',
    vars: PATIENT_VARS, customized: true, enabled: true, order: ['whatsapp', 'sms'],
    templates: {
      whatsapp: { en: 'Hi {{patient_name}}, a reminder from {{clinic_name}}: your {{service}} with {{doctor}} is on {{date}} at {{time}}.\nReply 1 to confirm or 2 to reschedule.', hi: 'नमस्ते {{patient_name}}, {{clinic_name}} की तरफ से याद दिलाना: {{doctor}} के साथ आपकी {{service}} {{date}} को {{time}} बजे है।\nConfirm के लिए 1, बदलने के लिए 2 भेजिए।', meta: 'pending' },
      sms: { en: 'Reminder: {{service}} with {{doctor}} on {{date}} at {{time}}. {{clinic_name}}, {{clinic_phone}}', hi: 'याद दिलाना: {{doctor}} के साथ {{service}}, {{date}} को {{time}} बजे। {{clinic_name}}, {{clinic_phone}}' },
    },
  },
  {
    key: 'booking.cancelled', label: 'Booking cancelled', when: 'When an appointment is cancelled', to: 'Patient',
    vars: PATIENT_VARS, customized: false, enabled: true, order: ['sms'],
    templates: { sms: { en: 'Hi {{patient_name}}, your {{service}} on {{date}} at {{time}} was cancelled. Call {{clinic_name}} on {{clinic_phone}} to rebook.' } },
  },
  {
    key: 'call.missed_followup', label: 'Missed-call follow-up', when: 'When a caller hangs up without speaking (once per number per 24 hours)', to: 'Patient',
    vars: ['patient_name', 'clinic_name', 'clinic_phone'], customized: false, enabled: false, order: ['sms'],
    templates: { sms: { en: 'Hi, sorry we missed your call. {{clinic_name}} will call you back soon, or call {{clinic_phone}}.' } },
  },
  {
    key: 'alert.escalation', label: 'Escalation alert', when: 'When a caller needs a person or it is an emergency', to: 'Staff',
    vars: ['caller', 'reason', 'summary', 'call_link'], customized: false, enabled: true, order: ['sms', 'email'],
    templates: {
      sms: { en: 'AMSh alert: {{caller}} needs a person. Reason: {{reason}}. {{call_link}}' },
      email: { en: '{{caller}} asked for a person.\n\nReason: {{reason}}\nSummary: {{summary}}\nCall: {{call_link}}', subject: 'Caller needs a person: {{reason}}' },
    },
  },
];

export const CLINIC_SAMPLE: Record<string, string> = {
  patient_name: 'Kamlesh', service: 'Dental Consultation', doctor: 'Dr. Sarah Wilson', date: 'Thu 8 Oct', time: '10:30 AM',
  clinic_name: 'Sanjeevani Hospital', clinic_phone: '+91 98765 43210', manage_link: 'https://amsh.ai/m/9fT2',
  caller: '+91 98111 22334', reason: 'Billing question', summary: 'Caller disputes a charge from the last visit.', call_link: 'https://app.amsh.ai/c/881',
};

export const renderSample = (body: string) => body.replace(/\{\{(\w+)\}\}/g, (_, k: string) => CLINIC_SAMPLE[k] ?? '');

export function smsSegments(text: string) {
  const unicode = /[^\x00-\x7F]/.test(text);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  return { len: text.length, segments: text.length <= single ? 1 : Math.ceil(text.length / multi), unicode };
}

export const LOG: { when: string; event: string; to: string; channel: Channel; status: 'read' | 'delivered' | 'sent' | 'failed' }[] = [
  { when: 'Today 09:12', event: 'Appointment reminder', to: '+91 98••• ••210', channel: 'whatsapp', status: 'read' },
  { when: 'Today 09:10', event: 'Booking confirmed', to: '+91 97••• ••845', channel: 'whatsapp', status: 'delivered' },
  { when: 'Today 08:41', event: 'Appointment reminder', to: '+91 99••• ••302', channel: 'sms', status: 'sent' },
  { when: 'Yesterday 17:55', event: 'Booking cancelled', to: '+91 90••• ••118', channel: 'sms', status: 'failed' },
  { when: 'Yesterday 14:03', event: 'Escalation alert', to: 'Front desk', channel: 'sms', status: 'delivered' },
];
