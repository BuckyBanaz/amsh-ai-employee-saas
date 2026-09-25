"use client";
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { PatientsHeader } from '../../../components/dashboard/PatientsHeader';
import { PatientsFilterBar } from '../../../components/dashboard/PatientsFilterBar';
import { PatientsTable } from '../../../components/dashboard/PatientsTable';
import { NewPatientModal } from '../../../components/dashboard/NewPatientModal';
import { DashboardController, CustomerItem } from '../../../controllers/dashboard.controller';

export default function PatientsPage() {
  const [patients, setPatients] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);

  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      const data = await DashboardController.getCustomers();
      setPatients(data || []);
    } catch (err) {
      console.error('Failed to load patient registry:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const handleAddPatient = async (payload: {
    name: string;
    phone_number: string;
    email?: string;
    notes?: string;
  }) => {
    await DashboardController.createCustomer(payload);
    await loadPatients();
  };

  const filteredPatients = useMemo(() => {
    return patients.filter((p) => {
      if (search) {
        const q = search.toLowerCase();
        const matchesName = (p.name || '').toLowerCase().includes(q);
        const matchesPhone = (p.phone_number || '').includes(q);
        if (!matchesName && !matchesPhone) return false;
      }
      if (selectedStatus) {
        if ((p.status || '').toLowerCase() !== selectedStatus.toLowerCase()) return false;
      }
      return true;
    });
  }, [patients, search, selectedStatus]);

  return (
    <div className="animate-in fade-in duration-500 pt-1 sm:pt-2 pb-8">
      <PatientsHeader onAddPatient={() => setIsAddModalOpen(true)} />
      
      <PatientsFilterBar
        search={search}
        onSearchChange={setSearch}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        onAddPatient={() => setIsAddModalOpen(true)}
      />

      <PatientsTable
        patients={filteredPatients}
        isLoading={loading}
      />

      <NewPatientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddPatient}
      />
    </div>
  );
}
