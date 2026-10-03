// Design-preview data for DOCS/24 (message templates). Nothing here is read from the platform yet.
export type Channel = 'email' | 'sms' | 'whatsapp' | 'push';
export type TemplateStatus = 'active' | 'draft' | 'missing';
export type MetaStatus = 'approved' | 'pending' | 'rejected';

export const CHANNELS: { key: Channel; label: string }[] = [
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'push', label: 'In-app' },
];

export type EventDef = {
  key: string;
  label: string;
  group: string;
  to: string;
  vars: string[];
};

export const EVENTS: EventDef[] = [
  { key: 'auth.verify_email', label: 'Verify email', group: 'Account', to: 'Owner / staff', vars: ['name', 'link', 'business_name'] },
  { key: 'auth.password_reset', label: 'Password reset', group: 'Account', to: 'Owner / staff', vars: ['name', 'link'] },
  { key: 'team.invite', label: 'Team invite', group: 'Account', to: 'Staff', vars: ['name', 'link', 'business_name'] },
  { key: 'billing.trial_ending', label: 'Trial ending', group: 'Billing', to: 'Owner', vars: ['name', 'days_left', 'plan', 'business_name'] },
  { key: 'billing.payment_receipt', label: 'Payment receipt', group: 'Billing', to: 'Owner', vars: ['name', 'plan', 'amount', 'invoice_link'] },
  { key: 'billing.plan_limit_reached', label: 'Plan limit reached', group: 'Billing', to: 'Owner', vars: ['name', 'plan', 'business_name'] },
  { key: 'booking.confirmed', label: 'Booking confirmed', group: 'Patient messages', to: 'Patient', vars: ['patient_name', 'service', 'doctor', 'date', 'time', 'clinic_name', 'clinic_phone', 'manage_link'] },
  { key: 'booking.reminder', label: 'Appointment reminder', group: 'Patient messages', to: 'Patient', vars: ['patient_name', 'service', 'doctor', 'date', 'time', 'clinic_name', 'clinic_phone', 'manage_link'] },
  { key: 'booking.cancelled', label: 'Booking cancelled', group: 'Patient messages', to: 'Patient', vars: ['patient_name', 'service', 'date', 'time', 'clinic_name', 'clinic_phone'] },
  { key: 'call.missed_followup', label: 'Missed-call follow-up', group: 'Patient messages', to: 'Patient', vars: ['patient_name', 'clinic_name', 'clinic_phone'] },
  { key: 'alert.escalation', label: 'Escalation alert', group: 'Staff alerts', to: 'Clinic staff', vars: ['caller', 'reason', 'summary', 'call_link'] },
  { key: 'platform.provider_down', label: 'Provider down', group: 'Platform alerts', to: 'Platform admins', vars: ['provider', 'message'] },
];

export type Template = {
  status: TemplateStatus;
  languages: string[];
  subject?: string;
  body: string;
  version: number;
  updatedBy: string;
  updatedAt: string;
  meta?: MetaStatus;
  dltId?: string;
};

const T = (t: Partial<Template> & { body: string }): Template => ({
  status: 'active', languages: ['EN'], version: 1, updatedBy: 'System default', updatedAt: '28 Sep', ...t,
});

