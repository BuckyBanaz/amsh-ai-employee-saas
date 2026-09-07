"use client";
import React, { useState } from 'react';
import Link from 'next/link';

interface ConversationItem {
  id: string;
  businessId: string;
  businessName: string;
  channel: 'Voice Call' | 'WhatsApp' | 'Web Chat' | 'SMS';
  user: string;
  userPhone: string;
  topic: string;
  turns: number;
  duration: string;
  sentiment: 'Positive' | 'Neutral' | 'Frustrated';
  sentimentColor: { bg: string; text: string };
  date: string;
}

const conversationsData: ConversationItem[] = [
  {
    id: 'cnv-8912',
    businessId: 'b-1',
    businessName: 'Smile Dental Clinic',
    channel: 'Voice Call',
    user: 'Sarah Wilson',
    userPhone: '+31 6 1234 5678',
    topic: 'Teeth Cleaning Booking',
    turns: 6,
    duration: '2m 45s',
    sentiment: 'Positive',
    sentimentColor: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
    date: 'Today, 10:24 AM',
  },
  {
    id: 'cnv-8913',
    businessId: 'b-2',
    businessName: 'Amsterdam Dental Care',
    channel: 'WhatsApp',
    user: 'Mark de Jong',
    userPhone: '+31 8 9876 5432',
    topic: 'Reschedule Check-up',
    turns: 4,
    duration: '1m 20s',
    sentiment: 'Positive',
    sentimentColor: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
    date: 'Today, 10:18 AM',
  },
  {
    id: 'cnv-8914',
    businessId: 'b-3',
    businessName: 'Berlin Health Center',
    channel: 'Voice Call',
    user: 'Klaus Schmidt',
    userPhone: '+49 170 998877',
    topic: 'Emergency Dental Pain',
    turns: 3,
    duration: '1m 30s',
    sentiment: 'Frustrated',
    sentimentColor: { bg: 'bg-[#FEE2E2]', text: 'text-[#991B1B]' },
    date: 'Today, 10:05 AM',
  },
  {
    id: 'cnv-8915',
    businessId: 'b-4',
    businessName: 'Bella Rosa Ristorante',
    channel: 'Web Chat',
    user: 'Marco Rossi',
    userPhone: '+49 172 112233',
    topic: 'Tasting Menu & Dietary Qs',
    turns: 8,
    duration: '3m 10s',
    sentiment: 'Positive',
    sentimentColor: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
    date: 'Today, 09:50 AM',
  },
  {
    id: 'cnv-8916',
    businessId: 'b-5',
    businessName: 'Glow & Shine Salon',
    channel: 'SMS',
    user: 'Marie Dubois',
    userPhone: '+33 6 554433',
    topic: 'Cancellation Policy Inquiry',
    turns: 5,
    duration: '2m 05s',
    sentiment: 'Neutral',
    sentimentColor: { bg: 'bg-gray-100', text: 'text-gray-700' },
    date: 'Today, 09:42 AM',
  },
  {
    id: 'cnv-8917',
    businessId: 'b-6',
    businessName: 'FitLife Studio',
    channel: 'Voice Call',
    user: 'James Smith',
    userPhone: '+44 7700 900077',
    topic: 'Corporate Gym Pass Pricing',
    turns: 7,
    duration: '5m 20s',
    sentiment: 'Positive',
    sentimentColor: { bg: 'bg-[#D1FAE5]', text: 'text-[#065F46]' },
    date: 'Today, 09:15 AM',
  },
];

