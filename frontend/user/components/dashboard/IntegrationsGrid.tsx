"use client";
import React, { useState, useEffect } from 'react';

import { STRINGS } from '../../utils/strings/en';
import { useWhatsappEmbeddedSignup } from '../../hooks/useWhatsappEmbeddedSignup';
import { StorageService } from '../../services/storage.service';

interface TenantIntegration {
  id: string;
  provider: string;
  status: string;
  config: Record<string, any>;
  connected_at: string | null;
}

const getIconForIntegration = (type: string) => {
  switch (type) {
    case 'calendar':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      );
    case 'video':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="23 7 16 12 23 17 23 7" />
          <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
        </svg>
      );
    case 'sms':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
      );
    case 'whatsapp':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      );
    case 'payment':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="1" y="4" width="22" height="16" rx="2" ry="2" />
          <line x1="1" y1="10" x2="23" y2="10" />
        </svg>
      );
    case 'email':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
          <polyline points="22,6 12,13 2,6" />
        </svg>
      );
    case 'zapier':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
        </svg>
      );
    case 'developer':
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="16 18 22 12 16 6" />
          <polyline points="8 6 2 12 8 18" />
        </svg>
      );
    default:
      return null;
  }
};

// Base definitions enriched with BYO / Managed distinctions
const baseCatalog = [
  {
    id: 'google-calendar',
    providerKey: 'google_calendar',
    name: 'Google Calendar',
    description: 'Sync doctor appointment slots directly with Google Calendar to prevent double-booking.',
    iconType: 'calendar',
    iconBg: 'bg-[#4285F4]/10',
    iconColor: 'text-[#4285F4]',
    category: 'Calendar',
    badgeText: 'Doctor Diary Sync',
    fields: [
      { key: 'calendar_id', label: 'Google Calendar ID / Email', placeholder: 'primary or doctor@clinic.com' },
      { key: 'sync_direction', label: 'Sync Mode', placeholder: 'two-way' },
    ],
  },
  {
    id: 'outlook',
    providerKey: 'outlook',
    name: 'Outlook Calendar',
    description: 'Sync doctor shifts and clinic appointment diaries with Microsoft 365 Outlook.',
    iconType: 'calendar',
    iconBg: 'bg-[#0078D4]/10',
    iconColor: 'text-[#0078D4]',
    category: 'Calendar',
    badgeText: 'Microsoft 365',
    fields: [
      { key: 'outlook_email', label: 'Outlook Account Email', placeholder: 'doctor@hospital.com' },
    ],
  },
  {
    id: 'whatsapp',
    providerKey: 'whatsapp',
    name: 'Meta WhatsApp Business',
    description: 'Send booking confirmations & reminders from your official verified WhatsApp number (BYO WABA).',
    iconType: 'whatsapp',
    iconBg: 'bg-[#25D366]/10',
    iconColor: 'text-[#25D366]',
    category: 'Communication',
    badgeText: 'Clinic Branded',
    fields: [
      { key: 'phone_number_id', label: 'Phone Number ID', placeholder: '1400432583145565' },
      { key: 'waba_id', label: 'WhatsApp Business Account ID', placeholder: '1129742056242779' },
      { key: 'access_token', label: 'Meta System User Token (EAA...)', placeholder: 'EAA...' },
    ],
  },
  {
    id: 'custom-smtp',
    providerKey: 'smtp',
    name: 'Custom SMTP (Clinic Domain)',
    description: 'Send patient emails from your own domain (e.g. care@sanjeevanihospital.com) instead of default platform.',
    iconType: 'email',
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600',
    category: 'Communication',
    badgeText: 'White-Label Email',
    fields: [
      { key: 'smtp_host', label: 'SMTP Server Host', placeholder: 'smtp.gmail.com or mail.clinic.com' },
      { key: 'smtp_port', label: 'Port', placeholder: '587' },
      { key: 'smtp_user', label: 'Username / Email', placeholder: 'care@yourclinic.com' },
      { key: 'smtp_password', label: 'SMTP App Password', placeholder: '••••••••••••••••' },
      { key: 'from_name', label: 'Sender Display Name', placeholder: 'Sanjeevani Care Team' },
    ],
  },
  {
    id: 'twilio-byo',
    providerKey: 'twilio',
    name: 'Twilio (BYOC - Own Trunk)',
    description: 'Bring Your Own Carrier. Leave disconnected to use AMSh managed cloud numbers automatically.',
    iconType: 'sms',
    iconBg: 'bg-[#F22F46]/10',
    iconColor: 'text-[#F22F46]',
    category: 'Communication',
    badgeText: 'Optional BYOC',
    fields: [
      { key: 'account_sid', label: 'Twilio Account SID', placeholder: 'AC••••••••••••••••••••••••••••••••' },
      { key: 'auth_token', label: 'Twilio Auth Token', placeholder: '••••••••••••••••••••••••••••••••' },
      { key: 'phone_number', label: 'Twilio Outbound Caller ID', placeholder: '+1...' },
    ],
  },
  {
    id: 'stripe',
    providerKey: 'stripe',
    name: 'Stripe Clinic Deposits',
    description: 'Collect patient copays, consultation deposits, and no-show fee holds directly into your Stripe account.',
    iconType: 'payment',
    iconBg: 'bg-[#635BFF]/10',
    iconColor: 'text-[#635BFF]',
    category: 'Payments',
    badgeText: 'Direct Copays',
    fields: [
      { key: 'publishable_key', label: 'Stripe Publishable Key', placeholder: 'pk_live_...' },
      { key: 'secret_key', label: 'Stripe Restricted Secret Key', placeholder: 'rk_live_...' },
    ],
  },
  {
    id: 'zapier',
    providerKey: 'zapier',
    name: 'Zapier & Webhooks',
    description: 'Dispatch real-time webhooks on booking confirmed, call ended, or patient registered to 5,000+ apps.',
    iconType: 'zapier',
    iconBg: 'bg-[#FF4A00]/10',
    iconColor: 'text-[#FF4A00]',
    category: 'Developer',
    badgeText: 'Realtime Dispatch',
    fields: [
      { key: 'webhook_url', label: 'Target Webhook URL', placeholder: 'https://hooks.zapier.com/hooks/catch/...' },
      { key: 'secret', label: 'Webhook Signing Secret', placeholder: 'whsec_...' },
    ],
  },
];

