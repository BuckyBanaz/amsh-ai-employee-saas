"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { DoctorsHeader } from '../../../components/dashboard/DoctorsHeader';
import { StaffCard, StaffCardProps } from '../../../components/dashboard/StaffCard';
import { NewStaffModal, StaffFormData } from '../../../components/dashboard/NewStaffModal';
import { StaffScheduleModal } from '../../../components/dashboard/StaffScheduleModal';
import { DashboardController, StaffItem, ServiceItem } from '../../../controllers/dashboard.controller';
import { CardGridSkeleton } from '../../../components/common/ShimmerSkeleton';

export default function DoctorsPage() {
  const [staffList, setStaffList] = useState<StaffCardProps[]>([]);
  const [availableServices, setAvailableServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Modals state
  const [isStaffModalOpen, setIsStaffModalOpen] = useState<boolean>(false);
  const [editingStaffData, setEditingStaffData] = useState<StaffFormData | null>(null);
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState<boolean>(false);
  const [selectedScheduleStaff, setSelectedScheduleStaff] = useState<StaffCardProps | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [staffItems, serviceItems] = await Promise.all([
        DashboardController.getStaff().catch(() => []),
        DashboardController.getServices().catch(() => []),
      ]);

      setAvailableServices(serviceItems || []);

      const serviceMap = new Map((serviceItems || []).map((s) => [s.id, s.title]));

      const mapped: StaffCardProps[] = (staffItems || []).map((s) => {
        const initials = (s.name?.slice(0, 2) || 'ST').toUpperCase();
        const assignedTitles = (s.service_ids || [])
          .map((id) => serviceMap.get(id))
          .filter(Boolean) as string[];

        return {
          id: s.id,
          initials,
          name: s.name,
          specialty: s.specialty || 'General Practice',
          role: (s.role?.toUpperCase() === 'RECEPTIONIST' ? 'RECEPTIONIST' : 'DOCTOR') as 'DOCTOR' | 'RECEPTIONIST',
          status: 'Available',
          weeklySchedule: 'Active roster',
          rating: '5.0',
          contact: s.email || s.phone || 'Internal Staff',
          services: assignedTitles.length > 0 ? assignedTitles : ['General Consultation'],
          service_ids: s.service_ids || [],
          email: s.email || '',
          phone: s.phone || '',
        };
      });

      setStaffList(mapped);
    } catch (err) {
      console.error('Failed to load staff roster or services:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handlers for Add/Edit
  const handleOpenAdd = () => {
    setEditingStaffData(null);
    setIsStaffModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffCardProps) => {
    setEditingStaffData({
      id: staff.id,
      name: staff.name,
      role: staff.role === 'RECEPTIONIST' ? 'Receptionist' : 'Doctor',
      specialty: staff.specialty,
      email: staff.email,
      phone: staff.phone,
      service_ids: staff.service_ids || [],
    });
    setIsStaffModalOpen(true);
  };

  const handleOpenSchedule = (staff: StaffCardProps) => {
    setSelectedScheduleStaff(staff);
    setIsScheduleModalOpen(true);
  };

  const handleSubmitStaff = async (payload: StaffFormData) => {
    if (payload.id) {
      // Update existing staff
      await DashboardController.updateStaff(payload.id, {
        name: payload.name,
        role: payload.role,
        specialty: payload.specialty,
        email: payload.email,
        phone: payload.phone,
        service_ids: payload.service_ids || [],
      });
    } else {
      // Create new staff
      await DashboardController.createStaff({
        name: payload.name,
        role: payload.role,
        specialty: payload.specialty,
        email: payload.email,
        phone: payload.phone,
        service_ids: payload.service_ids || [],
      });
    }
    await loadData();
  };

  const handleDeleteStaff = async (staffId: string) => {
    await DashboardController.deleteStaff(staffId);
    await loadData();
  };

  const handleSaveSchedule = async (staffId: string, scheduleData: any) => {
    // Optionally update status on staff
    if (scheduleData?.status) {
      setStaffList((prev) =>
        prev.map((s) => (s.id === staffId ? { ...s, status: scheduleData.status } : s))
      );
    }
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-8">
      <DoctorsHeader onAddStaff={handleOpenAdd} />

      {loading ? (
        <CardGridSkeleton count={6} />
      ) : staffList.length === 0 ? (
        <div className="bg-white border border-gray-100 rounded-xl p-10 text-center flex flex-col items-center justify-center max-w-md mx-auto mt-6 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center mb-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <h3 className="text-sm font-bold text-gray-900 mb-1">No staff members registered</h3>
          <p className="text-xs text-gray-500 mb-4 max-w-xs">
            Add team members, doctors, or specialists so your AI receptionist can assign bookings to them.
          </p>
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-1.5 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors cursor-pointer"
          >
            + Add First Doctor / Staff
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {staffList.map((staff, idx) => (
            <StaffCard
              key={staff.id || idx}
              {...staff}
              onEdit={handleOpenEdit}
              onViewSchedule={handleOpenSchedule}
            />
          ))}
        </div>
      )}

      {/* Add / Edit Doctor & Services Modal */}
      <NewStaffModal
        isOpen={isStaffModalOpen}
        onClose={() => setIsStaffModalOpen(false)}
        onSubmit={handleSubmitStaff}
        onDelete={handleDeleteStaff}
        initialData={editingStaffData}
        availableServices={availableServices}
      />

      {/* Doctor Weekly Schedule Modal */}
      <StaffScheduleModal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        staff={selectedScheduleStaff}
        onSaveSchedule={handleSaveSchedule}
      />
    </div>
  );
}
