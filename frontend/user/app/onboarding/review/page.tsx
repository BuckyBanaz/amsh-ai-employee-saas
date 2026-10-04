"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';
import { StorageService } from '../../../services/storage.service';
import { PolicyAcceptance } from '../../../components/policies/PolicyAcceptance';

export default function ReviewOnboardingPage() {
  const router = useRouter();
  // Policies for this business's region: the owner must accept them before launching (the AI's own rules for the region are listed beside them).
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [policiesPending, setPoliciesPending] = useState(0);
  useEffect(() => { setBusinessId(StorageService.getBusinessId()); }, []);

  // 1. Business Info
  const [businessInfo, setBusinessInfo] = useState({
    name: '',
    vertical: 'clinic',
    address: '',
    city: '',
    country: 'India',
    phone: ''
  });

  // 2. Business Hours
  const [hours, setHours] = useState<{ day: string; isOpen: boolean; openTime: string; closeTime: string }[]>([]);

  // 3. Services
  const [services, setServices] = useState<{ title: string; duration_minutes?: number; price_amount?: number; price_currency?: string }[]>([]);

  // 4. Staff Team
  const [staff, setStaff] = useState<{ name: string; role?: string; email?: string }[]>([]);

  // 5. AI Receptionist
  const [aiSettings, setAiSettings] = useState({
    agentName: 'Aria',
    voiceTone: 'Professional',
    languages: 'English',
    transferPhone: '',
    capabilities: 'Instant Booking, Inquiries, Call Forwarding'
  });

  // 6. Knowledge Base Summary
  const [knowledgeStats, setKnowledgeStats] = useState({
    docsCount: 0,
    sitesCount: 0,
    faqsCount: 0
  });

  // 7. Telephony & WhatsApp Integrations
  const [telephonyNumber, setTelephonyNumber] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappConnected, setWhatsappConnected] = useState(true);

  // Load all actual entered data from localStorage
  useEffect(() => {
    try {
      // 1. Business Info
      let bCountry = 'India';
      let bPhone = '';
      const rawBiz = localStorage.getItem('onboarding_business_data');
      if (rawBiz) {
        const parsed = JSON.parse(rawBiz);
        bCountry = parsed.country || 'India';
        bPhone = parsed.phone || parsed.business_phone || '';
        setBusinessInfo({
          name: parsed.businessName || parsed.name || 'Your Business',
          vertical: parsed.vertical || 'clinic',
          address: parsed.address || 'Address provided',
          city: parsed.city || '',
          country: bCountry,
          phone: bPhone
        });
      }

      // 2. Hours
      const rawHours = localStorage.getItem('onboarding_hours') || localStorage.getItem('onboarding_hours_data');
      if (rawHours) {
        const parsed = JSON.parse(rawHours);
        const scheduleArr = parsed.schedule || (Array.isArray(parsed) ? parsed : null);
        if (scheduleArr && Array.isArray(scheduleArr)) {
          const formatted = scheduleArr.map((d: any) => {
            const active = d.active !== false;
            const ranges = d.ranges || [];
            const openTime = ranges[0]?.start || '09:00';
            const closeTime = ranges[ranges.length - 1]?.end || '18:00';
            return {
              day: d.day,
              isOpen: active && ranges.length > 0,
              openTime,
              closeTime
            };
          });
          setHours(formatted);
        } else if (typeof parsed === 'object') {
          const arr = Object.keys(parsed).map((d) => ({
            day: d,
            isOpen: parsed[d].isOpen !== false,
            openTime: parsed[d].openTime || parsed[d].open || '09:00',
            closeTime: parsed[d].closeTime || parsed[d].close || '18:00'
          }));
          if (arr.length > 0) setHours(arr);
        }
      }

      // 3. Services
      const rawServices = localStorage.getItem('onboarding_services') || localStorage.getItem('onboarding_services_data');
      if (rawServices) {
        const parsed = JSON.parse(rawServices);
        if (Array.isArray(parsed)) {
          setServices(parsed);
        }
      }

      // 4. Staff
      const rawStaff = localStorage.getItem('onboarding_staff') || localStorage.getItem('onboarding_staff_data');
      if (rawStaff) {
        const parsed = JSON.parse(rawStaff);
        if (Array.isArray(parsed)) {
          setStaff(parsed);
        }
      }

      // 5. AI Receptionist
      const rawAi = localStorage.getItem('onboarding_ai_receptionist');
      if (rawAi) {
        const parsed = JSON.parse(rawAi);
        setAiSettings({
          agentName: parsed.aiName || parsed.agentName || 'Aria',
          voiceTone: parsed.selectedPersonality || parsed.voiceTone || 'Professional',
          languages: parsed.primaryLanguage === 'en' ? 'English' : (parsed.primaryLanguage ? `${parsed.primaryLanguage}` : 'English'),
          transferPhone: parsed.transferPhone || bPhone || 'Not configured',
          capabilities: 'Instant Booking, Inquiries, Call Forwarding'
        });
      } else if (bPhone) {
        setAiSettings(prev => ({ ...prev, transferPhone: bPhone }));
      }

      // 6. Knowledge
      const rawDocs = localStorage.getItem('onboarding_knowledge_docs');
      const rawFaqs = localStorage.getItem('onboarding_knowledge_faqs');
      const rawSites = localStorage.getItem('onboarding_knowledge_urls') || localStorage.getItem('onboarding_knowledge_sites');
      setKnowledgeStats({
        docsCount: rawDocs ? (JSON.parse(rawDocs).length || 0) : 0,
        sitesCount: rawSites ? (JSON.parse(rawSites).length || 0) : 0,
        faqsCount: rawFaqs ? (JSON.parse(rawFaqs).length || 0) : 0
      });

      // 7. Integrations
      const savedTelephony = localStorage.getItem('onboarding_telephony_phone');
      if (savedTelephony) {
        setTelephonyNumber(savedTelephony);
      } else if (bPhone) {
        setTelephonyNumber(bPhone);
      } else {
        setTelephonyNumber(bCountry === 'India' ? '+91 80472 84627' : '+1 (656) 254-7488');
      }

      const savedWa = localStorage.getItem('onboarding_whatsapp_phone');
      if (savedWa) {
        setWhatsappNumber(savedWa);
      } else if (bPhone) {
        setWhatsappNumber(bPhone);
      } else {
        setWhatsappNumber('+91 89014 14107');
      }

      const isWaConn = localStorage.getItem('onboarding_whatsapp_connected');
      if (isWaConn !== null) setWhatsappConnected(isWaConn === 'true');
    } catch (e) {
      console.error('Failed to load review data from localStorage:', e);
    }
  }, []);

  const isIndia = businessInfo.country.toLowerCase().includes('india');

  return (
    <div className="w-full max-w-4xl bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
      
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{STRINGS.ONBOARDING.REVIEW.TITLE}</h1>
          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded uppercase border border-emerald-200">
            Ready to Launch
          </span>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed max-w-3xl">
          Review your configured AI Receptionist settings and active communication channels before launching.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5 mb-6">
        
        {/* 1. Business Details */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white hover:border-gray-300 transition-colors shadow-2xs">
          <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#0066FF]"></span>
              {STRINGS.ONBOARDING.REVIEW.SECTIONS.BUSINESS.TITLE}
            </h2>
            <button 
              type="button"
              onClick={() => router.push('/onboarding/business')}
              className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors cursor-pointer"
            >
              {STRINGS.ONBOARDING.REVIEW.EDIT_BTN}
            </button>
          </div>
          <div className="space-y-2.5">
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">Business / Practice Name</span>
              <span className="text-xs font-bold text-gray-900 text-right">{businessInfo.name}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">Industry Vertical</span>
              <span className="text-xs font-semibold text-gray-800 capitalize bg-gray-100 px-2 py-0.5 rounded text-right">
                {businessInfo.vertical}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">Location</span>
              <span className="text-xs font-medium text-gray-900 text-right">
                {businessInfo.address}, {businessInfo.city}, {businessInfo.country}
              </span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">Primary Contact Phone</span>
              <span className="text-xs font-mono font-medium text-gray-900 text-right">{businessInfo.phone}</span>
            </div>
          </div>
        </div>

        {/* 2. Business Hours */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white hover:border-gray-300 transition-colors shadow-2xs">
          <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {STRINGS.ONBOARDING.REVIEW.SECTIONS.HOURS.TITLE}
            </h2>
            <button 
              type="button"
              onClick={() => router.push('/onboarding/hours')}
              className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors cursor-pointer"
            >
              {STRINGS.ONBOARDING.REVIEW.EDIT_BTN}
            </button>
          </div>
          {hours.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-3 text-center">No business hours configured yet</p>
          ) : (
            <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
              {hours.slice(0, 5).map((h, i) => (
                <div key={i} className="flex justify-between items-center text-xs">
                  <span className="text-gray-500 font-medium">{h.day}</span>
                  <span className={`font-semibold ${h.isOpen ? 'text-gray-900' : 'text-gray-400'}`}>
                    {h.isOpen ? `${h.openTime} - ${h.closeTime}` : 'Closed'}
                  </span>
                </div>
              ))}
              {hours.length > 5 && (
                <div className="flex justify-between items-center text-xs pt-1 border-t border-gray-100">
                  <span className="text-gray-500 font-medium">Weekend</span>
                  <span className="text-gray-900 font-semibold">
                    {hours.find(h => h.day.toLowerCase().includes('sat'))?.isOpen ? 'Saturday Open' : 'Custom Hours'}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* 3. Configured Services */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white hover:border-gray-300 transition-colors shadow-2xs">
          <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
              {STRINGS.ONBOARDING.REVIEW.SECTIONS.SERVICES.TITLE} ({services.length})
            </h2>
            <button 
              type="button"
              onClick={() => router.push('/onboarding/services')}
              className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors cursor-pointer"
            >
              {STRINGS.ONBOARDING.REVIEW.EDIT_BTN}
            </button>
          </div>
          {services.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-3 text-center">No services added yet</p>
          ) : (
            <ul className="space-y-2 max-h-[135px] overflow-y-auto pr-1">
              {services.map((srv, idx) => (
                <li key={idx} className="flex items-center justify-between text-xs bg-gray-50/70 px-2.5 py-1.5 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#0066FF]"></div>
                    <span className="font-semibold text-gray-900">{srv.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-500 font-mono text-[11px]">
                    {srv.duration_minutes && <span>{srv.duration_minutes}m</span>}
                    {srv.price_amount !== undefined && (
                      <span className="font-bold text-gray-900">
                        {srv.price_currency === 'INR' || !srv.price_currency ? '₹' : '$'}{srv.price_amount}
                      </span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 4. Staff Team */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white hover:border-gray-300 transition-colors shadow-2xs">
          <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Assigned Team ({staff.length})
            </h2>
            <button 
              type="button"
              onClick={() => router.push('/onboarding/staff')}
              className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors cursor-pointer"
            >
              {STRINGS.ONBOARDING.REVIEW.EDIT_BTN}
            </button>
          </div>
          {staff.length === 0 ? (
            <p className="text-xs text-gray-400 italic py-3 text-center">No team members added yet</p>
          ) : (
            <ul className="space-y-2 max-h-[135px] overflow-y-auto pr-1">
              {staff.map((st, idx) => (
                <li key={idx} className="flex items-center justify-between text-xs bg-gray-50/70 px-2.5 py-1.5 rounded-lg border border-gray-100">
                  <div className="flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div>
                    <span className="font-bold text-gray-900">{st.name}</span>
                  </div>
                  <span className="text-[11px] text-gray-500 font-medium">
                    {st.role || 'Practitioner'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* 5. AI Receptionist Persona */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white hover:border-gray-300 transition-colors shadow-2xs">
          <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-violet-500"></span>
              {STRINGS.ONBOARDING.REVIEW.SECTIONS.AI.TITLE}
            </h2>
            <button 
              type="button"
              onClick={() => router.push('/onboarding/ai-receptionist')}
              className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors cursor-pointer"
            >
              {STRINGS.ONBOARDING.REVIEW.EDIT_BTN}
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">Agent Voice Persona</span>
              <span className="text-xs font-bold text-gray-900 text-right">{aiSettings.agentName} ({aiSettings.voiceTone})</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">Languages Supported</span>
              <span className="text-xs font-semibold text-gray-900 text-right">{aiSettings.languages}</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">Human Transfer Line</span>
              <span className="text-xs font-mono font-bold text-[#0066FF] text-right">{aiSettings.transferPhone}</span>
            </div>
          </div>
        </div>

        {/* 6. Knowledge Base / RAG Grounding */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white hover:border-gray-300 transition-colors shadow-2xs">
          <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              {STRINGS.ONBOARDING.REVIEW.SECTIONS.KNOWLEDGE.TITLE}
            </h2>
            <button 
              type="button"
              onClick={() => router.push('/onboarding/knowledge')}
              className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors cursor-pointer"
            >
              {STRINGS.ONBOARDING.REVIEW.EDIT_BTN}
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">Clinical Guidelines &amp; PDFs</span>
              <span className="text-xs font-semibold text-gray-900 text-right">{knowledgeStats.docsCount} Indexed Document(s)</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">Live Website Crawl</span>
              <span className="text-xs font-semibold text-gray-900 text-right">{knowledgeStats.sitesCount} Synced Web URL(s)</span>
            </div>
            <div className="flex justify-between items-start">
              <span className="text-xs text-gray-500">Clinic FAQs &amp; Policies</span>
              <span className="text-xs font-semibold text-gray-900 text-right">{knowledgeStats.faqsCount} Instant Q&amp;As</span>
            </div>
          </div>
        </div>

        {/* 7. Active Communication Channels (Telephony & WhatsApp) */}
        <div className="border border-gray-200 rounded-xl p-4 bg-white hover:border-gray-300 transition-colors lg:col-span-2 shadow-2xs">
          <div className="flex items-center justify-between mb-3 border-b border-gray-100 pb-2">
            <h2 className="text-xs font-bold text-gray-900 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              Configured Communication Channels
            </h2>
            <button 
              type="button"
              onClick={() => router.push('/onboarding/integrations')}
              className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors cursor-pointer"
            >
              {STRINGS.ONBOARDING.REVIEW.EDIT_BTN}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            
            {/* Telephony Channel */}
            <div className="p-3 bg-blue-50/50 rounded-xl border border-blue-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#0066FF] flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">
                    {isIndia ? 'Exotel Indian Voice Line' : 'Twilio Voice Line'}
                  </h4>
                  <p className="text-[11px] font-mono text-gray-600 font-semibold">{telephonyNumber}</p>
                </div>
              </div>
              <span className="bg-[#E6FBF3] text-[#10B981] text-[9px] font-extrabold px-2 py-0.5 rounded uppercase">
                Active Line
              </span>
            </div>

            {/* WhatsApp Business Channel */}
            <div className="p-3 bg-emerald-50/50 rounded-xl border border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-[#128C7E] flex items-center justify-center">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900">WhatsApp Business Cards</h4>
                  <p className="text-[11px] font-mono text-gray-600 font-semibold">{whatsappNumber}</p>
                </div>
              </div>
              <span className="bg-[#E6FBF3] text-[#10B981] text-[9px] font-extrabold px-2 py-0.5 rounded uppercase">
                Ready
              </span>
            </div>

          </div>
        </div>

      </div>

      {businessId && (
        <div className="mt-6">
          <h2 className="mb-2 text-base font-bold text-gray-900">Policies and privacy</h2>
          <PolicyAcceptance businessId={businessId} onPending={setPoliciesPending} />
        </div>
      )}

      {/* Footer Navigation */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/integrations')}
          className="px-5 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-xs cursor-pointer"
        >
          {STRINGS.ONBOARDING.REVIEW.BACK_BTN}
        </button>
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/plans')}
          disabled={policiesPending > 0}
          title={policiesPending > 0 ? 'Accept the policies above to continue' : undefined}
          className="px-6 py-2.5 rounded-lg bg-[#0066FF] hover:bg-[#0052cc] text-white text-sm font-bold transition-all shadow-sm cursor-pointer flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <span>Select Subscription Plan</span>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <polyline points="12 5 19 12 12 19"></polyline>
          </svg>
        </button>
      </div>

    </div>
  );
}