export function IntegrationsGrid({ filter = 'All Integrations' }: { filter?: string }) {
  const wa = useWhatsappEmbeddedSignup();
  const [tenantIntegrations, setTenantIntegrations] = useState<TenantIntegration[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal Configuration State
  const [activeModalItem, setActiveModalItem] = useState<any | null>(null);
  const [modalFields, setModalFields] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ success: boolean; message: string } | null>(null);

  const businessId = typeof window !== 'undefined' ? (StorageService.getBusinessId() || 'biz-default') : 'biz-default';

  const fetchIntegrations = async () => {
    try {
      const token = StorageService.getToken();
      const res = await fetch(`http://localhost:8010/api/businesses/${businessId}/integrations`, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTenantIntegrations(data);
      }
    } catch (err) {
      console.error('Failed to load integrations:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIntegrations();
  }, [businessId]);

  const handleOpenModal = (item: any) => {
    const existing = tenantIntegrations.find((ti) => ti.provider === item.providerKey);
    setActiveModalItem(item);
    setFeedback(null);
    if (existing?.config) {
      setModalFields({ ...existing.config });
    } else {
      const initial: Record<string, string> = {};
      item.fields?.forEach((f: any) => {
        initial[f.key] = '';
      });
      setModalFields(initial);
    }
  };

  const handleSaveIntegration = async () => {
    if (!activeModalItem) return;
    setIsSubmitting(true);
    setFeedback(null);
    try {
      const token = StorageService.getToken();
      const res = await fetch(
        `http://localhost:8010/api/businesses/${businessId}/integrations/${activeModalItem.providerKey}/connect`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            provider: activeModalItem.providerKey,
            config: modalFields,
          }),
        }
      );
      if (res.ok) {
        setFeedback({ success: true, message: `${activeModalItem.name} connected successfully!` });
        await fetchIntegrations();
        setTimeout(() => {
          setActiveModalItem(null);
          setFeedback(null);
        }, 1200);
      } else {
        const err = await res.json();
        setFeedback({ success: false, message: err.detail || 'Failed to save integration' });
      }
    } catch (err) {
      setFeedback({ success: false, message: 'Network error communicating with server' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDisconnect = async (providerKey: string) => {
    if (!confirm('Are you sure you want to disconnect this integration?')) return;
    try {
      const token = StorageService.getToken();
      const res = await fetch(
        `http://localhost:8010/api/businesses/${businessId}/integrations/${providerKey}/disconnect`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      if (res.ok) {
        await fetchIntegrations();
        setActiveModalItem(null);
      }
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  const filtered = baseCatalog.filter((item) => {
    if (filter === 'All Integrations') return true;
    if (filter === 'Calendar') return item.category === 'Calendar';
    if (filter === 'Communication') return item.category === 'Communication';
    if (filter === 'Payments') return item.category === 'Payments';
    if (filter === 'Developer') return item.category === 'Developer';
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Platform Default Indicator Banner */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-2xl p-4 flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center text-[#0066FF] shrink-0 mt-0.5">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </div>
        <div className="text-xs text-blue-900 leading-relaxed">
          <p className="font-bold mb-0.5">Managed Platform Engine Active</p>
          <p className="text-blue-700">
            AMSh provides managed AI voice numbers, high-speed LLM processing, and SMS delivery out of the box. Connect the integrations below to sync doctor calendars, use your clinic's branded WhatsApp, or send emails from your own domain.
          </p>
        </div>
      </div>

      {/* Grid of Tenant Integrations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pb-6">
        {filtered.map((item) => {
          const connectedRecord = tenantIntegrations.find((ti) => ti.provider === item.providerKey && ti.status === 'connected');
          const isConnected = !!connectedRecord || (item.id === 'whatsapp' && wa.status === 'connected');

          return (
            <div
              key={item.id}
              className="bg-white border border-gray-100 rounded-2xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)] hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${item.iconBg} ${item.iconColor} shadow-2xs`}>
                      {getIconForIntegration(item.iconType)}
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-gray-900 tracking-tight leading-tight">
                        {item.name}
                      </h3>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span
                          className={`text-[10px] font-bold ${
                            isConnected ? 'text-emerald-600' : 'text-gray-400'
                          }`}
                        >
                          {isConnected ? 'Connected' : 'Not Connected'}
                        </span>
                        <span className="text-gray-300">·</span>
                        <span className="text-[10px] font-semibold text-gray-400">
                          {item.badgeText}
                        </span>
                      </div>
                    </div>
                  </div>

                  {item.isWhatsappSpecial && !isConnected ? (
                    <button
                      type="button"
                      onClick={wa.connect}
                      disabled={!wa.sdkReady || wa.status === 'connecting' || wa.status === 'loading'}
                      className="px-3 py-1 bg-[#0066FF] text-white rounded-lg text-xs font-bold shadow-xs hover:bg-blue-600 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {wa.status === 'connecting' ? 'Connecting…' : 'Connect'}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenModal(item)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        isConnected
                          ? 'border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-2xs'
                          : 'bg-[#0066FF] text-white hover:bg-blue-600 shadow-xs'
                      }`}
                    >
                      {isConnected ? 'Manage' : 'Connect'}
                    </button>
                  )}
                </div>

                <p className="text-xs text-gray-500 leading-relaxed">
                  {item.description}
                </p>
              </div>

              {/* Status footer for connected items */}
              {isConnected && (
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400 font-medium">
                  <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Live Syncing
                  </span>
                  <span>{connectedRecord?.connected_at ? new Date(connectedRecord.connected_at).toLocaleDateString() : 'Active'}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Interactive Configuration Modal */}
      {activeModalItem && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-2xl max-w-lg w-full p-5 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeModalItem.iconBg} ${activeModalItem.iconColor}`}>
                  {getIconForIntegration(activeModalItem.iconType)}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">{activeModalItem.name}</h3>
                  <p className="text-[11px] text-gray-500">{activeModalItem.badgeText}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModalItem(null)}
                className="text-gray-400 hover:text-gray-700 p-1 cursor-pointer"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              {activeModalItem.description}
            </p>

            {/* Input Fields */}
            <div className="space-y-3 pt-1">
              {activeModalItem.fields?.map((field: any) => (
                <div key={field.key}>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    {field.label}
                  </label>
                  <input
                    type={field.key.includes('secret') || field.key.includes('password') || field.key.includes('token') ? 'password' : 'text'}
                    placeholder={field.placeholder}
                    value={modalFields[field.key] || ''}
                    onChange={(e) => setModalFields({ ...modalFields, [field.key]: e.target.value })}
                    className="w-full text-xs px-3 py-2 border border-gray-200 rounded-xl outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-blue-100 font-mono"
                  />
                </div>
              ))}
            </div>

            {/* Feedback alert */}
            {feedback && (
              <div
                className={`p-2.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                  feedback.success ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  {feedback.success ? <polyline points="20 6 9 17 4 12" /> : <line x1="18" y1="6" x2="6" y2="18" />}
                </svg>
                {feedback.message}
              </div>
            )}

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
              {tenantIntegrations.some((ti) => ti.provider === activeModalItem.providerKey && ti.status === 'connected') ? (
                <button
                  type="button"
                  onClick={() => handleDisconnect(activeModalItem.providerKey)}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 px-3 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  Disconnect
                </button>
              ) : <div />}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveModalItem(null)}
                  className="text-xs font-semibold text-gray-600 hover:text-gray-900 px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleSaveIntegration}
                  className="text-xs font-bold text-white bg-[#0066FF] hover:bg-blue-600 px-4 py-2 rounded-xl transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? 'Connecting...' : 'Save & Connect'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