export default function ConversationsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBusiness, setSelectedBusiness] = useState('All');
  const [selectedChannel, setSelectedChannel] = useState('All');
  const [selectedSentiment, setSelectedSentiment] = useState('All');

  const businessOptions = [
    'All',
    'Smile Dental Clinic',
    'Amsterdam Dental Care',
    'Berlin Health Center',
    'Bella Rosa Ristorante',
    'Glow & Shine Salon',
    'FitLife Studio',
  ];

  const filteredConversations = conversationsData.filter((cnv) => {
    const matchesSearch =
      cnv.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cnv.userPhone.includes(searchQuery) ||
      cnv.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      cnv.businessName.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesBusiness =
      selectedBusiness === 'All' || cnv.businessName === selectedBusiness;

    const matchesChannel =
      selectedChannel === 'All' || cnv.channel === selectedChannel;

    const matchesSentiment =
      selectedSentiment === 'All' || cnv.sentiment === selectedSentiment;

    return matchesSearch && matchesBusiness && matchesChannel && matchesSentiment;
  });

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-5 md:p-6 animate-in fade-in duration-300 text-[13px]">
      {/* Compact Header */}
      <header className="mb-4 pb-3.5 border-b border-[#E2E8F0] flex justify-between items-center">
        <div>
          <h1 className="text-[20px] font-bold text-[#0F172A] tracking-tight leading-tight">
            AI Conversations
          </h1>
          <p className="text-[12px] text-[#475569] mt-0.5 font-normal">
            Real-time omnichannel conversation logs across all platform tenants.
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

      {/* Top 4 KPI Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 mb-4">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
            TOTAL CONVERSATIONS
          </div>
          <div className="text-[20px] font-bold text-[#0F172A] leading-none mb-1">
            18,420
          </div>
          <div className="text-[10px] font-semibold text-[#10B981]">
            +14.2% this month
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
            VOICE CHANNELS
          </div>
          <div className="text-[20px] font-bold text-[#0F172A] leading-none mb-1">
            12,890
          </div>
          <div className="text-[10px] font-semibold text-[#2563EB]">
            70% of total
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
            WHATSAPP / WEB / SMS
          </div>
          <div className="text-[20px] font-bold text-[#0F172A] leading-none mb-1">
            5,530
          </div>
          <div className="text-[10px] font-semibold text-[#10B981]">
            30% of total
          </div>
        </div>

        <div className="bg-white border border-[#E2E8F0] rounded-xl p-3 shadow-sm">
          <div className="text-[10px] font-bold text-[#94A3B8] uppercase tracking-wider mb-1">
            AVG TURNS PER DIALOGUE
          </div>
          <div className="text-[20px] font-bold text-[#0F172A] leading-none mb-1">
            4.8 turns
          </div>
          <div className="text-[10px] font-semibold text-[#10B981]">
            High Resolution Speed
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
              placeholder="Search user, topic, phone..."
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
            {businessOptions.map((b) => (
              <option key={b} value={b}>
                {b === 'All' ? 'Business: All' : b}
              </option>
            ))}
          </select>

          {/* Channel Filter */}
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[11px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            <option value="All">Channel: All</option>
            <option value="Voice Call">Voice Call</option>
            <option value="WhatsApp">WhatsApp</option>
            <option value="Web Chat">Web Chat</option>
            <option value="SMS">SMS</option>
          </select>

          {/* Sentiment Filter */}
          <select
            value={selectedSentiment}
            onChange={(e) => setSelectedSentiment(e.target.value)}
            className="px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[11px] font-semibold text-[#475569] hover:bg-gray-100/80 transition-colors focus:outline-none"
          >
            <option value="All">Sentiment: All</option>
            <option value="Positive">Positive</option>
            <option value="Neutral">Neutral</option>
            <option value="Frustrated">Frustrated</option>
          </select>
        </div>

        {(selectedBusiness !== 'All' || selectedChannel !== 'All' || selectedSentiment !== 'All' || searchQuery) && (
          <button
            onClick={() => {
              setSelectedBusiness('All');
              setSelectedChannel('All');
              setSelectedSentiment('All');
              setSearchQuery('');
            }}
            className="text-[11px] font-semibold text-[#2563EB] hover:underline px-2 py-0.5"
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Conversations Table */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-3.5 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider min-w-[170px]">
                  Business
                </th>
                <th className="px-3 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider min-w-[130px]">
                  Channel
                </th>
                <th className="px-3 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider min-w-[150px]">
                  User / Contact
                </th>
                <th className="px-3 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider min-w-[170px]">
                  Topic / Intent
                </th>
                <th className="px-2.5 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider min-w-[100px]">
                  Turns & Duration
                </th>
                <th className="px-2.5 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider min-w-[100px]">
                  Sentiment
                </th>
                <th className="px-2.5 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider min-w-[110px]">
                  Date
                </th>
                <th className="px-3 py-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider text-right min-w-[80px]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {filteredConversations.map((cnv) => (
                <tr key={cnv.id} className="hover:bg-[#F8FAFC]/70 transition-colors text-[12px]">
                  {/* Business */}
                  <td className="px-3.5 py-2.5 whitespace-nowrap">
                    <Link
                      href={`/businesses/${cnv.businessId}`}
                      className="font-semibold text-[#0F172A] hover:text-[#2563EB] transition-colors flex items-center gap-1"
                    >
                      {cnv.businessName}
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-[#94A3B8]">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                        <polyline points="15 3 21 3 21 9"></polyline>
                        <line x1="10" y1="14" x2="21" y2="3"></line>
                      </svg>
                    </Link>
                  </td>

                  {/* Channel */}
                  <td className="px-3 py-2.5 whitespace-nowrap font-medium text-[#475569]">
                    <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-gray-50 border border-[#E2E8F0] text-[11px]">
                      {cnv.channel === 'Voice Call' && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                        </svg>
                      )}
                      {cnv.channel === 'WhatsApp' && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                        </svg>
                      )}
                      {cnv.channel === 'Web Chat' && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="2" y1="12" x2="22" y2="12"></line>
                          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                        </svg>
                      )}
                      {cnv.channel === 'SMS' && (
                        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
                          <line x1="12" y1="18" x2="12.01" y2="18"></line>
                        </svg>
                      )}
                      <span>{cnv.channel}</span>
                    </span>
                  </td>

                  {/* User */}
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <Link
                      href={`/conversations/${cnv.id}`}
                      className="font-semibold text-[#0F172A] hover:text-[#2563EB] transition-colors"
                    >
                      {cnv.user}
                    </Link>
                    <div className="text-[10px] text-[#94A3B8]">
                      {cnv.userPhone}
                    </div>
                  </td>

                  {/* Topic */}
                  <td className="px-3 py-2.5 whitespace-nowrap font-medium text-[#0F172A]">
                    <Link
                      href={`/conversations/${cnv.id}`}
                      className="hover:text-[#2563EB] transition-colors"
                    >
                      {cnv.topic}
                    </Link>
                  </td>

                  {/* Turns & Duration */}
                  <td className="px-2.5 py-2.5 whitespace-nowrap text-[#475569]">
                    <div>{cnv.turns} turns</div>
                    <div className="text-[10px] text-[#94A3B8]">{cnv.duration}</div>
                  </td>

                  {/* Sentiment */}
                  <td className="px-2.5 py-2.5 whitespace-nowrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold ${cnv.sentimentColor.bg} ${cnv.sentimentColor.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        cnv.sentiment === 'Positive' ? 'bg-emerald-500' : cnv.sentiment === 'Neutral' ? 'bg-gray-400' : 'bg-red-500'
                      }`} />
                      {cnv.sentiment}
                    </span>
                  </td>

                  {/* Date */}
                  <td className="px-2.5 py-2.5 whitespace-nowrap text-[#94A3B8]">
                    {cnv.date}
                  </td>

                  {/* Action */}
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    <Link
                      href={`/conversations/${cnv.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-[#E2E8F0] hover:bg-blue-50 text-[#2563EB] rounded text-[11px] font-semibold transition-colors"
                    >
                      Inspect
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <polyline points="9 18 15 12 9 6"></polyline>
                      </svg>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
