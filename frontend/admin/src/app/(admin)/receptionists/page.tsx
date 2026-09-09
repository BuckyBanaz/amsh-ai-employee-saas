"use client";
import React, { useState } from 'react';
import Link from 'next/link';

interface ReceptionistItem {
  id: string;
  name: string;
  avatarColor: string;
  businessId: string;
  businessName: string;
  businessType: string;
  voiceProvider: string;
  voiceModel: string;
  languages: string[];
  callsHandled: number;
  resolutionRate: number;
  status: 'Active' | 'Paused' | 'Testing';
  lastCall: string;
  greetingText: string;
  /** The Twilio number the AI actually answers on (MVP: business's own number
   *  call-forwards here; later this becomes the business's number directly). */
  aiNumber: string;
  forwardedFrom: string;
}

const receptionistsData: ReceptionistItem[] = [
  {
    id: 'r-1',
    name: 'Sarah',
    avatarColor: 'bg-blue-500',
    businessId: 'b-1',
    businessName: 'Smile Dental Clinic',
    businessType: 'Dental Clinic',
    voiceProvider: 'ElevenLabs',
    voiceModel: 'Rachel (Warm & Empathetic)',
    languages: ['Dutch', 'English'],
    callsHandled: 1420,
    resolutionRate: 86,
    status: 'Active',
    lastCall: '2 min ago',
    greetingText: 'Good day, thank you for calling Smile Dental Clinic. I am Sarah, your AI assistant. How may I help you today?',
    aiNumber: '+31 20 808 1922',
    forwardedFrom: '+31 20 894 3400',
  },
  {
    id: 'r-2',
    name: 'Anna',
    avatarColor: 'bg-emerald-500',
    businessId: 'b-2',
    businessName: 'Amsterdam Dental Care',
    businessType: 'Dental Clinic',
    voiceProvider: 'ElevenLabs',
    voiceModel: 'Bella (Gentle Dutch)',
    languages: ['Dutch'],
    callsHandled: 940,
    resolutionRate: 84,
    status: 'Active',
    lastCall: '18 min ago',
    greetingText: 'Welcome to Amsterdam Dental Care, this is Anna. Are you calling to book or reschedule an appointment?',
    aiNumber: '+31 20 808 2217',
    forwardedFrom: '+31 20 662 5510',
  },
  {
    id: 'r-3',
    name: 'Dieter',
    avatarColor: 'bg-purple-500',
    businessId: 'b-3',
    businessName: 'Berlin Health Center',
    businessType: 'Medical Center',
    voiceProvider: 'Cartesia',
    voiceModel: 'Sonic (Professional German)',
    languages: ['German', 'English'],
    callsHandled: 0,
    resolutionRate: 0,
    status: 'Paused',
    lastCall: 'Never',
    greetingText: 'Guten Tag, Sie sind mit dem Berlin Health Center verbunden. Mein Name ist Dieter.',
    aiNumber: '+49 30 555 0148',
    forwardedFrom: '+49 30 212 4477',
  },
  {
    id: 'r-4',
    name: 'Sofia',
    avatarColor: 'bg-amber-500',
    businessId: 'b-4',
    businessName: 'Bella Rosa Ristorante',
    businessType: 'Restaurant',
    voiceProvider: 'ElevenLabs',
    voiceModel: 'Serena (Warm Italian)',
    languages: ['Italian', 'English'],
    callsHandled: 480,
    resolutionRate: 88,
    status: 'Active',
    lastCall: '34 min ago',
    greetingText: 'Buongiorno e benvenuti a Bella Rosa Ristorante. I am Sofia, how many guests may I reserve a table for?',
    aiNumber: '+39 06 8901 3345',
    forwardedFrom: '+39 06 4471 2280',
  },
  {
    id: 'r-5',
    name: 'Chloé',
    avatarColor: 'bg-pink-500',
    businessId: 'b-5',
    businessName: 'Glow & Shine Salon',
    businessType: 'Beauty Salon',
    voiceProvider: 'Cartesia',
    voiceModel: 'Clara (Elegant French)',
    languages: ['French'],
    callsHandled: 310,
    resolutionRate: 82,
    status: 'Active',
    lastCall: '1 hour ago',
    greetingText: 'Bonjour! Bienvenue chez Glow & Shine Salon. Je suis Chloé, pour quelle prestation souhaitez-vous prendre rendez-vous?',
    aiNumber: '+33 1 8934 7712',
    forwardedFrom: '+33 1 4523 6690',
  },
  {
    id: 'r-6',
    name: 'Oliver',
    avatarColor: 'bg-teal-500',
    businessId: 'b-6',
    businessName: 'FitLife Studio',
    businessType: 'Fitness Studio',
    voiceProvider: 'ElevenLabs',
    voiceModel: 'Adam (Energetic UK)',
    languages: ['English (UK)'],
    callsHandled: 650,
    resolutionRate: 89,
    status: 'Testing',
    lastCall: '5 hours ago',
    greetingText: 'Hi there! Thanks for calling FitLife Studio. I am Oliver, ready to book your next class or personal training session.',
    aiNumber: '+44 20 3966 5581',
    forwardedFrom: '+44 20 7946 0891',
  },
];

