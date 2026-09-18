"use client";
import React from 'react';
import { AppointmentsHeader } from '../../../components/dashboard/AppointmentsHeader';
import { AppointmentsFilterBar } from '../../../components/dashboard/AppointmentsFilterBar';
import { WeeklyCalendar } from '../../../components/dashboard/WeeklyCalendar';
import { AppointmentDetailPanel } from '../../../components/dashboard/AppointmentDetailPanel';

export default function AppointmentsPage() {
  return (
    <div className="animate-in fade-in duration-500 pt-1 pb-4">
      <AppointmentsHeader />
      <AppointmentsFilterBar />
      
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          <WeeklyCalendar />
        </div>
        <div className="xl:col-span-1">
          <AppointmentDetailPanel />
        </div>
      </div>
    </div>
  );
}
