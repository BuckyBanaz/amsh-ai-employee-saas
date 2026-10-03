"use client";
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import Link from 'next/link';
import {
  fetchAdminReceptionists,
  fetchTenants,
  updateAdminReceptionist,
  createAdminReceptionist,
  deleteAdminReceptionist,
  AdminReceptionistItem,
  ReceptionistsKpis,
  TenantItem,
} from '@/lib/api';

const cap = (v: string | null | undefined) =>
  v ? v.replace(/_/g, ' ').replace(/^\w/, (c) => c.toUpperCase()) : '';

const ago = (iso: string | null) => {
  if (!iso) return 'No calls yet';
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return 'Just now';
  if (s < 3600) return `${Math.floor(s / 60)} min ago`;
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`;
  return `${Math.floor(s / 86400)} d ago`;
};

const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  hi: 'Hindi',
  nl: 'Dutch',
  es: 'Spanish',
  ar: 'Arabic',
  fr: 'French',
  de: 'German',
  pt: 'Portuguese',
  ta: 'Tamil',
  te: 'Telugu',
  bn: 'Bengali',
  mr: 'Marathi',
  gu: 'Gujarati',
};

const AVATAR_COLORS = [
  'bg-blue-600',
  'bg-emerald-600',
  'bg-purple-600',
  'bg-amber-600',
  'bg-indigo-600',
  'bg-teal-600',
];

export default function ReceptionistsPage() {
  const [receptionists, setReceptionists] = useState<AdminReceptionistItem[]>([]);
  const [kpis, setKpis] = useState<ReceptionistsKpis>({
    totalAgents: 0,
    activeAgents: 0,
    pausedAgents: 0,
    liveCalls: 0,
    callsToday: 0,
    avgResolutionRate: 0,
  });
  const [facets, setFacets] = useState<{
    businesses: string[];
    types: string[];
    providers: string[];
    statuses: string[];
  }>({
    businesses: ['All'],
    types: ['All'],
    providers: ['All'],
    statuses: ['All', 'Active', 'Paused', 'Testing'],
  });

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<string>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');

  // Modals & Action States
  const [activeModalAgent, setActiveModalAgent] = useState<AdminReceptionistItem | null>(null);
  const [editGreeting, setEditGreeting] = useState('');
  const [editVoiceModel, setEditVoiceModel] = useState('');
  const [savingAgent, setSavingAgent] = useState(false);

  // Deploy Modal
  const [showDeployModal, setShowDeployModal] = useState(false);
  const [availableBusinesses, setAvailableBusinesses] = useState<TenantItem[]>([]);
  const [deployForm, setDeployForm] = useState({
    business_id: '',
    name: '',
    voice_provider: 'cartesia',
    voice_model: 'sonic-english',
    primary_language: 'en',
    greeting: 'Hello, thank you for calling. How can I assist you today?',
  });
  const [deploying, setDeploying] = useState(false);

  // Voice playback simulation
  const [isPlayingVoice, setIsPlayingVoice] = useState(false);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Flash messages
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Fetch real data
  const loadData = useCallback(async () => {
    try {
      setLoadError('');
      const res = await fetchAdminReceptionists(searchQuery);
      setReceptionists(res.items || []);
      if (res.kpis) setKpis(res.kpis);
      if (res.facets) setFacets(res.facets);
    } catch {
      setLoadError('Failed to load receptionists from the live database.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Load businesses for the deploy dropdown
  useEffect(() => {
    fetchTenants({}).then((res) => {
      if (res.items) setAvailableBusinesses(res.items);
    }).catch(() => {});
  }, []);

  // Filter in memory for instantaneous multi-facet dropdown changes
  const filteredReceptionists = useMemo(() => {
    return receptionists.filter((r) => {
      const matchesSearch =
        !searchQuery ||
        r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.voiceModel.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.languages?.some((l) => l.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesBusiness = selectedBusiness === 'All' || r.businessName === selectedBusiness;
      const matchesStatus =
        selectedStatus === 'All' || r.status.toLowerCase() === selectedStatus.toLowerCase();
      const matchesType = selectedType === 'All' || r.businessType === selectedType;

      return matchesSearch && matchesBusiness && matchesStatus && matchesType;
    });
  }, [receptionists, searchQuery, selectedBusiness, selectedStatus, selectedType]);

  const hasActiveFilters =
    selectedBusiness !== 'All' ||
    selectedStatus !== 'All' ||
    selectedType !== 'All' ||
    searchQuery.trim().length > 0;

  const resetFilters = () => {
    setSelectedBusiness('All');
    setSelectedStatus('All');
    setSelectedType('All');
    setSearchQuery('');
  };

  // Toggle agent status
  const handleStatusChange = async (agent: AdminReceptionistItem, newStatus: 'active' | 'paused' | 'testing') => {
    setUpdatingId(agent.id);
    setActionError('');
    try {
      await updateAdminReceptionist(agent.id, { status: newStatus });
      setReceptionists((prev) =>
        prev.map((a) =>
          a.id === agent.id
            ? {
                ...a,
                status: (newStatus.charAt(0).toUpperCase() + newStatus.slice(1)) as AdminReceptionistItem['status'],
              }
            : a
        )
      );
      setKpis((prev) => ({
        ...prev,
        activeAgents: newStatus === 'active' ? prev.activeAgents + 1 : Math.max(0, prev.activeAgents - 1),
        pausedAgents: newStatus === 'paused' ? prev.pausedAgents + 1 : Math.max(0, prev.pausedAgents - 1),
      }));
      setActionSuccess(`Receptionist ${agent.name} is now ${newStatus.toUpperCase()}.`);
      setTimeout(() => setActionSuccess(''), 3000);
    } catch {
      setActionError(`Failed to update status for ${agent.name}.`);
    } finally {
      setUpdatingId(null);
    }
  };

  // Deploy new agent
  const handleDeploySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!deployForm.business_id || !deployForm.name) {
      setActionError('Please select a business and provide an agent name.');
      return;
    }
    setDeploying(true);
    setActionError('');
    try {
      await createAdminReceptionist(deployForm);
      setShowDeployModal(false);
      setDeployForm({
        business_id: '',
        name: '',
        voice_provider: 'cartesia',
        voice_model: 'sonic-english',
        primary_language: 'en',
        greeting: 'Hello, thank you for calling. How can I assist you today?',
      });
      setActionSuccess('AI Receptionist deployed and attached to clinic!');
      setTimeout(() => setActionSuccess(''), 3500);
      loadData();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Failed to deploy receptionist.');
    } finally {
      setDeploying(false);
    }
  };

  // Open modal and pre-fill edit fields
  const handleOpenEditModal = (agent: AdminReceptionistItem) => {
    setActiveModalAgent(agent);
    setEditGreeting(agent.greeting || '');
    setEditVoiceModel(agent.voiceModel || 'default');
    setIsPlayingVoice(false);
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
  };

  // Save changes in modal
  const handleSaveModalSettings = async () => {
    if (!activeModalAgent) return;
    setSavingAgent(true);
    setActionError('');
    try {
      await updateAdminReceptionist(activeModalAgent.id, {
        greeting: editGreeting,
        voice_model: editVoiceModel,
      });
      setReceptionists((prev) =>
        prev.map((a) =>
          a.id === activeModalAgent.id
            ? { ...a, greeting: editGreeting, voiceModel: editVoiceModel }
            : a
        )
      );
      setActionSuccess(`Settings saved for ${activeModalAgent.name}.`);
      setTimeout(() => setActionSuccess(''), 3000);
      setActiveModalAgent(null);
    } catch {
      setActionError('Failed to save receptionist settings.');
    } finally {
      setSavingAgent(false);
    }
  };

  // Real voice greeting playback via Web Speech API
  const handleToggleVoicePlayback = () => {
    if (!activeModalAgent) return;

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      if (isPlayingVoice) {
        window.speechSynthesis.cancel();
        setIsPlayingVoice(false);
        return;
      }

      window.speechSynthesis.cancel();
      const textToSpeak = editGreeting || activeModalAgent.greeting || 'Hello, welcome to our clinic!';
      const utterance = new SpeechSynthesisUtterance(textToSpeak);
      synthRef.current = utterance;

      if (activeModalAgent.primaryLanguage === 'hi') {
        utterance.lang = 'hi-IN';
      } else if (activeModalAgent.primaryLanguage === 'nl') {
        utterance.lang = 'nl-NL';
      } else if (activeModalAgent.primaryLanguage === 'es') {
        utterance.lang = 'es-ES';
      } else {
        utterance.lang = 'en-US';
      }

      utterance.onend = () => setIsPlayingVoice(false);
      utterance.onerror = () => setIsPlayingVoice(false);

      setIsPlayingVoice(true);
      window.speechSynthesis.speak(utterance);
    } else {
      alert('Audio preview: ' + (editGreeting || activeModalAgent.greeting));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 lg:p-6 w-full animate-in fade-in duration-500">
      {/* Header */}
      <header className="mb-4 pb-3 border-b border-[#E2E8F0] flex flex-wrap justify-between items-center gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-[#0F172A] tracking-tight leading-tight">
              AI Receptionists
            </h1>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Engines
            </span>
          </div>
          <p className="text-xs text-[#475569] mt-0.5 font-normal">
            Manage, deploy, and inspect automated voice receptionists across all platform tenants.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => loadData()}
            className="flex items-center gap-1.5 border border-[#E2E8F0] rounded-md py-1.5 px-3 text-xs font-semibold text-[#475569] bg-white shadow-2xs hover:bg-gray-50 transition-colors"
            title="Refresh from database"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={loading ? 'animate-spin' : ''}>
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67"/>
            </svg>
            Refresh
          </button>
          <button
            onClick={() => setShowDeployModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2563EB] hover:bg-blue-700 text-white rounded-md text-xs font-semibold shadow-sm transition-all hover:shadow"
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Deploy Receptionist
          </button>
        </div>
      </header>

      {/* Notifications */}
      {actionSuccess && (
        <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs font-medium flex items-center justify-between animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-emerald-600">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess('')} className="text-emerald-600 hover:text-emerald-900">✕</button>
        </div>
      )}
      {actionError && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs font-medium flex items-center justify-between animate-in fade-in duration-300">
          <div className="flex items-center gap-2">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-rose-600">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError('')} className="text-rose-600 hover:text-rose-900">✕</button>
        </div>
      )}

      {/* Top 4 KPI Metrics Bento Cards (100% Real Live Computed Data) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
            <span>Total AI Agents</span>
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-[#0F172A] leading-none">
              {kpis.totalAgents}
            </div>
            <span className="text-[11px] font-semibold text-[#2563EB] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
              {kpis.activeAgents} Active
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
            <span>Active On Calls</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-[#0F172A] leading-none">
              {kpis.liveCalls}
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              Live Telephony
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
            <span>Calls Processed (Today)</span>
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-[#0F172A] leading-none">
              {kpis.callsToday.toLocaleString('en-US')}
            </div>
            <span className="text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              24h Window
            </span>
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider mb-1">
            <span>Avg Resolution Rate</span>
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold text-[#0F172A] leading-none">
              {kpis.avgResolutionRate}%
            </div>
            <span className="text-[11px] font-semibold text-[#10B981] bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
              AI Handled
            </span>
          </div>
        </div>
      </div>

      {/* Filter & Action Bar */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 mb-4 shadow-2xs flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <span className="absolute inset-y-0 left-0 flex items-center pl-2.5 pointer-events-none text-[#94A3B8]">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </span>
            <input
              type="text"
              placeholder="Search receptionists, voice models..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            />
          </div>

          {/* Filter by Business Dropdown */}
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            {facets.businesses.map((b) => (
              <option key={b} value={b}>
                {b === 'All' ? 'Clinic: All' : b}
              </option>
            ))}
          </select>

          {/* Filter by Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            {facets.statuses.map((s) => (
              <option key={s} value={s}>
                {s === 'All' ? 'Status: All' : s}
              </option>
            ))}
          </select>

          {/* Business Type Filter */}
          {facets.types.length > 2 && (
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
            >
              {facets.types.map((t) => (
                <option key={t} value={t}>
                  {t === 'All' ? 'Type: All' : t}
                </option>
              ))}
            </select>
          )}

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="text-xs font-semibold text-[#2563EB] hover:underline px-1 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>

        <div className="text-xs font-medium text-[#94A3B8]">
          Showing <span className="font-bold text-[#0F172A]">{filteredReceptionists.length}</span> of {receptionists.length} receptionists
        </div>
      </div>

      {/* Receptionists Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-4 py-3 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[170px]">
                  Receptionist
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[170px]">
                  Assigned Clinic
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[150px]">
                  Voice Provider
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[140px]">
                  AI Line / Forward
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[110px]">
                  Languages
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[100px]">
                  Calls Handled
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[100px]">
                  Resolution
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[110px]">
                  Status
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-[#475569] uppercase tracking-wider text-right min-w-[150px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {loading && receptionists.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-xs text-[#94A3B8]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <div className="w-6 h-6 border-2 border-[#2563EB] border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading real AI receptionists from database...</span>
                    </div>
                  </td>
                </tr>
              ) : filteredReceptionists.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-xs text-[#94A3B8]">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-400">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M8 14s1.5 2 4 2 4-2 4-2"></path>
                        <line x1="9" y1="9" x2="9.01" y2="9"></line>
                        <line x1="15" y1="9" x2="15.01" y2="9"></line>
                      </svg>
                      <span className="font-semibold text-gray-600">No receptionists found</span>
                      <span className="text-[11px] text-gray-400">
                        {hasActiveFilters ? 'Try adjusting your search query or filters.' : 'Deploy a new receptionist to assign to a clinic.'}
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReceptionists.map((agent, idx) => {
                  const avatarBg = AVATAR_COLORS[idx % AVATAR_COLORS.length];
                  const resRate = agent.resolutionRate ?? 0;
                  const isUpdating = updatingId === agent.id;

                  return (
                    <tr key={agent.id} className="hover:bg-[#F8FAFC]/80 transition-colors">
                      {/* Name & Avatar */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="relative">
                            <div className={`w-8 h-8 rounded-full ${avatarBg} text-white font-bold flex items-center justify-center text-xs shadow-2xs`}>
                              {agent.name.charAt(0).toUpperCase()}
                            </div>
                            {agent.status === 'Active' && (
                              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-[#10B981] border-2 border-white"></span>
                            )}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                              {agent.name}
                            </div>
                            <div className="text-[10px] text-[#94A3B8]">
                              Last: {agent.lastCallAt ? ago(agent.lastCallAt) : 'No calls yet'}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Business */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Link
                          href={`/businesses/${agent.businessId}`}
                          className="text-xs font-semibold text-[#0F172A] hover:text-[#2563EB] transition-colors flex items-center gap-1"
                        >
                          <span>{agent.businessName}</span>
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#94A3B8]">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                          </svg>
                        </Link>
                        <div className="text-[10px] text-[#94A3B8]">
                          {agent.businessType}
                        </div>
                      </td>

                      {/* Voice Model & Provider */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs font-medium text-[#0F172A]">
                          {agent.voiceModel}
                        </div>
                        <span className="text-[10px] font-semibold text-[#2563EB] uppercase">
                          {agent.voiceProvider}
                        </span>
                      </td>

                      {/* AI Number */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-xs font-mono font-bold text-[#0F172A]">
                          {agent.aiNumber || '–'}
                        </div>
                        <div className="text-[10px] text-[#94A3B8] font-mono">
                          {agent.forwardedFrom ? `From ${agent.forwardedFrom}` : 'Direct line'}
                        </div>
                      </td>

                      {/* Languages */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1 max-w-[130px]">
                          {(agent.languages?.length ? agent.languages : [agent.primaryLanguage]).map((lang) => (
                            <span key={lang} className="px-1.5 py-0.5 rounded bg-gray-100 text-[10px] font-semibold text-[#475569]">
                              {LANGUAGE_NAMES[lang] || lang.toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Calls Handled */}
                      <td className="px-4 py-3 text-xs text-[#475569] font-semibold whitespace-nowrap">
                        {agent.callsHandled.toLocaleString('en-US')} calls
                      </td>

                      {/* Resolution Rate */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#0F172A]">
                            {resRate}%
                          </span>
                          <div className="w-12 h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-[#10B981] rounded-full"
                              style={{ width: `${Math.min(100, resRate)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status Toggle Dropdown */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <select
                          value={agent.status.toLowerCase()}
                          disabled={isUpdating}
                          onChange={(e) => handleStatusChange(agent, e.target.value as 'active' | 'paused' | 'testing')}
                          className={`px-2 py-0.5 rounded text-[11px] font-semibold border cursor-pointer focus:outline-none ${
                            agent.status === 'Active'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : agent.status === 'Paused'
                              ? 'bg-amber-50 text-amber-700 border-amber-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          <option value="active">Active</option>
                          <option value="paused">Paused</option>
                          <option value="testing">Testing</option>
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEditModal(agent)}
                            className="px-2.5 py-1 bg-[#EFF6FF] border border-[#BFDBFE] hover:bg-blue-100 text-[#2563EB] rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1"
                          >
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                            Voice & Prompt
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Voice Preview & Configuration Modal */}
      {activeModalAgent && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-lg shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-blue-600 text-white font-bold text-base flex items-center justify-center shadow-xs">
                  {activeModalAgent.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#0F172A] leading-tight">
                    {activeModalAgent.name} - AI Voice Settings
                  </h3>
                  <p className="text-xs text-[#475569] mt-0.5">
                    Assigned to <span className="font-semibold text-[#2563EB]">{activeModalAgent.businessName}</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                  }
                  setActiveModalAgent(null);
                }}
                className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            {/* Provider & Telephony Meta Card */}
            <div className="p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0] space-y-2 mb-4 text-xs">
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Telephony Engine:</span>
                <span className="font-semibold text-[#0F172A]">{cap(activeModalAgent.voiceProvider)} High-Speed</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-[#94A3B8]">Voice Model:</span>
                <input
                  type="text"
                  value={editVoiceModel}
                  onChange={(e) => setEditVoiceModel(e.target.value)}
                  className="font-mono text-xs font-semibold text-[#0F172A] bg-white border border-[#E2E8F0] rounded px-2 py-0.5 text-right w-44"
                />
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Virtual AI DID:</span>
                <span className="font-mono font-semibold text-[#0F172A]">{activeModalAgent.aiNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#94A3B8]">Forwarded Inbound:</span>
                <span className="font-mono font-semibold text-[#0F172A]">{activeModalAgent.forwardedFrom}</span>
              </div>
            </div>

            {/* Interactive Audio Greeting Player */}
            <div className="p-4 bg-[#EFF6FF] border border-[#BFDBFE] rounded-xl mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#2563EB]">
                  Greeting Prompt (What Callers Hear First)
                </span>
                <span className="text-[10px] text-[#64748B]">Editable</span>
              </div>
              <textarea
                rows={3}
                value={editGreeting}
                onChange={(e) => setEditGreeting(e.target.value)}
                className="w-full text-xs text-[#0F172A] p-2.5 bg-white border border-[#BFDBFE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 mb-3"
              />

              <button
                type="button"
                onClick={handleToggleVoicePlayback}
                className="w-full flex items-center justify-center gap-2 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
              >
                {isPlayingVoice ? (
                  <>
                    <span className="flex items-center gap-1">
                      <span className="w-1 h-3 bg-white rounded-full animate-bounce"></span>
                      <span className="w-1 h-4 bg-white rounded-full animate-bounce [animation-delay:0.2s]"></span>
                      <span className="w-1 h-2 bg-white rounded-full animate-bounce [animation-delay:0.4s]"></span>
                    </span>
                    Stop Speech Audio
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polygon points="5 3 19 12 5 21 5 3"></polygon>
                    </svg>
                    Speak / Test Voice Greeting
                  </>
                )}
              </button>
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex items-center justify-between gap-3 pt-2">
              <Link
                href={`/businesses/${activeModalAgent.businessId}`}
                className="text-xs font-semibold text-[#2563EB] hover:underline"
              >
                Open Clinic Profile →
              </Link>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                      window.speechSynthesis.cancel();
                    }
                    setActiveModalAgent(null);
                  }}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#475569] hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={savingAgent}
                  onClick={handleSaveModalSettings}
                  className="px-4 py-2 bg-[#0F172A] hover:bg-gray-800 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {savingAgent ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Deploy Receptionist Modal */}
      {showDeployModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-[#E2E8F0] rounded-2xl w-full max-w-md shadow-2xl p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-bold text-[#0F172A] leading-tight">
                  Deploy AI Receptionist
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  Attach and configure an automated voice assistant for a tenant clinic.
                </p>
              </div>
              <button
                onClick={() => setShowDeployModal(false)}
                className="text-[#94A3B8] hover:text-[#0F172A] p-1 rounded-md"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleDeploySubmit} className="space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Assign to Clinic / Business *
                </label>
                <select
                  required
                  value={deployForm.business_id}
                  onChange={(e) => setDeployForm({ ...deployForm, business_id: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                >
                  <option value="">Select clinic...</option>
                  {availableBusinesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Receptionist Persona Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sneha, Sarah, Alex"
                  value={deployForm.name}
                  onChange={(e) => setDeployForm({ ...deployForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Voice Provider
                  </label>
                  <select
                    value={deployForm.voice_provider}
                    onChange={(e) => setDeployForm({ ...deployForm, voice_provider: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  >
                    <option value="cartesia">Cartesia Sonic (Fast)</option>
                    <option value="elevenlabs">ElevenLabs Expressive</option>
                    <option value="deepgram">Deepgram Aura</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#334155] mb-1">
                    Primary Language
                  </label>
                  <select
                    value={deployForm.primary_language}
                    onChange={(e) => setDeployForm({ ...deployForm, primary_language: e.target.value })}
                    className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                  >
                    <option value="en">English</option>
                    <option value="hi">Hindi / Hinglish</option>
                    <option value="nl">Dutch</option>
                    <option value="es">Spanish</option>
                    <option value="de">German</option>
                    <option value="fr">French</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#334155] mb-1">
                  Initial Greeting Message
                </label>
                <textarea
                  rows={2}
                  value={deployForm.greeting}
                  onChange={(e) => setDeployForm({ ...deployForm, greeting: e.target.value })}
                  className="w-full px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-xs text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={() => setShowDeployModal(false)}
                  className="px-4 py-2 border border-[#E2E8F0] rounded-lg text-xs font-semibold text-[#475569] hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deploying}
                  className="px-4 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm disabled:opacity-50"
                >
                  {deploying ? 'Deploying...' : 'Deploy Receptionist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
