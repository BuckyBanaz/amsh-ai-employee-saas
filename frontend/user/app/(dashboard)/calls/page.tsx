"use client";
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { CallLogsHeader } from '../../../components/dashboard/CallLogsHeader';
import { CallLogsFilterBar } from '../../../components/dashboard/CallLogsFilterBar';
import { CallLogsTable } from '../../../components/dashboard/CallLogsTable';
import { CallDetailPanel } from '../../../components/dashboard/CallDetailPanel';
import { DashboardController, CallLogItem } from '../../../controllers/dashboard.controller';

export default function CallLogsPage() {
  const [calls, setCalls] = useState<CallLogItem[]>([]);
  const [selectedCall, setSelectedCall] = useState<CallLogItem | null>(null);
  const [isLoadingList, setIsLoadingList] = useState<boolean>(true);
  const [isLoadingDetail, setIsLoadingDetail] = useState<boolean>(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedIntent, setSelectedIntent] = useState('');

  const loadCalls = useCallback(async () => {
    try {
      setIsLoadingList(true);
      const data = await DashboardController.getCalls(undefined, { limit: 50 });
      const callList = data || [];
      setCalls(callList);

      if (callList.length > 0) {
        // Fetch detailed record for the first call
        setIsLoadingDetail(true);
        try {
          const detail = await DashboardController.getCallDetail(callList[0].id);
          setSelectedCall(detail || callList[0]);
        } catch {
          setSelectedCall(callList[0]);
        } finally {
          setIsLoadingDetail(false);
        }
      }
    } catch (err) {
      console.error('Failed to load call logs:', err);
    } finally {
      setIsLoadingList(false);
    }
  }, []);

  useEffect(() => {
    loadCalls();
  }, [loadCalls]);

  const handleSelectCall = async (call: CallLogItem) => {
    setSelectedCall(call);
    try {
      setIsLoadingDetail(true);
      const detail = await DashboardController.getCallDetail(call.id);
      if (detail) {
        setSelectedCall(detail);
      }
    } catch (err) {
      console.warn('Failed to load full call detail:', err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  const filteredCalls = useMemo(() => {
    return calls.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesCaller = (c.caller_name || '').toLowerCase().includes(q);
        const matchesNumber = (c.caller_number || '').includes(q);
        const matchesSummary = (c.summary || '').toLowerCase().includes(q);
        if (!matchesCaller && !matchesNumber && !matchesSummary) return false;
      }
      if (selectedStatus) {
        if (c.outcome?.toLowerCase() !== selectedStatus.toLowerCase()) return false;
      }
      if (selectedIntent) {
        if (!c.intent?.toLowerCase().includes(selectedIntent.toLowerCase())) return false;
      }
      return true;
    });
  }, [calls, search, selectedStatus, selectedIntent]);

  return (
    <div className="animate-in fade-in duration-500 pt-2 pb-6 flex flex-col h-full">
      <CallLogsHeader onRefresh={loadCalls} />
      
      <CallLogsFilterBar
        search={search}
        onSearchChange={setSearch}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedIntent={selectedIntent}
        onIntentChange={setSelectedIntent}
      />
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-[640px]">
        <div className="xl:col-span-2 h-full min-w-0">
          <CallLogsTable
            calls={filteredCalls}
            selectedCallId={selectedCall?.id}
            onSelectCall={handleSelectCall}
            isLoading={isLoadingList}
          />
        </div>
        <div className="h-full min-w-0">
          <CallDetailPanel
            call={selectedCall}
            loading={isLoadingDetail}
          />
        </div>
      </div>
    </div>
  );
}
