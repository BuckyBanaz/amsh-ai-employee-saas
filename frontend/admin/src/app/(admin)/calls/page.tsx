"use client";
import React, { useState } from 'react';
import Link from 'next/link';

interface CallRecord {
  id: string;
  businessId: string;
  businessName: string;
  callerNumber: string;
  callerName?: string;
  time: string;
  duration: string;
  intent: string;
  outcome: 'Resolved' | 'Transferred' | 'Failed';
  outcomeColor: { bg: string; text: string };
  aiReceptionist: string;
  engine: string;
  latency: string;
  summary: string;
  transcript: { speaker: 'AI' | 'User'; text: string }[];
}

const callsData: CallRecord[] = [
  {
    id: 'call-1',
    businessId: 'b-1',
    businessName: 'Smile Dental Clinic',
    callerNumber: '+31 6 1234 5678',
    callerName: 'Sarah Wilson',
    time: '10:24 AM',
    duration: '2:45',
    intent: 'Booking',
    outcome: 'Resolved',
    outcomeColor: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
    aiReceptionist: 'Sarah',
    engine: 'ElevenLabs V2 (Rachel)',
    latency: '240ms',
    summary: 'Patient requested dental cleaning booking for next Tuesday. AI booked slot successfully with Dr. Evans.',
    transcript: [
      { speaker: 'AI', text: 'Good morning, thank you for calling Smile Dental Clinic. I am Sarah, your AI assistant. How may I help you today?' },
      { speaker: 'User', text: 'Hi Sarah, I would like to book a routine teeth cleaning for next Tuesday morning if possible.' },
      { speaker: 'AI', text: 'Certainly! I have an opening at 10:00 AM on Tuesday with Dr. Evans. Would that work for you?' },
      { speaker: 'User', text: 'Yes, 10:00 AM is perfect, thank you!' },
      { speaker: 'AI', text: 'Splendid! Your appointment is locked in for Tuesday at 10:00 AM. I have sent an SMS confirmation to your number.' },
    ],
  },
  {
    id: 'call-2',
    businessId: 'b-2',
    businessName: 'Amsterdam Dental Care',
    callerNumber: '+31 8 9876 5432',
    callerName: 'Mark de Jong',
    time: '10:18 AM',
    duration: '4:12',
    intent: 'Reschedule',
    outcome: 'Resolved',
    outcomeColor: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
    aiReceptionist: 'Anna',
    engine: 'ElevenLabs V2 (Bella)',
    latency: '260ms',
    summary: 'Caller requested rescheduling existing checkup appointment to Friday afternoon. Completed smoothly.',
    transcript: [
      { speaker: 'AI', text: 'Hello, thank you for contacting Amsterdam Dental Care. How can I assist you?' },
      { speaker: 'User', text: 'I need to move my appointment on Thursday to Friday afternoon.' },
      { speaker: 'AI', text: 'No problem. We have 3:30 PM open on Friday. Shall I update your booking?' },
      { speaker: 'User', text: 'Yes please, thank you very much.' },
    ],
  },
  {
    id: 'call-3',
    businessId: 'b-3',
    businessName: 'Berlin Health Center',
    callerNumber: '+49 170 998877',
    callerName: 'Klaus Schmidt',
    time: '10:05 AM',
    duration: '1:30',
    intent: 'Emergency',
    outcome: 'Transferred',
    outcomeColor: { bg: 'bg-[#FFEDD5]', text: 'text-[#C2410C]' },
    aiReceptionist: 'Dieter',
    engine: 'Cartesia (Sonic DE)',
    latency: '190ms',
    summary: 'Caller reported acute dental trauma and severe pain. AI instantly routed to emergency staff line.',
    transcript: [
      { speaker: 'AI', text: 'Guten Tag, Berlin Health Center. Wie kann ich Ihnen helfen?' },
      { speaker: 'User', text: 'Ich habe starke Zahnschmerzen und brauche sofort einen Notfalltermin!' },
      { speaker: 'AI', text: 'Verstanden. Ich verbinde Sie sofort mit unserem Notdienst.' },
    ],
  },
  {
    id: 'call-4',
    businessId: 'b-4',
    businessName: 'Bella Rosa Ristorante',
    callerNumber: '+49 172 112233',
    callerName: 'Marco Rossi',
    time: '09:50 AM',
    duration: '0:45',
    intent: 'Pricing Q',
    outcome: 'Resolved',
    outcomeColor: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
    aiReceptionist: 'Sofia',
    engine: 'ElevenLabs V2 (Serena)',
    latency: '220ms',
    summary: 'Caller enquired about dinner tasting menu pricing and wine pairing. AI provided exact menu details.',
    transcript: [
      { speaker: 'AI', text: 'Buongiorno! Welcome to Bella Rosa Ristorante. How can I help you today?' },
      { speaker: 'User', text: 'Could you tell me the cost of your 5-course weekend tasting menu?' },
      { speaker: 'AI', text: 'Our 5-course tasting menu is €75 per guest, with optional wine pairing for €35.' },
    ],
  },
  {
    id: 'call-5',
    businessId: 'b-5',
    businessName: 'Glow & Shine Salon',
    callerNumber: '+33 6 554433',
    callerName: 'Marie Dubois',
    time: '09:42 AM',
    duration: '3:10',
    intent: 'Cancelled',
    outcome: 'Failed',
    outcomeColor: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' },
    aiReceptionist: 'Chloé',
    engine: 'Cartesia (Clara FR)',
    latency: '310ms',
    summary: 'Caller disconnected abruptly after requesting cancellation policy details.',
    transcript: [
      { speaker: 'AI', text: 'Bonjour, bienvenue chez Glow & Shine Salon.' },
      { speaker: 'User', text: 'What is your refund policy for missed hair color sessions?' },
      { speaker: 'AI', text: 'We require 24 hours notice for a full deposit refund...' },
    ],
  },
  {
    id: 'call-6',
    businessId: 'b-6',
    businessName: 'FitLife Studio',
    callerNumber: '+44 7700 900077',
    callerName: 'James Smith',
    time: '09:15 AM',
    duration: '5:20',
    intent: 'Complex Case',
    outcome: 'Transferred',
    outcomeColor: { bg: 'bg-[#FFEDD5]', text: 'text-[#C2410C]' },
    aiReceptionist: 'Oliver',
    engine: 'ElevenLabs V2 (Adam)',
    latency: '250ms',
    summary: 'Corporate wellness membership inquiry requiring custom contract. Transferred to Sales.',
    transcript: [
      { speaker: 'AI', text: 'Hi, FitLife Studio. How can I get you moving today?' },
      { speaker: 'User', text: 'We have 250 employees and want corporate gym passes with custom billing.' },
      { speaker: 'AI', text: 'That sounds fantastic! Let me connect you directly with our Corporate Accounts Director.' },
    ],
  },
];

