"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WhatsappSetupPage() {
  const router = useRouter();

  const [whatsappPhone, setWhatsappPhone] = useState('+91 80472 84627');
  
  // Dynamic session & QR state
  const [qrStatus, setQrStatus] = useState<'waiting' | 'scanning' | 'connected'>('waiting');
  const [qrTimer, setQrTimer] = useState(58);

  // Automated feature toggles
  const [enableInstantCards, setEnableInstantCards] = useState(true);
  const [enable2HourReminder, setEnable2HourReminder] = useState(true);

  // Connection process state
  const [isSaving, setIsSaving] = useState(false);

  // Dynamic Business Data state from Onboarding Step 1
  const [businessName, setBusinessName] = useState('Sanjeevani Hospital & Multi-Speciality Clinic');
  const [businessCity, setBusinessCity] = useState('Delhi NCR');
  const [businessAddress, setBusinessAddress] = useState('456 Medical Parkway');
  const [businessVertical, setBusinessVertical] = useState('clinic');

  // Load user entered business details from Step 1
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
        if (parsed.phone || parsed.business_phone) setWhatsappPhone(parsed.phone || parsed.business_phone);
        if (parsed.vertical) setBusinessVertical(parsed.vertical);
      }
    } catch (e) {
      console.error('Failed to load stored business data:', e);
    }
  }, []);

  // Countdown timer for QR code freshness
  useEffect(() => {
    if (qrStatus !== 'waiting') return;
    const interval = setInterval(() => {
      setQrTimer((prev) => (prev > 1 ? prev - 1 : 60));
    }, 1000);
    return () => clearInterval(interval);
  }, [qrStatus]);

  const handleSimulateScan = () => {
    setQrStatus('scanning');
    setTimeout(() => {
      setQrStatus('connected');
    }, 1200);
  };

  const handleSaveAndContinue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      localStorage.setItem('onboarding_whatsapp_connected', 'true');
      localStorage.setItem('onboarding_whatsapp_phone', whatsappPhone);
    } catch (err) {
      console.error('Error saving whatsapp state:', err);
    }
    setTimeout(() => {
      setIsSaving(false);
      router.push('/onboarding/integrations');
    }, 600);
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
              <h1 className="text-base font-bold text-gray-900 tracking-tight">Connect WhatsApp Business</h1>
              <span className="bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border border-emerald-200">
                Instant QR Link
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              Scan the QR code below from your WhatsApp Business app to pair instantly.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          {qrStatus === 'connected' ? (
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-300 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Connected ({whatsappPhone})
            </span>
          ) : (
            <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Scan QR Code to Connect
            </span>
          )}
        </div>
      </div>

      {/* Main Content Layout: Left QR Scanner + Right Live WhatsApp Chat Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Left Panel: Direct QR Scanner */}
        <div className="lg:col-span-7 space-y-3">
          <div className="bg-white rounded-xl border border-gray-200/80 p-4 space-y-4">
            
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div>
                <h2 className="text-xs font-bold text-gray-900">Scan QR Code with your Phone</h2>
                <p className="text-[11px] text-gray-500">Links your WhatsApp Business account in 5 seconds.</p>
              </div>
              <span className="text-[9px] font-mono font-bold bg-emerald-50 text-[#128C7E] px-2 py-0.5 rounded border border-emerald-200">
                Official Web Engine
              </span>
            </div>

            {/* QR Scanner Display Area */}
            <div className="flex flex-col sm:flex-row items-center gap-4 bg-emerald-50/40 p-4 rounded-xl border border-emerald-100">
              
              {/* QR Scanner Box */}
              <div className="p-2.5 bg-white border-2 border-[#128C7E] rounded-xl shadow-xs flex flex-col items-center relative">
                <div className="w-36 h-36 bg-white rounded-lg flex flex-col items-center justify-center relative overflow-hidden p-1">
                  
                  {qrStatus === 'connected' ? (
                    <div className="flex flex-col items-center justify-center space-y-1 text-center p-2">
                      <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </div>
                      <span className="text-xs font-bold text-emerald-900">Device Linked!</span>
                      <span className="text-[10px] text-emerald-700 font-mono font-semibold">{whatsappPhone}</span>
                    </div>
                  ) : (
                    <>
                      {/* Vector QR Pattern */}
                      <svg width="130" height="130" viewBox="0 0 100 100" fill="none" className={`text-gray-900 transition-opacity ${qrStatus === 'scanning' ? 'opacity-30' : 'opacity-100'}`}>
                        <rect width="100" height="100" fill="#FFFFFF" />
                        <rect x="5" y="5" width="28" height="28" rx="4" fill="#075E54" />
                        <rect x="9" y="9" width="20" height="20" rx="2" fill="#FFFFFF" />
                        <rect x="13" y="13" width="12" height="12" rx="1" fill="#128C7E" />

                        <rect x="67" y="5" width="28" height="28" rx="4" fill="#075E54" />
                        <rect x="71" y="9" width="20" height="20" rx="2" fill="#FFFFFF" />
                        <rect x="75" y="13" width="12" height="12" rx="1" fill="#128C7E" />

                        <rect x="5" y="67" width="28" height="28" rx="4" fill="#075E54" />
                        <rect x="9" y="71" width="20" height="20" rx="2" fill="#FFFFFF" />
                        <rect x="13" y="75" width="12" height="12" rx="1" fill="#128C7E" />

                        <rect x="38" y="8" width="6" height="12" fill="#128C7E" />
                        <rect x="48" y="5" width="12" height="6" fill="#075E54" />
                        <rect x="38" y="24" width="22" height="6" fill="#25D366" />
                        
                        <rect x="5" y="38" width="12" height="6" fill="#075E54" />
                        <rect x="22" y="38" width="12" height="12" fill="#128C7E" />
                        
                        <rect x="38" y="38" width="24" height="24" rx="3" fill="#075E54" />
                        <path d="M44 48a6 6 0 1 1 10 4.5L52 55h-4l-1-2.5A6 6 0 0 1 44 48z" fill="#25D366" />
                        
                        <rect x="67" y="38" width="12" height="12" fill="#128C7E" />
                        <rect x="84" y="38" width="11" height="6" fill="#075E54" />
                        <rect x="67" y="54" width="28" height="6" fill="#25D366" />

                        <rect x="38" y="67" width="6" height="28" fill="#128C7E" />
                        <rect x="48" y="78" width="12" height="17" fill="#075E54" />
                        <rect x="67" y="67" width="12" height="12" fill="#075E54" />
                        <rect x="84" y="67" width="11" height="28" fill="#128C7E" />
                      </svg>

                      {qrStatus === 'waiting' && (
                        <div className="absolute inset-x-0 h-0.5 bg-[#25D366] shadow-[0_0_8px_#25D366] animate-[ping_2s_infinite]" />
                      )}

                      {qrStatus === 'scanning' && (
                        <div className="absolute inset-0 bg-emerald-950/70 backdrop-blur-xs flex flex-col items-center justify-center space-y-1 text-white">
                          <svg className="animate-spin h-5 w-5 text-[#25D366]" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                          </svg>
                          <span className="text-[10px] font-bold">Connecting...</span>
                        </div>
                      )}

                      <div className="absolute top-1.5 right-1.5 bg-black/70 text-white text-[8px] font-mono px-1.5 py-0.5 rounded flex items-center gap-1">
                        <span className="w-1 h-1 rounded-full bg-emerald-400 animate-pulse" />
                        {qrTimer}s
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Instructions */}
              <div className="flex-1 space-y-2">
                <h3 className="text-xs font-bold text-gray-900">How to Connect:</h3>
                <ol className="text-[11px] text-gray-600 space-y-1.5 list-decimal list-inside bg-white p-2.5 rounded-lg border border-gray-200/80">
                  <li>Open <strong>WhatsApp Business</strong> on your phone.</li>
                  <li>Tap <strong>Settings / Menu (⋮)</strong> ➔ <strong>Linked Devices</strong>.</li>
                  <li>Tap <strong>Link a Device</strong> and point camera at QR code.</li>
                </ol>

                <div className="pt-1.5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSimulateScan}
                    disabled={qrStatus === 'connected'}
                    className="px-3.5 py-1.5 text-xs font-bold bg-[#128C7E] text-white hover:bg-[#075E54] rounded-lg transition-colors shadow-2xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon>
                    </svg>
                    Test Instant Scan (Demo)
                  </button>
                  <button
                    type="button"
                    onClick={() => setQrTimer(60)}
                    className="px-3 py-1.5 text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M23 4v6h-6"></path>
                      <path d="M1 20v-6h6"></path>
                      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                    </svg>
                    Refresh QR
                  </button>
                </div>
              </div>
            </div>

            {/* Business Phone Number Field */}
            <div>
              <label className="text-[11px] font-bold text-gray-800 mb-1 block">
                Connected WhatsApp Business Phone Number
              </label>
              <input
                type="tel"
                value={whatsappPhone}
                onChange={(e) => setWhatsappPhone(e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#128C7E] focus:outline-none font-mono"
              />
            </div>

            {/* AUTOMATED FEATURES TOGGLE SECTION */}
            <div className="pt-3 border-t border-gray-100 space-y-2">
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
                    <span className="text-[10px] text-gray-500 block">Sends confirmation card &amp; location right after AI call ends.</span>
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
                    <span className="text-[10px] text-gray-500 block">Automated WhatsApp Ping 2 hours before appointment.</span>
                  </div>
                </label>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => router.push('/onboarding/integrations')}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAndContinue}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-white bg-[#128C7E] hover:bg-[#075E54] rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
              >
                {isSaving ? 'Saving...' : 'Save & Activate WhatsApp'}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                  <polyline points="12 5 19 12 12 19"></polyline>
                </svg>
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
                    <span className="w-3 h-3 bg-emerald-400 text-gray-900 rounded-full flex items-center justify-center font-bold text-[8px]">
                      ✓
                    </span>
                  </h3>
                  <p className="text-[9px] text-emerald-200">Official Business Account • Online</p>
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
