"use client";
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ConversationsHeader } from '../../../components/dashboard/ConversationsHeader';
import { ConversationsSidebar } from '../../../components/dashboard/ConversationsSidebar';
import { ConversationThread } from '../../../components/dashboard/ConversationThread';
import { DashboardController, CallLogItem } from '../../../controllers/dashboard.controller';

export default function ConversationsPage() {
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
      const callList = data || [];
      setCalls(callList);
      if (callList.length > 0) {
        setSelectedCall(callList[0]);
      }
    } catch (err) {
      console.error('Failed to load call conversations:', err);
      setCalls([]);
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
      if (detail) {
        setSelectedCall(detail);
      }
    } catch {
      // keep current call
    } finally {
      setThreadLoading(false);
    }
  };

  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      // Search
      if (search) {
        const q = search.toLowerCase();
        const matchesName = (c.customer_name || '').toLowerCase().includes(q);
        const matchesPhone = (c.caller_number || '').includes(q);
        const matchesSummary = (c.summary || '').toLowerCase().includes(q);
        const matchesTranscript = (c.transcription || '').toLowerCase().includes(q);
        if (!matchesName && !matchesPhone && !matchesSummary && !matchesTranscript) {
          return false;
        }
      }

      // Filter: 'All' | 'Booked' | 'Inquiries' | 'Transferred'
      if (filter === 'Booked' && c.outcome !== 'booked') return false;
      if (filter === 'Transferred' && c.outcome !== 'transferred') return false;
      if (filter === 'Inquiries' && c.outcome === 'booked') return false;

      return true;
    });
  }, [calls, search, filter]);

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-8 flex flex-col h-full w-full">
      <ConversationsHeader />
      
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 flex-1 min-h-[560px]">
        {/* Sidebar takes 5 cols on lg, 4 on xl */}
        <div className="lg:col-span-5 xl:col-span-4 h-full min-w-0">
          <ConversationsSidebar
            calls={filteredCalls}
            selectedCallId={selectedCall?.id}
            onSelectCall={handleSelectCall}
            search={search}
            onSearchChange={setSearch}
            activeFilter={filter}
            onFilterChange={setFilter}
            loading={loading}
          />
        </div>
        
        {/* Thread takes remaining cols */}
        <div className="lg:col-span-7 xl:col-span-8 h-full min-w-0">
          <ConversationThread
            call={selectedCall}
            loading={threadLoading}
          />
        </div>
      </div>
    </div>
  );
}