export default function CallsMonitoringPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [selectedIntent, setSelectedIntent] = useState('All');
  const [selectedCall, setSelectedCall] = useState<CallRecord>(callsData[0]);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);

  const filteredCalls = callsData.filter((call) => {
    const matchesSearch =
      call.callerNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      call.intent.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (call.callerName && call.callerName.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesBusiness =
      selectedBusiness === 'All' || call.businessName === selectedBusiness;

    const matchesStatus =
      selectedStatus === 'All' || call.outcome === selectedStatus;

    const matchesIntent =
      selectedIntent === 'All' || call.intent === selectedIntent;

    return matchesSearch && matchesBusiness && matchesStatus && matchesIntent;
  });

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-5 md:p-6 animate-in fade-in duration-300 text-[13px]">
      {/* Compact Header */}
      <header className="mb-4 pb-3.5 border-b border-[#E2E8F0] flex justify-between items-center">
        <div>
          <h1 className="text-[20px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Calls
          </h1>
          <p className="text-[12px] text-[#475569] mt-0.5 font-normal">
            Platform-wide real-time call monitoring.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 border border-[#E2E8F0] rounded-lg py-1.5 px-2.5 text-[12px] font-medium text-[#475569] bg-white shadow-sm hover:bg-gray-50 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Jan 1 - Jan 30, 2026
          </button>
          <button className="flex items-center justify-center border border-[#E2E8F0] rounded-full w-8 h-8 text-[#475569] bg-white shadow-sm hover:bg-gray-50 transition-colors">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>
      </header>

      {/* Compact Top 5 KPI Metrics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
            CALLS TODAY
          </div>
          <div className="text-[20px] font-bold text-[#0F172A] leading-none mb-1">
            4,892
          </div>
          <div className="text-[10px] font-semibold text-[#10B981]">
            +1,201 vs yest
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
            AVERAGE DURATION
          </div>
          <div className="text-[20px] font-bold text-[#0F172A] leading-none mb-1">
            3:24
          </div>
          <div className="text-[10px] font-semibold text-[#10B981]">
            -12s efficiency
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
            AI RESOLUTION
          </div>
          <div className="text-[20px] font-bold text-[#0F172A] leading-none mb-1">
            82.4%
          </div>
          <div className="text-[10px] font-semibold text-[#10B981]">
            +1.2% this week
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
            TRANSFERRED
          </div>
          <div className="text-[20px] font-bold text-[#0F172A] leading-none mb-1">
            412
          </div>
          <div className="text-[10px] font-semibold text-[#C2410C]">
            8.4% of total
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
            FAILED CALLS
          </div>
          <div className="text-[20px] font-bold text-[#0F172A] leading-none mb-1">
            23
          </div>
          <div className="text-[10px] font-semibold text-[#EF4444]">
            -4% vs last week
          </div>
        </div>
      </div>

      {/* Compact Filter & Search Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-2.5 mb-4 shadow-sm flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2">
          {/* Search Box */}
          <div className="relative w-[210px]">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-[#94A3B8]">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search caller..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[12px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            />
          </div>

          {/* Business Filter */}
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[11px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            <option value="All">Business: All</option>
            <option value="Smile Dental Clinic">Smile Dental Clinic</option>
            <option value="Amsterdam Dental Care">Amsterdam Dental Care</option>
            <option value="Berlin Health Center">Berlin Health Center</option>
            <option value="Bella Rosa Ristorante">Bella Rosa Ristorante</option>
            <option value="Glow & Shine Salon">Glow & Shine Salon</option>
            <option value="FitLife Studio">FitLife Studio</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[11px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            <option value="All">Status: All</option>
            <option value="Resolved">Resolved</option>
            <option value="Transferred">Transferred</option>
            <option value="Failed">Failed</option>
          </select>

          {/* Intent Filter */}
          <select
            value={selectedIntent}
            onChange={(e) => setSelectedIntent(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[11px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            <option value="All">Intent: All</option>
            <option value="Booking">Booking</option>
            <option value="Reschedule">Reschedule</option>
            <option value="Emergency">Emergency</option>
            <option value="Pricing Q">Pricing Q</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Complex Case">Complex Case</option>
          </select>
        </div>

        {(selectedBusiness !== 'All' || selectedStatus !== 'All' || selectedIntent !== 'All' || searchQuery) && (
          <button
            onClick={() => {
              setSelectedBusiness('All');
              setSelectedStatus('All');
              setSelectedIntent('All');
              setSearchQuery('');
            }}
            className="text-[11px] font-semibold text-[#2563EB] hover:underline px-2 py-0.5"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Main Content Layout: Compact Left Table (65%) & Sleek Right Inspection Panel (35%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Calls Table (8 cols out of 12) */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <th className="px-3.5 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider min-w-[140px]">
                    Business
                  </th>
                  <th className="px-3 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider min-w-[125px]">
                    Caller
                  </th>
                  <th className="px-2.5 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider min-w-[75px]">
                    Time
                  </th>
                  <th className="px-2.5 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider min-w-[75px]">
                    Duration
                  </th>
                  <th className="px-2.5 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider min-w-[95px]">
                    Intent
                  </th>
                  <th className="px-2.5 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider min-w-[90px]">
                    Outcome
                  </th>
                  <th className="px-2.5 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider text-right min-w-[65px]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {filteredCalls.map((call) => {
                  const isSelected = selectedCall.id === call.id;
                  return (
                    <tr
                      key={call.id}
                      onClick={() => {
                        setSelectedCall(call);
                        setIsPlayingRecording(false);
                      }}
                      className={`cursor-pointer transition-colors text-[12px] ${
                        isSelected ? 'bg-[#EFF6FF]/70' : 'hover:bg-[#F8FAFC]/70'
                      }`}
                    >
                      {/* Business */}
                      <td className="px-3.5 py-2.5 whitespace-nowrap">
                        <Link
                          href={`/businesses/${call.businessId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="font-semibold text-[#0F172A] hover:text-[#2563EB] transition-colors flex items-center gap-1"
                        >
                          <span className="truncate max-w-[130px]">{call.businessName}</span>
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#94A3B8] flex-shrink-0">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                        </Link>
                      </td>

                      {/* Caller */}
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <div className="font-semibold text-[#0F172A]">
                          {call.callerNumber}
                        </div>
                        {call.callerName && (
                          <div className="text-[10px] text-[#94A3B8]">
                            {call.callerName}
                          </div>
                        )}
                      </td>

                      {/* Time */}
                      <td className="px-2.5 py-2.5 text-[#475569] whitespace-nowrap">
                        {call.time}
                      </td>

                      {/* Duration */}
                      <td className="px-2.5 py-2.5 text-[#0F172A] font-medium whitespace-nowrap">
                        {call.duration}
                      </td>

                      {/* Intent */}
                      <td className="px-2.5 py-2.5 whitespace-nowrap">
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-[#475569]">
                          {call.intent}
                        </span>
                      </td>

                      {/* AI Outcome */}
                      <td className="px-2.5 py-2.5 whitespace-nowrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold ${call.outcomeColor.bg} ${call.outcomeColor.text}`}>
                          {call.outcome}
                        </span>
                      </td>

                      {/* Action */}
                      <td className="px-2.5 py-2.5 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedCall(call);
                            setIsPlayingRecording(false);
                          }}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                            isSelected
                              ? 'bg-[#2563EB] text-white'
                              : 'bg-white border border-[#E2E8F0] text-[#2563EB] hover:bg-blue-50'
                          }`}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side Compact Call Inspection Panel (4 or 5 cols out of 12) */}
        <div className="lg:col-span-5 xl:col-span-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm space-y-3.5">
            {/* Header & Status */}
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E2E8F0]">
              <div>
                <h3 className="text-[14px] font-bold text-[#0F172A]">
                  Active Call Inspection
                </h3>
                <span className="text-[11px] font-semibold text-[#2563EB]">
                  Caller: {selectedCall.callerNumber}
                </span>
              </div>
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${selectedCall.outcomeColor.bg} ${selectedCall.outcomeColor.text}`}>
                {selectedCall.outcome}
              </span>
            </div>

            {/* AI Summary & Intent */}
            <div className="p-2.5 bg-[#EFF6FF] border border-[#BFDBFE] rounded-lg">
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB] mb-0.5">
                AI Intent & Summary
              </div>
              <p className="text-[12px] text-[#0F172A] leading-relaxed">
                {selectedCall.summary}
              </p>
            </div>

            {/* Audio Waveform Simulator */}
            <div className="p-2.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg flex items-center gap-2.5">
              <button
                onClick={() => setIsPlayingRecording(!isPlayingRecording)}
                className="w-8 h-8 rounded-full bg-[#2563EB] text-white flex items-center justify-center shadow hover:bg-blue-700 transition-colors flex-shrink-0"
              >
                {isPlayingRecording ? (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                  </svg>
                ) : (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <polygon points="5 3 19 12 5 21 5 3"></polygon>
                  </svg>
                )}
              </button>

              <div className="flex-1">
                <div className="flex justify-between text-[10px] text-[#475569] mb-1 font-medium">
                  <span>{isPlayingRecording ? '0:34' : '0:00'} / {selectedCall.duration}</span>
                  <span>Twilio Voice Stream</span>
                </div>
                <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                  <div
                    className={`h-full bg-[#2563EB] rounded-full transition-all duration-300 ${
                      isPlayingRecording ? 'w-1/3' : 'w-0'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* Conversation Transcript Excerpt */}
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5">
                Live Conversation Transcript
              </div>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {selectedCall.transcript.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-2 rounded text-[11px] leading-relaxed ${
                      item.speaker === 'AI'
                        ? 'bg-[#EFF6FF] border border-[#BFDBFE]/60 text-[#0F172A]'
                        : 'bg-gray-50 border border-[#E2E8F0] text-[#0F172A]'
                    }`}
                  >
                    <span className={`font-bold block mb-0.5 ${
                      item.speaker === 'AI' ? 'text-[#2563EB]' : 'text-[#475569]'
                    }`}>
                      {item.speaker === 'AI' ? `${selectedCall.aiReceptionist} (AI Receptionist)` : 'Caller'}:
                    </span>
                    {item.text}
                  </div>
                ))}
              </div>
            </div>

            {/* Technical Diagnostics Metadata */}
            <div className="pt-2 border-t border-[#E2E8F0] space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Voice Engine:</span>
                <span className="font-semibold text-[#0F172A]">{selectedCall.engine}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Inference Latency:</span>
                <span className="font-semibold text-[#10B981]">{selectedCall.latency} (Real-time)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Error Code:</span>
                <span className="font-semibold text-[#475569]">None (Clean)</span>
              </div>
            </div>

            {/* Quick Links */}
            <div className="pt-1.5 flex items-center justify-between text-[11px]">
              <Link
                href={`/businesses/${selectedCall.businessId}`}
                className="font-semibold text-[#2563EB] hover:underline truncate max-w-[180px]"
              >
                Go to {selectedCall.businessName} →
              </Link>
              <Link
                href="/appointments"
                className="text-[#475569] hover:text-[#0F172A] hover:underline font-medium"
              >
                Bookings
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
