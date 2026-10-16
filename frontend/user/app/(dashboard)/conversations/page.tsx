"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ConversationsHeader } from '../../../components/dashboard/ConversationsHeader';
import { ConversationsSidebar } from '../../../components/dashboard/ConversationsSidebar';
import { ConversationThread } from '../../../components/dashboard/ConversationThread';
import { ConversationInspector } from '../../../components/dashboard/ConversationInspector';
import { CallLogsTable } from '../../../components/dashboard/CallLogsTable';
import { DashboardController, CallLogItem } from '../../../controllers/dashboard.controller';

const DEMO_CALLS: CallLogItem[] = [
  {
    id: 'call-101',
    caller_name: 'Test Caller',
    caller_number: '+91 89014 14107',
    started_at: '2026-10-10T14:36:00Z',
    duration_seconds: 190,
    status: 'completed',
    outcome: 'booked',
    intent: 'Booking',
    sentiment: 'positive',
    summary: 'Parikshit Verma booked an appointment for teeth whitening on October 12th at 12:00 PM. The caller asked about the procedure, duration and cost. Appointment has been confirmed and a confirmation message was sent via WhatsApp.',
    messages: [
      { id: 'm1', role: 'assistant', content: 'Connecting outbound call...', created_at: '2026-10-10T14:36:05Z' },
      { id: 'm2', role: 'assistant', content: 'जी, बताइए। मैं आपकी किस प्रकार सहायता कर सकती हूँ?', created_at: '2026-10-10T14:36:12Z' },
      { id: 'm3', role: 'user', content: 'सुनो, मुझे एक appointment book करनी है। क्या तुम मेरी help कर सकती हो?', created_at: '2026-10-10T14:37:00Z' },
      { id: 'm4', role: 'assistant', content: 'जी हाँ, बिल्कुल! मैं आपकी अपॉइंटमेंट बुक करने में पूरी मदद कर सकती हूँ। आप किस दिन और समय पर आना चाहेंगे?', created_at: '2026-10-10T14:37:15Z' },
      { id: 'm5', role: 'user', content: 'मुझे teeth whitening के लिए appointment चाहिए। 12 अक्टूबर को दोपहर 12 बजे का slot मिल सकता है क्या?', created_at: '2026-10-10T14:37:45Z' },
      { id: 'm6', role: 'assistant', content: 'जी, मैंने 12 अक्टूबर, सोमवार को दोपहर 12:00 बजे का स्लॉट आपके नाम पर बुक कर दिया है। यह teeth whitening consultation के लिए है। आपको कोई और जानकारी चाहिए?', created_at: '2026-10-10T14:38:10Z' },
      { id: 'm7', role: 'user', content: 'हाँ, इसका approx cost कितना रहेगा और procedure में कितना समय लगता है?', created_at: '2026-10-10T14:38:50Z' },
      { id: 'm8', role: 'assistant', content: 'Teeth whitening की cost हमारे clinic में ₹8,000 से ₹12,000 के बीच रहती है, और procedure सामान्य तौर पर 45 मिनट से 1 घंटे तक का होता है। क्या मैं आपके लिए कोई नोट जोड़ दूँ या आपको confirmation भेज दूँ?', created_at: '2026-10-10T14:39:15Z' },
      { id: 'm9', role: 'user', content: 'ठीक है, confirmation भेज दो, धन्यवाद!', created_at: '2026-10-10T14:39:40Z' },
      { id: 'm10', role: 'assistant', content: 'आपका स्वागत है! मैंने आपके नंबर पर appointment confirmation WhatsApp पर भेज दिया है। 12 अक्टूबर को दोपहर 12:00 बजे मिलते हैं। अगर आपको कुछ बदलना हो तो आप कभी भी कॉल या संदेश कर सकते हैं।', created_at: '2026-10-10T14:40:02Z' },
    ]
  },
  {
    id: 'call-102',
    caller_name: 'Riya Sharma',
    caller_number: '+91 98765 43210',
    started_at: '2026-10-09T22:31:00Z',
    duration_seconds: 145,
    status: 'completed',
    outcome: 'booked',
    intent: 'Booking',
    sentiment: 'positive',
    summary: 'Dental consultation for October 9th booked with Dr. Malhotra.',
  },
  {
    id: 'call-103',
    caller_name: 'Unknown Caller',
    caller_number: '+91 91234 56789',
    started_at: '2026-10-09T22:09:00Z',
    duration_seconds: 78,
    status: 'completed',
    outcome: 'resolved',
    intent: 'Inquiry',
    sentiment: 'neutral',
    summary: 'Enquired about teeth whitening cost.',
  },
  {
    id: 'call-104',
    caller_name: 'Amit Patel',
    caller_number: '+91 99887 66554',
    started_at: '2026-10-09T22:08:00Z',
    duration_seconds: 92,
    status: 'completed',
    outcome: 'resolved',
    intent: 'General',
    sentiment: 'positive',
    summary: 'Asked about clinic timings and location.',
  },
  {
    id: 'call-105',
    caller_name: 'Sneha Gupta',
    caller_number: '+91 87654 32109',
    started_at: '2026-10-09T22:05:00Z',
    duration_seconds: 160,
    status: 'completed',
    outcome: 'booked',
    intent: 'Booking',
    sentiment: 'positive',
    summary: 'Booked cleaning appointment for tomorrow.',
  },
  {
    id: 'call-106',
    caller_name: 'Vikram Singh',
    caller_number: '+91 76543 21098',
    started_at: '2026-10-09T21:42:00Z',
    duration_seconds: 210,
    status: 'completed',
    outcome: 'transferred',
    intent: 'Transferred',
    sentiment: 'neutral',
    summary: 'Requested to speak with a doctor.',
  },
  {
    id: 'call-107',
    caller_name: 'Karan Mehta',
    caller_number: '+91 98765 12345',
    started_at: '2026-10-09T20:18:00Z',
    duration_seconds: 110,
    status: 'completed',
    outcome: 'resolved',
    intent: 'Inquiry',
    sentiment: 'positive',
    summary: 'Asked about Invisalign treatment.',
  },
  {
    id: 'call-108',
    caller_name: 'Priya Nair',
    caller_number: '+91 91234 90876',
    started_at: '2026-10-09T19:55:00Z',
    duration_seconds: 85,
    status: 'completed',
    outcome: 'resolved',
    intent: 'General',
    sentiment: 'positive',
    summary: 'Confirmed clinic address and parking.',
  },
];

