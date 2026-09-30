"use client";
import React, { useState, useMemo, useEffect, useRef } from 'react';
import Link from 'next/link';
import { fetchAdminCalls, AdminCallRecord, AdminCallsKpi } from '@/lib/api';

const SENTIMENT_STYLES: Record<string, { bg: string; text: string }> = {
  Positive: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
  Neutral: { bg: 'bg-gray-100', text: 'text-[#475569]' },
  Negative: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' },
};

function getWaveformBars(seed: string, count = 40): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    bars.push(4 + Math.round(Math.abs(Math.sin(hash * 0.017 + i * 1.7)) * 16));
  }
  return bars;
}

export default function CallsMonitoringPage() {
  const [calls, setCalls] = useState<AdminCallRecord[]>([]);
  const [kpis, setKpis] = useState<AdminCallsKpi | null>(null);
  const [facets, setFacets] = useState<{
    businesses: string[];
    types: string[];
    outcomes: string[];
    intents: string[];
  }>({
    businesses: [],
    types: [],
    outcomes: ['Resolved', 'Transferred', 'Failed', 'Live'],
    intents: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState<string>('All');
  const [selectedOutcome, setSelectedOutcome] = useState<string>('All');
  const [selectedIntent, setSelectedIntent] = useState<string>('All');
  const [selectedType, setSelectedType] = useState<string>('All');

  const [selectedCall, setSelectedCall] = useState<AdminCallRecord | null>(null);
  const [isPlayingRecording, setIsPlayingRecording] = useState(false);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load calls from real backend
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchAdminCalls({
      search: debouncedSearch || undefined,
      business: selectedBusiness !== 'All' ? selectedBusiness : undefined,
      outcome: selectedOutcome !== 'All' ? selectedOutcome : undefined,
      intent: selectedIntent !== 'All' ? selectedIntent : undefined,
      type: selectedType !== 'All' ? selectedType : undefined,
      limit: 100,
    })
      .then((res) => {
        if (cancelled) return;
        setCalls(res.items);
        setKpis(res.kpis);
        if (res.facets) {
          setFacets((prev) => ({
            businesses: res.facets.businesses.length ? res.facets.businesses : prev.businesses,
            types: res.facets.types.length ? res.facets.types : prev.types,
            outcomes: res.facets.outcomes.length ? res.facets.outcomes : prev.outcomes,
            intents: res.facets.intents.length ? res.facets.intents : prev.intents,
          }));
        }
        if (res.items.length > 0) {
          setSelectedCall((curr) => {
            if (!curr) return res.items[0];
            const found = res.items.find((item) => item.id === curr.id);
            return found || res.items[0];
          });
        } else {
          setSelectedCall(null);
        }
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || 'Failed to load calls.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, selectedBusiness, selectedOutcome, selectedIntent, selectedType]);

  // Simulated or real playback timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlayingRecording) {
      interval = setInterval(() => {
        setPlaybackSeconds((prev) => {
          const maxSecs = selectedCall ? selectedCall.durationSeconds || 120 : 120;
          if (prev >= maxSecs) {
            setIsPlayingRecording(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    } else {
      setPlaybackSeconds(0);
    }
    return () => clearInterval(interval);
  }, [isPlayingRecording, selectedCall]);

  const waveformBars = useMemo(
    () => (selectedCall ? getWaveformBars(selectedCall.id) : getWaveformBars('default')),
    [selectedCall?.id]
  );

  const playedFraction = useMemo(() => {
    if (!selectedCall || !isPlayingRecording) return 0;
    const total = selectedCall.durationSeconds || 120;
    return Math.min(1, playbackSeconds / total);
  }, [selectedCall, isPlayingRecording, playbackSeconds]);

  const hasActiveFilters =
    selectedBusiness !== 'All' ||
    selectedOutcome !== 'All' ||
    selectedIntent !== 'All' ||
    selectedType !== 'All' ||
    searchQuery;

  const resetFilters = () => {
    setSelectedBusiness('All');
    setSelectedOutcome('All');
    setSelectedIntent('All');
    setSelectedType('All');
    setSearchQuery('');
  };

  const handleTogglePlay = () => {
    if (selectedCall?.recordingUrl && audioRef.current) {
      if (isPlayingRecording) {
        audioRef.current.pause();
        setIsPlayingRecording(false);
      } else {
        audioRef.current.play().catch(() => {});
        setIsPlayingRecording(true);
      }
    } else {
      setIsPlayingRecording((prev) => !prev);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-300 text-xs">
      {/* Audio element for real playback when recording_url exists */}
      {selectedCall?.recordingUrl && (
        <audio
          ref={audioRef}
          src={selectedCall.recordingUrl}
          onEnded={() => setIsPlayingRecording(false)}
        />
      )}

      {/* Header */}
      <header className="mb-3.5 pb-2.5 border-b border-[#E2E8F0] flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A] tracking-tight leading-tight">
            Calls
          </h1>
          <p className="text-xs text-[#475569] mt-0.5 font-normal">
            Platform-wide real-time call monitoring across all connected tenants.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 border border-[#E2E8F0] rounded-lg py-1.5 px-2.5 text-[12px] font-medium text-[#475569] bg-white shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Gateway
          </div>
        </div>
      </header>

      {/* Top 5 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5 mb-3.5">
        <div className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 sm:p-3 shadow-2xs">
          <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5">
            CALLS TODAY
          </div>
          <div className="text-base font-bold text-[#0F172A] leading-none mb-1">
            {kpis ? kpis.callsToday.toLocaleString() : '...'}
          </div>
          <div className="text-[10px] font-semibold text-[#10B981]">
            {kpis?.callsTodayDelta || '+0 vs yest'}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 sm:p-3 shadow-2xs">
          <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5">
            AVERAGE DURATION
          </div>
          <div className="text-base font-bold text-[#0F172A] leading-none mb-1">
            {kpis?.averageDuration || '0:00'}
          </div>
          <div className="text-[10px] font-semibold text-[#10B981]">
            {kpis?.averageDurationDelta || 'Stable'}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 sm:p-3 shadow-2xs">
          <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5">
            AI RESOLUTION
          </div>
          <div className="text-base font-bold text-[#0F172A] leading-none mb-1">
            {kpis?.aiResolutionRate || '0.0%'}
          </div>
          <div className="text-[10px] font-semibold text-[#10B981]">
            {kpis?.aiResolutionDelta || 'Automated'}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 sm:p-3 shadow-2xs">
          <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5">
            TRANSFERRED
          </div>
          <div className="text-base font-bold text-[#0F172A] leading-none mb-1">
            {kpis ? kpis.transferredCount.toLocaleString() : '...'}
          </div>
          <div className="text-[10px] font-semibold text-[#C2410C]">
            {kpis?.transferredPercent || '0%'}
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 sm:p-3 shadow-2xs">
          <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider mb-0.5">
            FAILED CALLS
          </div>
          <div className="text-base font-bold text-[#0F172A] leading-none mb-1">
            {kpis ? kpis.failedCount.toLocaleString() : '0'}
          </div>
          <div className="text-[10px] font-semibold text-[#EF4444]">
            {kpis?.failedDelta || 'Low failure rate'}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
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
              placeholder="Search caller, business..."
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
            {facets.businesses.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>

          {/* Outcome Filter */}
          <select
            value={selectedOutcome}
            onChange={(e) => setSelectedOutcome(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[11px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            <option value="All">Outcome: All</option>
            {facets.outcomes.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>

          {/* Intent Filter */}
          <select
            value={selectedIntent}
            onChange={(e) => setSelectedIntent(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[11px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            <option value="All">Intent: All</option>
            {facets.intents.map((i) => (
              <option key={i} value={i}>{i}</option>
            ))}
          </select>

          {/* Business Type Filter */}
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[11px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            <option value="All">Type: All</option>
            {facets.types.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-[12px] font-semibold text-[#2563EB] hover:underline px-2 py-1"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Calls Table (7 to 8 cols) */}
        <div className="lg:col-span-7 xl:col-span-8 bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden flex flex-col">
          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center text-red-600 bg-red-50">
              <p className="font-semibold text-sm">{error}</p>
              <button
                onClick={resetFilters}
                className="mt-3 px-3 py-1 bg-white border border-red-200 text-xs font-medium rounded-md shadow-xs hover:bg-red-100/50"
              >
                Retry
              </button>
            </div>
          ) : calls.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <p className="font-semibold text-sm">No call records found matching criteria.</p>
              <button
                onClick={resetFilters}
                className="mt-2 text-xs text-blue-600 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          ) : (
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
                  {calls.map((call) => {
                    const isSelected = selectedCall?.id === call.id;
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
          )}
        </div>

        {/* Right Side Compact Call Inspection Panel */}
        <div className="lg:col-span-5 xl:col-span-4">
          {selectedCall ? (
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
                  onClick={handleTogglePlay}
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
                    <span>
                      {isPlayingRecording
                        ? `${Math.floor(playbackSeconds / 60)}:${String(playbackSeconds % 60).padStart(2, '0')}`
                        : '0:00'}{' '}
                      / {selectedCall.duration}
                    </span>
                    <span>{selectedCall.recordingUrl ? 'Telephony Audio' : 'Audio Stream'}</span>
                  </div>
                  <div className="flex items-end gap-[2px] h-6">
                    {waveformBars.map((h, i) => (
                      <div
                        key={i}
                        className={`flex-1 rounded-sm transition-colors duration-300 ${
                          i / waveformBars.length < playedFraction ? 'bg-[#2563EB]' : 'bg-[#E2E8F0]'
                        }`}
                        style={{ height: `${h}px` }}
                      />
                    ))}
                  </div>
                </div>
                {selectedCall.recordingUrl ? (
                  <a
                    href={selectedCall.recordingUrl}
                    download
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] font-semibold text-[#2563EB] hover:underline flex-shrink-0"
                  >
                    Download
                  </a>
                ) : (
                  <span className="text-[10px] text-[#94A3B8] flex-shrink-0">
                    Audio Log
                  </span>
                )}
              </div>

              {/* Conversation Transcript Excerpt */}
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8] mb-1.5">
                  Live Conversation Transcript
                </div>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {selectedCall.transcript.length === 0 ? (
                    <p className="text-[11px] text-slate-400 italic">No transcript recorded for this turn.</p>
                  ) : (
                    selectedCall.transcript.map((item, idx) => (
                      <div
                        key={idx}
                        className={`p-2 rounded text-[11px] leading-relaxed ${
                          item.speaker === 'AI'
                            ? 'bg-[#EFF6FF] border border-[#BFDBFE]/60 text-[#0F172A]'
                            : 'bg-gray-50 border border-[#E2E8F0] text-[#0F172A]'
                        }`}
                      >
                        <span className={`font-bold mb-0.5 flex items-center gap-1.5 ${
                          item.speaker === 'AI' ? 'text-[#2563EB]' : 'text-[#475569]'
                        }`}>
                          {item.speaker === 'AI' ? `${selectedCall.aiReceptionist} (AI Receptionist)` : 'Caller'}:
                          {item.sentiment && (
                            <span className={`px-1 py-[1px] rounded text-[9px] font-bold ${SENTIMENT_STYLES[item.sentiment]?.bg || 'bg-gray-100'} ${SENTIMENT_STYLES[item.sentiment]?.text || 'text-slate-600'}`}>
                              {item.sentiment}
                            </span>
                          )}
                        </span>
                        {item.text}
                      </div>
                    ))
                  )}
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
                  <span className="text-[#94A3B8]">Call ID:</span>
                  <span className="font-mono text-[10px] text-[#475569]">{selectedCall.id}</span>
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
          ) : (
            <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center text-slate-400">
              Select a call to inspect details
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
