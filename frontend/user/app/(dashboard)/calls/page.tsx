"use client";
import React from 'react';
import { CallLogsHeader } from '../../../components/dashboard/CallLogsHeader';
import { CallLogsFilterBar } from '../../../components/dashboard/CallLogsFilterBar';
import { CallLogsTable } from '../../../components/dashboard/CallLogsTable';
import { CallDetailPanel } from '../../../components/dashboard/CallDetailPanel';

export default function CallLogsPage() {
  return (
    <div className="animate-in fade-in duration-500 pt-4 pb-6 flex flex-col h-full">
      <CallLogsHeader />
      <CallLogsFilterBar />
      
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 flex-1 min-h-[600px]">
        <div className="xl:col-span-2 h-full min-w-0">
          <CallLogsTable />
        </div>
        <div className="h-full min-w-0">
          <CallDetailPanel />
        </div>
      </div>
    </div>
  );
}