export default function ReceptionistsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');
  const [activeModalAgent, setActiveModalAgent] = useState<ReceptionistItem | null>(null);
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);

  const businessOptions = ['All', ...Array.from(new Set(receptionistsData.map(r => r.businessName)))];
  const typeOptions = ['All', ...Array.from(new Set(receptionistsData.map(r => r.businessType)))];

  const hasActiveFilters = selectedBusiness !== 'All' || selectedStatus !== 'All' || selectedType !== 'All' || searchQuery;

  const filteredReceptionists = receptionistsData.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.voiceModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.languages.some((l) => l.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesBusiness = selectedBusiness === 'All' || r.businessName === selectedBusiness;
    const matchesStatus = selectedStatus === 'All' || r.status === selectedStatus;
    const matchesType = selectedType === 'All' || r.businessType === selectedType;

    return matchesSearch && matchesBusiness && matchesStatus && matchesType;
  });

  const resetFilters = () => {
    setSelectedBusiness('All');
    setSelectedStatus('All');
    setSelectedType('All');
    setSearchQuery('');
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-8 animate-in fade-in duration-500">
      {/* Header */}
      <header className="mb-6 pb-5 border-b border-[#E2E8F0] flex justify-between items-center">
        <div>
          <h1 className="text-[24px] font-bold text-[#0F172A] tracking-tight leading-tight">
            AI Receptionists
          </h1>
          <p className="text-[14px] text-[#475569] mt-1 font-normal">
            Manage, configure, and monitor automated voice receptionists across all businesses.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 border border-[#E2E8F0] rounded-lg py-2 px-3 text-[13px] font-medium text-[#475569] bg-white shadow-sm hover:bg-gray-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Jan 1 - Jan 30, 2026
          </button>
          <button className="flex items-center justify-center border border-[#E2E8F0] rounded-full w-9 h-9 text-[#475569] bg-white shadow-sm hover:bg-gray-50 transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>
      </header>

      {/* Top 4 KPI Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <div className="text-[12px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
            Total AI Agents
          </div>
          <div className="flex items-end justify-between">
            <div className="text-[26px] font-bold text-[#0F172A] leading-none">121</div>
            <span className="text-[12px] font-semibold text-[#10B981]">+12% growth</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <div className="text-[12px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
            Active On Calls
          </div>
          <div className="flex items-end justify-between">
            <div className="text-[26px] font-bold text-[#0F172A] leading-none">84</div>
            <span className="text-[12px] font-semibold text-[#2563EB]">Live Now</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <div className="text-[12px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
            Calls Handled (Today)
          </div>
          <div className="flex items-end justify-between">
            <div className="text-[26px] font-bold text-[#0F172A] leading-none">4,892</div>
            <span className="text-[12px] font-semibold text-[#10B981]">+1,201 vs yest</span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 shadow-sm">
          <div className="text-[12px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-2">
            Avg Resolution Rate
          </div>
          <div className="flex items-end justify-between">
            <div className="text-[26px] font-bold text-[#0F172A] leading-none">82.4%</div>
            <span className="text-[12px] font-semibold text-[#10B981]">+1.2% eff</span>
          </div>
        </div>
      </div>

      {/* Filter & Action Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-4 mb-6 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Search Box */}
          <div className="relative w-[260px]">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-[#94A3B8]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search receptionists, voices..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            />
          </div>

          {/* Filter by Business Dropdown */}
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            {businessOptions.map((b) => (
              <option key={b} value={b}>
                {b === 'All' ? 'Filter by Business: All' : b}
              </option>
            ))}
          </select>

          {/* Filter by Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            <option value="All">Status: All</option>
            <option value="Active">Active</option>
            <option value="Paused">Paused</option>
            <option value="Testing">Testing</option>
          </select>
          {/* Business Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            {typeOptions.map((t) => (
              <option key={t} value={t}>{t === 'All' ? 'Type: All' : t}</option>
            ))}
          </select>

          {/* Reset */}
          {hasActiveFilters && (
            <button onClick={resetFilters} className="text-[12px] font-semibold text-[#2563EB] hover:underline px-1">
              Reset
            </button>
          )}
        </div>

        {/* Deploy Action */}
        <button className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-[13px] font-semibold shadow-sm transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Deploy AI Receptionist
        </button>
      </div>

      {/* Result Count */}
      <div className="mb-3 text-[12px] font-semibold text-[#94A3B8]">
        Showing <span className="text-[#0F172A]">{filteredReceptionists.length}</span> of {receptionistsData.length} receptionists
      </div>

      {/* Receptionists Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[170px]">
                  Receptionist
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[190px]">
                  Assigned Business
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[180px]">
                  Voice & Provider
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[160px]">
                  AI Number
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[130px]">
                  Languages
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[110px]">
                  Calls (30D)
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[110px]">
                  Resolution
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider min-w-[90px]">
                  Status
                </th>
                <th className="px-4 py-3 text-[12px] font-bold text-[#475569] uppercase tracking-wider text-right min-w-[140px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredReceptionists.map((agent) => (
                <tr key={agent.id} className="hover:bg-[#F8FAFC]/70 transition-colors">
                  {/* Name & Avatar */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className={`w-9 h-9 rounded-full ${agent.avatarColor} text-white font-bold flex items-center justify-center text-[13px] shadow-sm`}>
                          {agent.name.charAt(0)}
                        </div>
                        {agent.status === 'Active' && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#10B981] border-2 border-white"></span>
                        )}
                      </div>
                      <div>
                        <div className="text-[14px] font-semibold text-[#0F172A] flex items-center gap-1.5">
                          {agent.name}
                        </div>
                        <div className="text-[11px] text-[#94A3B8]">
                          Last call: {agent.lastCall}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Business (Link to Business Detail Page) */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <Link
                      href={`/businesses/${agent.businessId}`}
                      className="text-[13px] font-semibold text-[#0F172A] hover:text-[#2563EB] transition-colors flex items-center gap-1"
                    >
                      {agent.businessName}
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#94A3B8]">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </Link>
                    <div className="text-[11px] text-[#94A3B8]">
                      {agent.businessType}
                    </div>
                  </td>

                  {/* Voice Model */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="text-[13px] font-medium text-[#0F172A]">
                      {agent.voiceModel}
                    </div>
                    <span className="text-[11px] font-semibold text-[#2563EB]">
                      {agent.voiceProvider}
                    </span>
                  </td>

                  {/* AI Number (Twilio) — where the AI actually answers; forwarded from the business's own number for now */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="text-[13px] font-mono font-bold text-[#0F172A]">
                      {agent.aiNumber}
                    </div>
                    <div className="text-[11px] text-[#94A3B8]">
                      Forwarded from {agent.forwardedFrom}
                    </div>
                  </td>

                  {/* Languages */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex flex-wrap gap-1">
                      {agent.languages.map((lang) => (
                        <span key={lang} className="px-2 py-0.5 rounded bg-gray-100 text-[11px] font-medium text-[#475569]">
                          {lang}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Calls Handled */}
                  <td className="px-4 py-3.5 text-[13px] text-[#475569] font-medium whitespace-nowrap">
                    {agent.callsHandled.toLocaleString('en-US')} calls
                  </td>

                  {/* Resolution Rate */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-semibold text-[#0F172A]">
                        {agent.resolutionRate}%
                      </span>
                      <div className="w-12 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#10B981] rounded-full"
                          style={{ width: `${agent.resolutionRate}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3.5 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[12px] font-semibold ${
                      agent.status === 'Active'
                        ? 'bg-[#D1FAE5] text-[#065F46]'
                        : agent.status === 'Paused'
                        ? 'bg-[#FEF3C7] text-[#92400E]'
                        : 'bg-blue-50 text-blue-700'
                    }`}>
                      {agent.status}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => {
                          setActiveModalAgent(agent);
                          setIsPlayingVoice(false);
                        }}
                        className="px-2.5 py-1 bg-[#EFF6FF] border border-[#BFDBFE] hover:bg-blue-100 text-[#2563EB] rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <polygon points="5 3 19 12 5 21 5 3"></polygon>
                        </svg>
                        Test Voice
                      </button>
                      <button
                        onClick={() => setActiveModalAgent(agent)}
                        className="p-1 text-[#94A3B8] hover:text-[#0F172A] hover:bg-gray-100 rounded-md transition-colors"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="1"></circle>
                          <circle cx="19" cy="12" r="1"></circle>
                          <circle cx="5" cy="12" r="1"></circle>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Voice Preview & Configuration Modal */}
      {activeModalAgent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-12 h-12 rounded-full ${activeModalAgent.avatarColor} text-white font-bold text-lg flex items-center justify-center`}>
                  {activeModalAgent.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-[18px] font-bold text-[#0F172A] leading-tight">
                    {activeModalAgent.name} - AI Voice Assistant
                  </h3>
                  <p className="text-[13px] text-[#475569]">
                    Assigned to <span className="font-semibold text-[#2563EB]">{activeModalAgent.businessName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveModalAgent(null)}
                className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-md"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>

            {/* Voice Provider Details */}
            <div className="p-3.5 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2 mb-4 text-[13px]">
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Provider:</span>
                <span className="font-semibold text-[#0F172A]">{activeModalAgent.voiceProvider} Engine</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Voice Model:</span>
                <span className="font-semibold text-[#0F172A]">{activeModalAgent.voiceModel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Average Latency:</span>
                <span className="font-semibold text-[#10B981]">~340ms (Ultra-Low)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">AI Number (Twilio):</span>
                <span className="font-mono font-semibold text-[#0F172A]">{activeModalAgent.aiNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Forwarded From:</span>
                <span className="font-mono font-semibold text-[#0F172A]">{activeModalAgent.forwardedFrom}</span>
              </div>
            </div>

            {/* Greeting Audio Player Simulation */}
            <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl mb-5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB] mb-1">
                Active Greeting Prompt
              </div>
              <p className="text-[13px] italic text-[#0F172A] mb-3">
                &quot;{activeModalAgent.greetingText}&quot;
              </p>

              <button
                onClick={() => setIsPlayingVoice(!isPlayingVoice)}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-[13px] font-semibold shadow-sm transition-colors"
              >
                {isPlayingVoice ? (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <rect x="6" y="4" width="4" height="16"></rect>
                      <rect x="14" y="4" width="4" height="16"></rect>
                    </svg>
                    Simulating Voice Audio...
                  </>
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    Listen to Voice Greeting
                  </>
                )}
              </button>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between gap-3">
              <Link
                href={`/businesses/${activeModalAgent.businessId}`}
                className="text-[13px] font-semibold text-[#2563EB] hover:underline"
              >
                View Business Tenant →
              </Link>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveModalAgent(null)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-[13px] font-semibold text-[#475569] hover:bg-gray-50"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    alert(`Updated configuration for ${activeModalAgent.name}`);
                    setActiveModalAgent(null);
                  }}
                  className="px-4 py-2 bg-[#0F172A] hover:bg-gray-800 text-white rounded-lg text-[13px] font-semibold"
                >
                  Save Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