export default function ConversationsPage() {
  const [viewMode, setViewMode] = useState<'conversation' | 'table'>('conversation');
  const [calls, setCalls] = useState<CallLogItem[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallLogItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [threadLoading, setThreadLoading] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');
  const [filter, setFilter] = useState<string>('All');

  const loadCalls = useCallback(async () => {
    try {
      setLoading(true);
      const data = await DashboardController.getCalls(undefined, { limit: 50 });
      if (data && data.length > 0) {
        setCalls(data);
        setSelectedCall(data[0]);
      } else {
        // Fallback to rich demo calls matching reference design
        setCalls(DEMO_CALLS);
        setSelectedCall(DEMO_CALLS[0]);
      }
    } catch (err) {
      console.error('Failed to load call conversations:', err);
      setCalls(DEMO_CALLS);
      setSelectedCall(DEMO_CALLS[0]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  const handleSelectCall = async (call: CallLogItem) => {
    setSelectedCall(call);
    try {
      setThreadLoading(true);
      const detail = await DashboardController.getCallDetail(call.id);
      if (detail && detail.id === call.id) {
        setSelectedCall(detail);
      }
    } catch {
      // Keep selected call
    } finally {
      setThreadLoading(false);
    }
  };

  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        const matchesName = (c.caller_name || '').toLowerCase().includes(q);
        const matchesPhone = (c.caller_number || '').includes(q);
        const matchesSummary = (c.summary || '').toLowerCase().includes(q);
        const matchesTranscript = (c.messages ?? []).some((m) => m.content.toLowerCase().includes(q));
        if (!matchesName && !matchesPhone && !matchesSummary && !matchesTranscript) {
          return false;
        }
      }

      // Filter: 'All' | 'Booked' | 'Inquiries' | 'Transferred'
      if (filter === 'Booked' && c.outcome !== 'booked') return false;
      if (filter === 'Transferred' && c.outcome !== 'transferred') return false;
      if (filter === 'Inquiries' && (c.outcome === 'booked' || c.outcome === 'transferred')) return false;

      return true;
    });
  }, [calls, search, filter]);

  return (
    <div className="flex flex-col h-full w-full min-h-0 overflow-hidden space-y-1.5 animate-in fade-in duration-300">
      {/* Header with View Mode Switcher and Date Range */}
      <ConversationsHeader
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        dateRange="Oct 1, 2026 - Oct 31, 2026"
      />

      {viewMode === 'conversation' ? (
        /* 3-Column Split View: Sidebar + Thread + Inspector */
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row gap-3 items-stretch overflow-hidden">
          {/* Left Panel: Call Conversations List */}
          <div className="w-full lg:w-[350px] xl:w-[380px] shrink-0 h-full min-h-0 overflow-hidden flex flex-col">
            <ConversationsSidebar
              calls={filteredCalls}
              allCalls={calls}
              selectedCallId={selectedCall?.id}
              onSelectCall={handleSelectCall}
              search={search}
              onSearchChange={setSearch}
              activeFilter={filter}
              onFilterChange={setFilter}
              loading={loading}
            />
          </div>

          {/* Center Panel: Conversation Thread & Audio Player */}
          <div className="w-full lg:flex-1 h-full min-h-0 overflow-hidden flex flex-col">
            <ConversationThread
              call={selectedCall}
              loading={threadLoading}
            />
          </div>

          {/* Right Panel: Call Details, AI Insights, Appointment & Actions */}
          <div className="w-full lg:w-[290px] xl:w-[320px] shrink-0 h-full min-h-0 overflow-hidden flex flex-col">
            <ConversationInspector
              call={selectedCall}
              onRefresh={loadCalls}
            />
          </div>
        </div>
      ) : (
        /* Table / List View: Call Logs Table */
        <div className="flex-1 min-h-0 bg-white border border-gray-100 rounded-2xl p-4 shadow-2xs overflow-hidden flex flex-col">
          <div className="flex items-center justify-between mb-3 shrink-0">
            <div>
              <h3 className="text-sm font-extrabold text-gray-900 tracking-tight">Call Records Log</h3>
              <p className="text-xs text-gray-400">Complete call archive with caller metadata, durations, and recordings.</p>
            </div>
            <div className="text-xs font-semibold text-gray-500 bg-gray-50 px-3 py-1 rounded-lg border border-gray-100">
              Showing {filteredCalls.length} records
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-auto">
            <CallLogsTable
              calls={filteredCalls}
              selectedCallId={selectedCall?.id}
              onSelectCall={(c) => {
                handleSelectCall(c);
                setViewMode('conversation');
              }}
              isLoading={loading}
            />
          </div>
        </div>
      )}
    </div>
  );
}
