"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ApiService } from '../../../../services/api.service';
import { API_ENDPOINTS } from '../../../../utils/api_endpoints';
import { useWhatsappEmbeddedSignup, getActiveBusinessId } from '../../../../hooks/useWhatsappEmbeddedSignup';

export default function WhatsappSetupPage() {
  const router = useRouter();

  // Mode: Turnkey Managed Gateway (Instant 0-friction) vs Custom Meta Credentials
  const [activeTab, setActiveTab] = useState<'turnkey' | 'custom'>('turnkey');

  // Business Phone & Alert Phone
  const [businessPhone, setBusinessPhone] = useState('');
  const [adminAlertPhone, setAdminAlertPhone] = useState('');

  // Automated Feature Toggles
  const [enableInstantCards, setEnableInstantCards] = useState(true);
  const [enable2HourReminder, setEnable2HourReminder] = useState(true);
  const [enableMissedCallFollowup, setEnableMissedCallFollowup] = useState(true);

  // Custom Meta WABA Credentials (for enterprise clients)
  const [customPhoneId, setCustomPhoneId] = useState('');
  const [customWabaId, setCustomWabaId] = useState('');
  const [customToken, setCustomToken] = useState('');
  const [customRegister, setCustomRegister] = useState(false);
  const [manualSaving, setManualSaving] = useState(false);
  const [manualError, setManualError] = useState('');

  // Saving state
  const [isSaving, setIsSaving] = useState(false);
  const [testSent, setTestSent] = useState(false);

  // Dynamic Business Data state from Onboarding Step 1
  const [businessName, setBusinessName] = useState('');
  const [businessCity, setBusinessCity] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessVertical, setBusinessVertical] = useState('clinic');

  useEffect(() => {
    try {
      const stored = localStorage.getItem('onboarding_business_data');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.businessName || parsed.name) {
          setBusinessName(parsed.businessName || parsed.name);
        }
        if (parsed.city) setBusinessCity(parsed.city);
        if (parsed.address) setBusinessAddress(parsed.address);
        if (parsed.phone || parsed.business_phone) {
          setBusinessPhone(parsed.phone || parsed.business_phone);
          setAdminAlertPhone(parsed.phone || parsed.business_phone);
        }
        if (parsed.vertical) setBusinessVertical(parsed.vertical);
      }

      const savedPhone = localStorage.getItem('onboarding_whatsapp_phone');
      if (savedPhone) {
        setBusinessPhone(savedPhone);
        setAdminAlertPhone(savedPhone);
      }
    } catch (e) {
      console.error('Failed to load stored business data:', e);
    }
  }, []);

  // Meta Embedded Signup (coexistence: keep existing WhatsApp Business App number)
  const wa = useWhatsappEmbeddedSignup();
  const metaStatus = wa.status;
  const metaError = wa.error;
  const connectedNumber = wa.connectedNumber;
  const sdkReady = wa.sdkReady;
  const handleConnectWithMeta = wa.connect;
  const [testError, setTestError] = useState('');

  useEffect(() => {
    if (wa.connectedNumber) setBusinessPhone(wa.connectedNumber);
  }, [wa.connectedNumber]);

  const handleManualConnect = async () => {
    setManualError('');
    if (!customPhoneId.trim() || !customWabaId.trim() || !customToken.trim()) {
      setManualError('Phone Number ID, WABA ID and access token are all required.');
      return;
    }
    setManualSaving(true);
    try {
      await wa.connectManually({
        phone_number_id: customPhoneId,
        waba_id: customWabaId,
        access_token: customToken,
        register: customRegister,
      });
      setCustomToken('');
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'Could not connect with these credentials.');
    } finally {
      setManualSaving(false);
    }
  };

  const handleSendTestMessage = async () => {
    setTestError('');
    try {
      await wa.sendTestMessage(adminAlertPhone);
      setTestSent(true);
      setTimeout(() => setTestSent(false), 4000);
    } catch (err: any) {
      setTestError(err?.message || 'Test message failed.');
    }
  };

  const handleSaveAndContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      localStorage.setItem('onboarding_whatsapp_connected', 'true');
      localStorage.setItem('onboarding_whatsapp_phone', businessPhone);
      // A Meta connection already stored its own mode (embedded_signup / manual_token)
      const mode = metaStatus === 'connected' ? undefined : activeTab === 'turnkey' ? 'turnkey_cloud' : 'custom_waba';
      if (mode) localStorage.setItem('onboarding_whatsapp_mode', mode);

      const businessId = getActiveBusinessId();
      if (businessId) {
        await ApiService.post(API_ENDPOINTS.INTEGRATIONS.CONNECT(businessId, 'whatsapp'), {
          provider: 'whatsapp',
          config: {
            ...(mode ? { mode } : {}),
            business_phone: businessPhone,
            admin_alert_phone: adminAlertPhone,
            instant_cards: enableInstantCards,
            reminder_2hr: enable2HourReminder,
            missed_call_followup: enableMissedCallFollowup,
            custom_phone_id: customPhoneId || null,
            custom_waba_id: customWabaId || null,
          }
        });
      }
    } catch (err) {
      console.warn('Backend connect warning (falling back to localStorage):', err);
    }

    setTimeout(() => {
      setIsSaving(false);
      router.push('/onboarding/integrations');
    }, 400);
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-5 space-y-4">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-gray-100 bg-gray-50/50">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push('/onboarding/integrations')}
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white transition-colors cursor-pointer"
            title="Back to Integrations"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>

          <div className="w-8 h-8 rounded-lg bg-[#25D366]/10 text-[#128C7E] flex items-center justify-center border border-[#25D366]/20">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900 tracking-tight">WhatsApp Business Channel</h1>
              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border border-emerald-200">
                Ready to Send
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              Automated booking confirmations, Google Maps directions, and 2-hour visit reminders.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1.5 shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Channel Active &amp; Ready
          </span>
        </div>
      </div>

      {/* Main Content Layout: Left Configuration + Right Live Interactive WhatsApp Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Left Panel: Frictionless Configuration */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-white rounded-xl border border-gray-200/80 p-4 space-y-4">
            
            {/* Zero-Friction Turnkey Banner */}
            <div className="p-3.5 bg-gradient-to-br from-emerald-50/80 to-teal-50/50 rounded-xl border border-emerald-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-[#128C7E] text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                    ✓
                  </div>
                  <div>
                    <h2 className="text-xs font-bold text-gray-900 leading-tight">
                      AMSh Verified WhatsApp Cloud Gateway
                    </h2>
                    <p className="text-[10px] text-emerald-800 font-medium">
                      Zero technical setup required • No account deletion needed
                    </p>
                  </div>
                </div>
                <span className="text-[9px] font-bold bg-white text-[#128C7E] px-2 py-0.5 rounded border border-emerald-300">
                  Pre-Configured
                </span>
              </div>

              <p className="text-[11px] text-gray-600 leading-relaxed pt-1">
                Your AI receptionist automatically sends branded WhatsApp cards directly to customers under your business name (<strong className="text-gray-900">{businessName} AI</strong>) right after every call ends.
              </p>
            </div>

            {/* Connect existing number via Meta Embedded Signup (coexistence) */}
            <div className="p-3.5 rounded-xl border border-gray-200 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-gray-900">Connect your existing WhatsApp Business number</h3>
                  <p className="text-[10px] text-gray-500">
                    Keep using the WhatsApp Business app on your phone. In the Facebook popup choose
                    <strong> &ldquo;Connect your existing WhatsApp Business App&rdquo;</strong> and scan the QR from the <strong>WhatsApp Business</strong> app.
                  </p>
                </div>
                {metaStatus === 'connected' ? (
                  <span className="shrink-0 bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full">
                    ✓ Connected{connectedNumber ? `: ${connectedNumber}` : ''}
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleConnectWithMeta}
                    disabled={!sdkReady || metaStatus === 'connecting' || metaStatus === 'loading'}
                    className="shrink-0 px-3.5 py-1.5 text-xs font-bold text-white bg-[#1877F2] hover:bg-[#166FE5] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {!sdkReady ? 'Loading…' : metaStatus === 'connecting' ? 'Connecting…' : 'Connect with Facebook'}
                  </button>
                )}
              </div>
              {metaError && <p className="text-[10px] text-red-600">{metaError}</p>}
            </div>

            {/* Business Contact Configuration */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-gray-800 mb-1 block">
                  Clinic / Business WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={businessPhone}
                  onChange={(e) => setBusinessPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#128C7E] focus:outline-none font-mono"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Shown to customers as your primary WhatsApp contact for direct queries.
                </p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-gray-800 mb-1 block">
                  Staff / Admin Alert WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={adminAlertPhone}
                  onChange={(e) => setAdminAlertPhone(e.target.value)}
                  placeholder="+91 89014 14107"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#128C7E] focus:outline-none font-mono"
                />
                <p className="text-[10px] text-gray-500 mt-1">
                  Where you receive instant staff alerts whenever a patient books or needs human attention.
                </p>
              </div>
            </div>

            {/* Automated WhatsApp Actions */}
            <div className="pt-3 border-t border-gray-100 space-y-2.5">
              <h3 className="text-xs font-bold text-gray-900">Automated WhatsApp Features:</h3>
              
              <div className="space-y-2">
                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 border border-gray-100 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={enableInstantCards}
                    onChange={(e) => setEnableInstantCards(e.target.checked)}
                    className="mt-0.5 rounded text-[#128C7E] focus:ring-[#128C7E]"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Instant Booking Card with Google Maps</span>
                    <span className="text-[10px] text-gray-500 block">Sends interactive appointment confirmation &amp; 1-click GPS navigation directions right after call.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 border border-gray-100 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={enable2HourReminder}
                    onChange={(e) => setEnable2HourReminder(e.target.checked)}
                    className="mt-0.5 rounded text-[#128C7E] focus:ring-[#128C7E]"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">2-Hour Prior Visit Reminder</span>
                    <span className="text-[10px] text-gray-500 block">Automated WhatsApp reminder 2 hours before scheduled visit to prevent no-shows.</span>
                  </div>
                </label>

                <label className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-gray-50 border border-gray-100 cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    checked={enableMissedCallFollowup}
                    onChange={(e) => setEnableMissedCallFollowup(e.target.checked)}
                    className="mt-0.5 rounded text-[#128C7E] focus:ring-[#128C7E]"
                  />
                  <div>
                    <span className="text-xs font-bold text-gray-900 block">Missed / Incomplete Call Auto-Recovery</span>
                    <span className="text-[10px] text-gray-500 block">If a caller drops off mid-call, automatically sends WhatsApp booking link to recover the lead.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Test WhatsApp Action */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSendTestMessage}
                disabled={testSent}
                className="px-3.5 py-1.5 text-xs font-bold text-[#128C7E] bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
                {testSent ? '✓ Test WhatsApp Sent to ' + adminAlertPhone : 'Send Test WhatsApp to My Phone'}
              </button>
              {testError && <p className="text-[10px] text-red-600 mt-1">{testError}</p>}
            </div>

            {/* Advanced Meta WABA Accordion (Optional for power users) */}
            <div className="pt-2 border-t border-gray-100">
              <details className="group">
                <summary className="text-[11px] font-bold text-gray-600 hover:text-gray-900 cursor-pointer list-none flex items-center justify-between py-1">
                  <span>Advanced: Connect with access token (works before Meta App Review)</span>
                  <span className="text-xs text-gray-400 group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <div className="pt-2 space-y-2 text-xs">
                  <p className="text-[10px] text-gray-500">
                    Use this if the Facebook popup says the app &ldquo;lacks required advanced WhatsApp Business Management and messaging permissions&rdquo;.
                    Take the Phone Number ID and WABA ID from Meta App Dashboard &rarr; WhatsApp &rarr; API Setup, and a permanent
                    System User token (Business Settings &rarr; System users) with <code>whatsapp_business_management</code> and <code>whatsapp_business_messaging</code>.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={customPhoneId}
                      onChange={(e) => setCustomPhoneId(e.target.value)}
                      placeholder="Custom Phone Number ID"
                      className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg font-mono"
                    />
                    <input
                      type="text"
                      value={customWabaId}
                      onChange={(e) => setCustomWabaId(e.target.value)}
                      placeholder="Custom WABA ID"
                      className="px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg font-mono"
                    />
                  </div>
                  <input
                    type="password"
                    value={customToken}
                    onChange={(e) => setCustomToken(e.target.value)}
                    placeholder="Permanent System User access token"
                    autoComplete="off"
                    className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg font-mono"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-1.5 text-[10px] text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={customRegister} onChange={(e) => setCustomRegister(e.target.checked)} />
                      Newly added number &mdash; register it on Cloud API
                    </label>
                    <button
                      type="button"
                      onClick={handleManualConnect}
                      disabled={manualSaving}
                      className="px-3 py-1.5 text-xs font-bold text-white bg-[#128C7E] hover:bg-[#075E54] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {manualSaving ? 'Connecting…' : 'Connect with access token'}
                    </button>
                  </div>
                  {manualError && <p className="text-[10px] text-red-600">{manualError}</p>}
                </div>
              </details>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => router.push('/onboarding/integrations')}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleSaveAndContinue}
                disabled={isSaving}
                className="px-5 py-2 text-xs font-bold text-white bg-[#128C7E] hover:bg-[#075E54] rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? 'Activating...' : 'Save & Continue →'}
              </button>
            </div>

          </div>
        </div>

        {/* Right Panel: Sleek Compact WhatsApp Chat Preview Drawer */}
        <div className="lg:col-span-5">
          <div className="bg-[#E5DDD5] rounded-2xl border border-gray-300 shadow-md overflow-hidden sticky top-4">
            
            {/* WhatsApp App Header */}
            <div className="bg-[#075E54] text-white p-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-xs text-white border border-white/20">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"></rect>
                    <line x1="9" y1="6" x2="15" y2="6"></line>
                  </svg>
                </div>
                <div>
                  <h3 className="text-xs font-bold leading-tight flex items-center gap-1">
                    {businessName} AI
                    <span className="w-3.5 h-3.5 bg-emerald-400 text-gray-900 rounded-full flex items-center justify-center font-bold text-[9px]">
                      ✓
                    </span>
                  </h3>
                  <p className="text-[9px] text-emerald-200">
                    Official Business Account • Online
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-emerald-100">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path></svg>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="1"></circle><circle cx="12" cy="5" r="1"></circle><circle cx="12" cy="19" r="1"></circle></svg>
              </div>
            </div>

            {/* Chat Canvas */}
            <div className="p-3 space-y-2.5 min-h-[300px] max-h-[380px] overflow-y-auto bg-[radial-gradient(#CBD5E1_1px,transparent_1px)] [background-size:14px_14px]">
              
              {/* Date Badge */}
              <div className="flex justify-center">
                <span className="bg-white/80 backdrop-blur-xs text-gray-500 text-[8px] font-semibold px-2 py-0.5 rounded shadow-2xs">
                  TODAY
                </span>
              </div>

              {/* Patient message */}
              <div className="flex justify-start">
                <div className="bg-white rounded-lg rounded-tl-none p-2 max-w-[85%] text-[11px] text-gray-800 shadow-xs space-y-0.5">
                  <p>
                    {businessVertical === 'restaurant'
                      ? `Hello, I called to reserve a table at ${businessName}.`
                      : (businessVertical === 'gym'
                          ? `Hello, I called to schedule a workout session at ${businessName}.`
                          : `Hello, I called to book an appointment with ${businessName}.`)}
                  </p>
                  <span className="text-[8px] text-gray-400 float-right ml-2">10:42 AM</span>
                </div>
              </div>

              {/* AMSh AI WhatsApp Response Card */}
              {enableInstantCards && (
                <div className="flex justify-end">
                  <div className="bg-[#DCF8C6] rounded-lg rounded-tr-none p-2.5 max-w-[90%] shadow-xs border border-emerald-200 space-y-1.5">
                    <div className="flex items-center gap-1.5 border-b border-emerald-300/50 pb-1">
                      <div className="w-4 h-4 rounded-full bg-emerald-600 text-white flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-[11px] font-bold text-gray-900 leading-none">
                          {businessVertical === 'restaurant' ? 'Reservation Confirmed!' : 'Booking Confirmed!'}
                        </h4>
                        <span className="text-[8px] text-gray-600 font-mono">ID: #APT-88219</span>
                      </div>
                    </div>

                    <div className="text-[10px] text-gray-800 space-y-0.5 leading-tight">
                      <p><strong>Customer:</strong> Rahul Mehta</p>
                      <p><strong>Business:</strong> {businessName}</p>
                      <p><strong>Date &amp; Time:</strong> Today @ 4:30 PM</p>
                      <p><strong>Location:</strong> {businessAddress}, {businessCity}</p>
                    </div>

                    <div className="pt-1 border-t border-emerald-300/50 flex flex-col gap-1">
                      <button type="button" className="w-full py-0.5 text-[9px] font-bold text-[#075E54] bg-white/70 rounded hover:bg-white text-center transition-colors flex items-center justify-center gap-1">
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        Google Maps Directions
                      </button>
                    </div>

                    <span className="text-[8px] text-emerald-800 float-right flex items-center gap-0.5 font-semibold">
                      10:42 AM 
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2.5"><path d="M18 6L7 17l-5-5"></path><path d="M22 10l-7.5 7.5L13 16"></path></svg>
                    </span>
                  </div>
                </div>
              )}

              {/* 2 Hour Reminder Card Preview */}
              {enable2HourReminder && (
                <div className="flex justify-end">
                  <div className="bg-[#DCF8C6] rounded-lg rounded-tr-none p-2 max-w-[85%] shadow-xs border border-emerald-200 text-[10px] text-gray-800 space-y-0.5">
                    <div className="flex items-center gap-1 text-emerald-950 font-bold text-[10px]">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                      Reminder: Visit in 2 Hours
                    </div>
                    <p className="text-[9px] text-gray-700 leading-tight">
                      Your booking at {businessName} is scheduled for 4:30 PM.
                    </p>
                    <span className="text-[8px] text-emerald-800 float-right flex items-center gap-0.5 font-semibold">
                      2:30 PM 
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#0284C7" strokeWidth="2.5"><path d="M18 6L7 17l-5-5"></path><path d="M22 10l-7.5 7.5L13 16"></path></svg>
                    </span>
                  </div>
                </div>
              )}

            </div>

            {/* Chat Footer Input Mock */}
            <div className="bg-[#F0F2F5] p-1.5 flex items-center gap-1.5 border-t border-gray-200">
              <div className="text-gray-400 p-0.5">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><path d="M8 14s1.5 2 4 2 4-2 4-2"></path><line x1="9" y1="9" x2="9.01" y2="9"></line><line x1="15" y1="9" x2="15.01" y2="9"></line></svg>
              </div>
              <input
                type="text"
                disabled
                placeholder="Type a message..."
                className="flex-1 bg-white px-2.5 py-1 rounded-full text-[10px] text-gray-400 border border-gray-200 cursor-not-allowed"
              />
              <div className="w-6 h-6 rounded-full bg-[#128C7E] text-white flex items-center justify-center text-[10px] shadow-2xs">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path></svg>
              </div>
            </div>

          </div>
        </div>

      </div>

    </div>
  );
}
