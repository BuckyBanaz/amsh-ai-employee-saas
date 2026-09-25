"use client";
import React, { useEffect, useState, useCallback } from 'react';
import { DoctorsHeader } from '../../../components/dashboard/DoctorsHeader';
import { StaffCard, StaffCardProps } from '../../../components/dashboard/StaffCard';
import { NewStaffModal } from '../../../components/dashboard/NewStaffModal';
import { DashboardController, StaffItem } from '../../../controllers/dashboard.controller';

export default function DoctorsPage() {
  const [staffList, setStaffList] = useState<StaffCardProps[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const loadStaff = useCallback(async () => {
    try {
      setLoading(true);
      const items: StaffItem[] = await DashboardController.getStaff();
      const mapped: StaffCardProps[] = (items || []).map((s) => {
        const initials = (s.name?.slice(0, 2) || 'ST').toUpperCase();
        return {
          initials,
          name: s.name,
          specialty: s.specialty || 'General Practice',
          role: (s.role?.toUpperCase() === 'RECEPTIONIST' ? 'RECEPTIONIST' : 'DOCTOR') as 'DOCTOR' | 'RECEPTIONIST',
          status: 'Available',
          weeklySchedule: 'Active roster',
          rating: '5.0',
          contact: s.email || s.phone || 'Internal Staff',
          services: ['General Consultation'],
        };
      });
      setStaffList(mapped);
    } catch (err) {
      console.error('Failed to load staff roster:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  const handleAddStaff = async (payload: {
    name: string;
    role: string;
    specialty?: string;
    email?: string;
    phone?: string;
  }) => {
    await DashboardController.createStaff(payload);
    await loadStaff();
  };

  return (
    <div className="animate-in fade-in duration-500 pt-2 pb-12">
      <DoctorsHeader onAddStaff={() => setIsAddModalOpen(true)} />
      
      {loading ? (
        <div className="flex items-center justify-center p-16 text-xs text-gray-400">
          <span className="w-2 h-2 rounded-full bg-[#0066FF] animate-ping mr-2"></span>
          Loading staff roster...
        </div>
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
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-1.5 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors cursor-pointer"
          >
            + Add First Doctor / Staff
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {staffList.map((staff, idx) => (
            <StaffCard key={idx} {...staff} />
          ))}
        </div>
      )}

      <NewStaffModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddStaff}
      />
    </div>
  );
}