export const TEMPLATES: Record<string, Template> = {
  'auth.verify_email|email': T({ subject: 'Confirm your email for AMSh', body: 'Hi {{name}},\n\nConfirm your email to finish setting up {{business_name}} on AMSh:\n{{link}}\n\nThe link works for 24 hours.' }),
  'auth.verify_email|push': T({ body: 'Please confirm your email address to unlock your dashboard.' }),
  'auth.password_reset|email': T({ subject: 'Reset your AMSh password', body: 'Hi {{name}},\n\nUse this link to choose a new password:\n{{link}}\n\nIf you did not ask for this, you can ignore this email.', version: 2, updatedBy: 'Parikshit', updatedAt: '2 Oct' }),
  'team.invite|email': T({ subject: 'You have been invited to {{business_name}}', body: 'Hi {{name}},\n\nYou were invited to join {{business_name}} on AMSh. Accept here:\n{{link}}' }),
  'billing.trial_ending|email': T({ status: 'draft', subject: 'Your AMSh trial ends in {{days_left}} days', body: 'Hi {{name}},\n\nYour trial for {{business_name}} ends in {{days_left}} days. Pick a plan to keep your AI receptionist answering calls.', version: 3, updatedBy: 'Parikshit', updatedAt: 'Today' }),
  'billing.trial_ending|push': T({ body: 'Your trial ends in {{days_left}} days. Choose a plan to keep your receptionist live.' }),
  'billing.payment_receipt|email': T({ subject: 'Payment received: {{plan}}', body: 'Hi {{name}},\n\nThank you. We received {{amount}} for the {{plan}} plan.\nInvoice: {{invoice_link}}' }),
  'billing.plan_limit_reached|email': T({ status: 'draft', subject: 'You reached your {{plan}} plan limit', body: 'Hi {{name}},\n\n{{business_name}} reached the limit of the {{plan}} plan. Upgrade to avoid missed calls.' }),
  'billing.plan_limit_reached|push': T({ body: 'Plan limit reached. Upgrade to keep every call answered.' }),
  'booking.confirmed|sms': T({ languages: ['EN', 'HI'], body: 'Hi {{patient_name}}, your {{service}} with {{doctor}} is confirmed for {{date}} at {{time}}. {{clinic_name}}, {{clinic_phone}}', dltId: '1107170000000000123' }),
  'booking.confirmed|whatsapp': T({ languages: ['EN', 'HI'], body: 'Hi {{patient_name}}, your {{service}} with {{doctor}} is confirmed for {{date}} at {{time}}.\nNeed to change it? {{manage_link}}', meta: 'approved' }),
  'booking.confirmed|email': T({ subject: 'Appointment confirmed: {{date}} at {{time}}', body: 'Hi {{patient_name}},\n\nYour {{service}} with {{doctor}} at {{clinic_name}} is confirmed for {{date}} at {{time}}.\nManage it: {{manage_link}}' }),
  'booking.reminder|sms': T({ languages: ['EN', 'HI'], body: 'Reminder: {{service}} with {{doctor}} tomorrow, {{date}} at {{time}}. {{clinic_name}}, {{clinic_phone}}', dltId: '1107170000000000456' }),
  'booking.reminder|whatsapp': T({ languages: ['EN', 'HI'], body: 'Hi {{patient_name}}, a reminder of your {{service}} with {{doctor}} on {{date}} at {{time}} at {{clinic_name}}.\nReply 1 to confirm or 2 to reschedule.', meta: 'pending', version: 4, updatedBy: 'Parikshit', updatedAt: 'Today' }),
  'booking.reminder|push': T({ status: 'draft', body: '{{patient_name}} has an appointment on {{date}} at {{time}}.' }),
  'booking.cancelled|sms': T({ body: 'Hi {{patient_name}}, your {{service}} on {{date}} at {{time}} was cancelled. Call {{clinic_name}} on {{clinic_phone}} to rebook.' }),
  'booking.cancelled|whatsapp': T({ meta: 'rejected', body: 'Hi {{patient_name}}, your {{service}} on {{date}} at {{time}} was cancelled. Call {{clinic_phone}} to rebook.' }),
  'call.missed_followup|sms': T({ languages: ['EN', 'HI'], body: 'Hi {{patient_name}}, sorry we missed your call. {{clinic_name}} will call you back soon, or call {{clinic_phone}}.' }),
  'alert.escalation|sms': T({ body: 'AMSh alert: {{caller}} needs a person. Reason: {{reason}}. {{call_link}}' }),
  'alert.escalation|email': T({ subject: 'Caller needs a person: {{reason}}', body: '{{caller}} asked for a person.\n\nReason: {{reason}}\nSummary: {{summary}}\nCall: {{call_link}}' }),
  'alert.escalation|push': T({ body: '{{caller}} needs a person: {{reason}}' }),
  'platform.provider_down|email': T({ subject: 'Provider down: {{provider}}', body: '{{provider}} is failing.\n\n{{message}}' }),
  'platform.provider_down|push': T({ body: '{{provider}} is down. {{message}}' }),
};

export const SAMPLE: Record<string, string> = {
  name: 'Priya', link: 'https://app.amsh.ai/l/x7Kq', business_name: 'Sanjeevani Hospital', days_left: '3', plan: 'Growth',
  amount: 'Rs 4,999', invoice_link: 'https://app.amsh.ai/i/2041', patient_name: 'Kamlesh', service: 'Dental Consultation',
  doctor: 'Dr. Sarah Wilson', date: 'Thu 8 Oct', time: '10:30 AM', clinic_name: 'Sanjeevani Hospital', clinic_phone: '+91 98765 43210',
  manage_link: 'https://amsh.ai/m/9fT2', caller: '+91 98111 22334', reason: 'Billing question', summary: 'Caller disputes a charge from last visit.',
  call_link: 'https://app.amsh.ai/c/881', provider: 'Twilio', message: 'Account inactive: SMS confirmations are failing.',
};

export const render = (body: string): string => body.replace(/\{\{(\w+)\}\}/g, (_, k: string) => SAMPLE[k] ?? '');

export function smsInfo(rendered: string) {
  const unicode = /[^\x00-\x7F]/.test(rendered);
  const single = unicode ? 70 : 160;
  const multi = unicode ? 67 : 153;
  const len = rendered.length;
  return { len, segments: len <= single ? 1 : Math.ceil(len / multi), unicode };
}

export const cellKey = (event: string, channel: Channel) => `${event}|${channel}`;
