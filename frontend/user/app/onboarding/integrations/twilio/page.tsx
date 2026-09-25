"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function TwilioSetupPage() {
  const router = useRouter();

  const [telephonyMode, setTelephonyMode] = useState<'new_number' | 'forwarding'>('new_number');
  const [businessCountry, setBusinessCountry] = useState('India');
  const [selectedCountry, setSelectedCountry] = useState('IN (+91)');
  const [areaCode, setAreaCode] = useState('080');
  const [isSearching, setIsSearching] = useState(false);

  React.useEffect(() => {
    try {
      let savedEscalation = '';
      const savedAgent = localStorage.getItem('onboarding_ai_receptionist');
      if (savedAgent) {
        const parsedAgent = JSON.parse(savedAgent);
        if (parsedAgent.transferPhone) {
          savedEscalation = parsedAgent.transferPhone;
        }
      }

      const storedData = localStorage.getItem('onboarding_business_data');
      if (storedData) {
        const parsed = JSON.parse(storedData);
        if (parsed.country) {
          setBusinessCountry(parsed.country);
          if (parsed.country === 'India') {
            setSelectedCountry('IN (+91)');
            setAreaCode('080');
            setSelectedNumber('+91 80472 84627');
            setExistingPhone(parsed.phone || '');
            setHumanTransferPhone(savedEscalation || parsed.phone || '');
          } else {
            setSelectedCountry('US (+1)');
            setAreaCode('656');
            setSelectedNumber('+1 (656) 254-7488');
            setExistingPhone(parsed.phone || '');
            setHumanTransferPhone(savedEscalation || parsed.phone || '');
          }
        }
      } else if (savedEscalation) {
        setHumanTransferPhone(savedEscalation);
      }
    } catch (e) {
      console.error('Failed to parse business country:', e);
    }
  }, []);

  const isIndia = businessCountry === 'India' || selectedCountry.includes('+91');

  const availableNumbers = isIndia ? [
    { number: `+91 ${areaCode === '080' ? '80472 84627' : '80472 84627'}`, locality: `Exotel Direct Indian Line • STD (${areaCode})`, feature: 'Exotel HD • Sub-50ms Latency' },
    { number: `+91 ${areaCode === '080' ? '80472 84628' : '80472 84628'}`, locality: `Exotel Toll-Free Line • India`, feature: 'Exotel HD • Toll Free' },
    { number: `+91 ${areaCode === '080' ? '80472 84629' : '80472 84629'}`, locality: `Exotel Smart Trunk Line • India`, feature: 'Exotel HD • Call Recording' },
  ] : [
    { number: `+1 (${areaCode}) 254-7488`, locality: `Twilio US Direct Line • Area Code (${areaCode})`, feature: 'Twilio HD • Ultra Low Latency' },
    { number: `+1 (${areaCode}) 254-7489`, locality: `Twilio Toll-Free Line • Area Code (${areaCode})`, feature: 'Twilio HD • SIP Trunk' },
    { number: `+1 (${areaCode}) 254-7490`, locality: `Twilio Digital Carrier • Area Code (${areaCode})`, feature: 'Twilio HD • Call Recording' },
  ];

  const [selectedNumber, setSelectedNumber] = useState(availableNumbers[0].number);
  const [existingPhone, setExistingPhone] = useState('');
  const [humanTransferPhone, setHumanTransferPhone] = useState('');

  const [isSaving, setIsSaving] = useState(false);

  const handleSearch = () => {
    setIsSearching(true);
    setTimeout(() => {
      setIsSearching(false);
    }, 400);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      localStorage.setItem('onboarding_telephony_connected', 'true');
      localStorage.setItem('onboarding_telephony_phone', selectedNumber);
      localStorage.setItem('onboarding_telephony_provider', isIndia ? 'exotel' : 'twilio');
      localStorage.setItem('onboarding_telephony_escalation', humanTransferPhone);

      try {
        const savedAgent = localStorage.getItem('onboarding_ai_receptionist');
        const agentData = savedAgent ? JSON.parse(savedAgent) : {};
        agentData.transferPhone = humanTransferPhone;
        localStorage.setItem('onboarding_ai_receptionist', JSON.stringify(agentData));
      } catch (err) {
        console.error('Error syncing transfer phone to agent settings:', err);
      }
    } catch (err) {
      console.error('Error saving telephony settings:', err);
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
            className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-white transition-colors"
            title="Back to Integrations"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
          </button>

          <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0066FF] flex items-center justify-center border border-blue-200">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-gray-900 tracking-tight">
                {isIndia ? 'Exotel Telephony Carrier (+91 India)' : 'Twilio Telephony & Phone Line'}
              </h1>
              <span className="bg-blue-100 text-blue-800 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase border border-blue-200">
                {isIndia ? 'Exotel Indian Voice Engine' : 'Twilio Global Voice Engine'}
              </span>
            </div>
            <p className="text-[11px] text-gray-500">
              {isIndia 
                ? 'Allocate a dedicated +91 Indian HD voice line (Exotel) or set up smart forwarding for your AI Receptionist.' 
                : 'Allocate a dedicated HD voice line (Twilio) or set up smart forwarding for your AI Receptionist.'}
            </p>
          </div>
        </div>
      </div>

      {/* Mode Selector Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        
        <div
          onClick={() => setTelephonyMode('new_number')}
          className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
            telephonyMode === 'new_number'
              ? 'bg-white border-[#0066FF] shadow-xs ring-1 ring-[#0066FF]/20'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0066FF] flex items-center justify-center border border-blue-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
            </div>
            {telephonyMode === 'new_number' && <span className="w-2 h-2 rounded-full bg-[#0066FF]" />}
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900">Dedicated AI Phone Line</h3>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
              Allocate a brand new toll-free or local HD voice number.
            </p>
          </div>
          <span className="mt-3 text-[9px] font-semibold text-[#0066FF] bg-blue-50 px-2 py-0.5 rounded border border-blue-200/60 self-start">
            Recommended
          </span>
        </div>

        <div
          onClick={() => setTelephonyMode('forwarding')}
          className={`p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
            telephonyMode === 'forwarding'
              ? 'bg-white border-[#0066FF] shadow-xs ring-1 ring-[#0066FF]/20'
              : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-100">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 14 20 9 15 4"></polyline>
                <path d="M4 20v-7a4 4 0 0 1 4-4h12"></path>
              </svg>
            </div>
            {telephonyMode === 'forwarding' && <span className="w-2 h-2 rounded-full bg-[#0066FF]" />}
          </div>
          <div>
            <h3 className="text-xs font-bold text-gray-900">Smart Call Forwarding</h3>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
              Keep your existing clinic phone number and forward unanswered calls.
            </p>
          </div>
          <span className="mt-3 text-[9px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200/60 self-start">
            No Number Change
          </span>
        </div>

      </div>

      {/* Configuration Form Card */}
      <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200/80 p-4 space-y-4">

        {telephonyMode === 'new_number' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-1.5">
              1. Select Carrier Country &amp; Area Code
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-0.5 block">Country</label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#0066FF]"
                >
                  <option value="US (+1)">United States (+1)</option>
                  <option value="IN (+91)">India (+91)</option>
                  <option value="UK (+44)">United Kingdom (+44)</option>
                  <option value="CA (+1)">Canada (+1)</option>
                  <option value="AU (+61)">Australia (+61)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-0.5 block">Area Code</label>
                <input
                  type="text"
                  value={areaCode}
                  onChange={(e) => setAreaCode(e.target.value)}
                  placeholder="e.g. 555"
                  className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg font-mono focus:ring-2 focus:ring-[#0066FF]"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleSearch}
                  disabled={isSearching}
                  className="w-full py-1.5 px-3 text-xs font-bold bg-[#0066FF] text-white hover:bg-[#0052cc] rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  {isSearching ? 'Searching...' : 'Search Numbers'}
                </button>
              </div>
            </div>

            <div className="pt-1 space-y-1.5">
              <label className="text-xs font-bold text-gray-900 block">Available HD Telephony Lines:</label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {availableNumbers.map((item) => (
                  <div
                    key={item.number}
                    onClick={() => setSelectedNumber(item.number)}
                    className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedNumber === item.number
                        ? 'bg-blue-50/50 border-[#0066FF] shadow-2xs'
                        : 'bg-white border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-xs font-mono font-bold text-gray-900 block">{item.number}</span>
                    <span className="text-[10px] text-gray-500 block mt-0.5">{item.locality}</span>
                    <span className="text-[8px] font-bold text-emerald-700 bg-emerald-100/60 px-1.5 py-0.5 rounded inline-block mt-1.5 border border-emerald-200">
                      {item.feature}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {telephonyMode === 'forwarding' && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-gray-900 border-b border-gray-100 pb-1.5">
              1. Smart Call Forwarding Setup
            </h3>

            <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg space-y-1">
              <h4 className="text-xs font-bold text-purple-950">Call Forwarding Steps:</h4>
              <ol className="text-[11px] text-purple-900 list-decimal list-inside space-y-0.5">
                <li>Keep main clinic number: <code>+1 (555) 234-5678</code>.</li>
                <li>Dial carrier code to forward unanswered calls to AMSh AI.</li>
              </ol>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-gray-700 mb-0.5 block">Clinic Phone Number</label>
              <input
                type="tel"
                value={existingPhone}
                onChange={(e) => setExistingPhone(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg font-mono"
              />
            </div>
          </div>
        )}

        {/* Human Escalation Transfer Number */}
        <div className="pt-3 border-t border-gray-100 space-y-2">
          <h3 className="text-xs font-bold text-gray-900">2. Emergency Human Agent Escalation Line</h3>
          <p className="text-[11px] text-gray-500">
            When a caller requests a human receptionist or doctor, AMSh AI will instantly transfer the live call.
          </p>

          <div>
            <label className="text-[11px] font-semibold text-gray-700 mb-0.5 block">Human Escalation Phone Number</label>
            <input
              type="tel"
              value={humanTransferPhone}
              onChange={(e) => setHumanTransferPhone(e.target.value)}
              placeholder="+1 (555) 987-6543"
              className="w-full px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-lg font-mono focus:ring-2 focus:ring-[#0066FF]"
              required
            />
          </div>
        </div>

        {/* Save & Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={() => router.push('/onboarding/integrations')}
            className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-4 py-2 text-xs font-bold text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
          >
            {isSaving ? 'Allocating...' : 'Save & Link Line'}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="5" y1="12" x2="19" y2="12"></line>
              <polyline points="12 5 19 12 12 19"></polyline>
            </svg>
          </button>
        </div>

      </form>

    </div>
  );
}
