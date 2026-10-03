"use client";
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { AppointmentsHeader } from '../../../components/dashboard/AppointmentsHeader';
import { AppointmentsFilterBar } from '../../../components/dashboard/AppointmentsFilterBar';
import { WeeklyCalendar, DayInfo } from '../../../components/dashboard/WeeklyCalendar';
import { AppointmentsListView } from '../../../components/dashboard/AppointmentsListView';
import { AppointmentDetailPanel } from '../../../components/dashboard/AppointmentDetailPanel';
import { NewAppointmentModal } from '../../../components/dashboard/NewAppointmentModal';
import { useAutoRefresh } from '../../../hooks/useAutoRefresh';
import {
  DashboardController,
  AppointmentItem,
  StaffItem,
  ServiceItem,
} from '../../../controllers/dashboard.controller';

function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getWeekOffsetForDate(dateStr: string): number {
  if (!dateStr) return 0;
  const parts = dateStr.split('-').map(Number);
  if (parts.length < 3 || isNaN(parts[0])) return 0;
  const [y, m, d] = parts;
  const target = new Date(y, m - 1, d, 12, 0, 0);
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  const currentDay = today.getDay();
  const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
  const currentMonday = new Date(today);
  currentMonday.setDate(today.getDate() + distanceToMonday);

  const targetDay = target.getDay();
  const targetDistanceToMonday = targetDay === 0 ? -6 : 1 - targetDay;
  const targetMonday = new Date(target);
  targetMonday.setDate(target.getDate() + targetDistanceToMonday);

  const diffMs = targetMonday.getTime() - currentMonday.getTime();
  return Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<AppointmentItem[]>([]);
  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentItem | null>(null);
  const [activeView, setActiveView] = useState<'week' | 'list'>('week');

  // Filters
  const [selectedDoctor, setSelectedDoctor] = useState('');
  const [selectedService, setSelectedService] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSource, setSelectedSource] = useState('');

  // Dropdown options
  const [doctors, setDoctors] = useState<StaffItem[]>([]);
  const [services, setServices] = useState<ServiceItem[]>([]);

  // Navigation & Modals
  const [weekOffset, setWeekOffset] = useState(0);
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Compute full 7 days of the target week (Mon - Sun)
  const { weekDays, dateRangeText } = useMemo(() => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);

    const currentDay = today.getDay(); // 0 is Sun, 1 is Mon...
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday + weekOffset * 7);

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const todayStr = formatLocalDate(new Date());

    const days: DayInfo[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const fullDate = formatLocalDate(d);

      days.push({
        dayName: dayNames[i],
        dateNumber: d.getDate(),
        fullDate,
        isToday: fullDate === todayStr,
      });
    }

    const startMonth = months[monday.getMonth()];
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const endMonth = months[sunday.getMonth()];

    const rangeText = startMonth === endMonth
      ? `${startMonth} ${monday.getDate()} - ${sunday.getDate()}, ${monday.getFullYear()}`
      : `${startMonth} ${monday.getDate()} - ${endMonth} ${sunday.getDate()}, ${sunday.getFullYear()}`;

    return { weekDays: days, dateRangeText: rangeText };
  }, [weekOffset]);

  // Load appointments, doctors, and services
  const loadData = useCallback(async (silent: boolean = false) => {
    try {
      if (!silent) setIsLoading(true);
      const [apps, docs, srvs] = await Promise.all([
        DashboardController.getAppointments().catch(() => []),
        DashboardController.getStaff().catch(() => []),
        DashboardController.getServices().catch(() => []),
      ]);

      const appointmentList = apps || [];
      setAppointments(appointmentList);
      setDoctors(docs || []);
      setServices(srvs || []);

      if (appointmentList.length > 0) {
        setSelectedAppointment((prev) => {
          if (prev) {
            const found = appointmentList.find((a) => a.id === prev.id);
            return found || appointmentList[0];
          }
          return appointmentList[0];
        });
      }
    } catch (err) {
      console.error('Failed to load appointments data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // The AI books, moves and cancels appointments from calls and WhatsApp while this page is open: refresh in the background.
  useAutoRefresh(() => loadData(true));

  // Synchronize dynamic doctors and services from DB + real appointments (eliminates any mock data)
  const dynamicDoctors = useMemo(() => {
    const docMap = new Map<string, string>();
    doctors.forEach((d) => docMap.set(d.name.toLowerCase(), d.name));
    appointments.forEach((a) => {
      if (a.doctor_name && a.doctor_name !== 'Duty Doctor') {
        docMap.set(a.doctor_name.toLowerCase(), a.doctor_name);
      }
    });
    return Array.from(docMap.entries()).map(([k, name], idx) => ({ id: `doc-${idx}`, name }));
  }, [doctors, appointments]);

  const dynamicServices = useMemo(() => {
    const srvMap = new Map<string, string>();
    services.forEach((s) => srvMap.set(s.title.toLowerCase(), s.title));
    appointments.forEach((a) => {
      if (a.service_name && a.service_name !== 'General Consultation') {
        srvMap.set(a.service_name.toLowerCase(), a.service_name);
      }
    });
    return Array.from(srvMap.entries()).map(([k, title], idx) => ({ id: `srv-${idx}`, title }));
  }, [services, appointments]);

  // Handle Create Appointment
  const handleCreateAppointment = async (payload: {
    customer_name: string;
    phone_number: string;
    service_name: string;
    doctor_name: string;
    preferred_date: string;
    preferred_time: string;
    notes?: string;
  }) => {
    const created = await DashboardController.createAppointment(payload);
    await loadData();
    if (created) {
      setSelectedAppointment(created);
      // Auto-jump calendar week to the appointment date (even if in future!)
      if (created.preferred_date) {
        const offset = getWeekOffsetForDate(created.preferred_date);
        setWeekOffset(offset);
      }
    }
  };

  // Handle Select Appointment
  const handleSelectAppointment = (app: AppointmentItem) => {
    setSelectedAppointment(app);
    // If appointment is outside the currently viewed week, auto-jump to its week
    if (app.preferred_date) {
      const isVisibleInCurrentWeek = weekDays.some((w) => w.fullDate === app.preferred_date);
      if (!isVisibleInCurrentWeek) {
        const offset = getWeekOffsetForDate(app.preferred_date);
        setWeekOffset(offset);
      }
    }
  };

  // Handle Update Status
  const handleUpdateStatus = async (appointmentId: string, status: string) => {
    await DashboardController.updateAppointment(appointmentId, { status });
    await loadData();
  };

  // Filtered Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((app) => {
      if (selectedDoctor && !app.doctor_name?.toLowerCase().includes(selectedDoctor.toLowerCase())) {
        return false;
      }
      if (selectedService && !app.service_name?.toLowerCase().includes(selectedService.toLowerCase())) {
        return false;
      }
      if (selectedStatus && app.status?.toLowerCase() !== selectedStatus.toLowerCase()) {
        return false;
      }
      if (selectedSource) {
        const isAI = app.details?.source?.includes('ai') || Boolean(app.call_id);
        if (selectedSource === 'ai' && !isAI) return false;
        if (selectedSource === 'manual' && isAI) return false;
      }
      return true;
    });
  }, [appointments, selectedDoctor, selectedService, selectedStatus, selectedSource]);

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-8">
      {/* Header with Navigation, Date Picker Jump, & New Appointment Trigger */}
      <AppointmentsHeader
        onNewAppointment={() => setIsNewModalOpen(true)}
        dateRangeText={dateRangeText}
        onPrevWeek={() => setWeekOffset((prev) => prev - 1)}
        onNextWeek={() => setWeekOffset((prev) => prev + 1)}
        onToday={() => setWeekOffset(0)}
        onSelectDate={(dateStr) => {
          const offset = getWeekOffsetForDate(dateStr);
          setWeekOffset(offset);
        }}
      />

      {/* Filter Bar with View Switcher (Week Calendar vs List View) */}
      <AppointmentsFilterBar
        activeView={activeView}
        onViewChange={(view) => setActiveView(view)}
        selectedDoctor={selectedDoctor}
        onDoctorChange={setSelectedDoctor}
        selectedService={selectedService}
        onServiceChange={setSelectedService}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        selectedSource={selectedSource}
        onSourceChange={setSelectedSource}
        doctors={dynamicDoctors}
        services={dynamicServices}
      />

      {/* Main Content Area */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3">
          {activeView === 'week' ? (
            <WeeklyCalendar
              weekDays={weekDays}
              appointments={filteredAppointments}
              selectedAppointmentId={selectedAppointment?.id}
              onSelectAppointment={handleSelectAppointment}
              isLoading={isLoading}
            />
          ) : (
            <AppointmentsListView
              appointments={filteredAppointments}
              selectedAppointmentId={selectedAppointment?.id}
              onSelectAppointment={handleSelectAppointment}
              onUpdateStatus={handleUpdateStatus}
              onViewCalendar={(app) => {
                handleSelectAppointment(app);
                setActiveView('week');
              }}
              isLoading={isLoading}
            />
          )}
        </div>

        {/* Selected Appointment Details Panel */}
        <div className="xl:col-span-1">
          <AppointmentDetailPanel
            appointment={selectedAppointment}
            onUpdateStatus={async (status) => {
              if (selectedAppointment) {
                await handleUpdateStatus(selectedAppointment.id, status);
              }
            }}
            onNewAppointmentClick={() => setIsNewModalOpen(true)}
          />
        </div>
      </div>

      {/* New Appointment Modal */}
      <NewAppointmentModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSubmit={handleCreateAppointment}
        doctors={dynamicDoctors}
        services={dynamicServices}
      />
    </div>
  );
}
