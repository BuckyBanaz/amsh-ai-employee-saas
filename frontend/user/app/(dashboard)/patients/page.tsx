"use client";
import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { PatientsHeader } from '../../../components/dashboard/PatientsHeader';
import { PatientsFilterBar } from '../../../components/dashboard/PatientsFilterBar';
import { PatientsTable } from '../../../components/dashboard/PatientsTable';
import { NewPatientModal } from '../../../components/dashboard/NewPatientModal';
import { PatientHistoryDrawer } from '../../../components/dashboard/PatientHistoryDrawer';
import { DashboardController, CustomerItem } from '../../../controllers/dashboard.controller';

export default function PatientsPage() {
  const [patients, setPatients] = useState<CustomerItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editing, setEditing] = useState<CustomerItem | null>(null);
  const [historyOf, setHistoryOf] = useState<CustomerItem | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPatients = useCallback(async () => {
    try {
      setLoading(true);
      const data = await DashboardController.getCustomers();
      setPatients(data || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load patient registry:', err);
      setError('Could not load your patients. Check your connection and try again.');
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

  const handleEditPatient = async (payload: { name: string; phone_number: string; email?: string; notes?: string }) => {
    if (!editing) return;
    await DashboardController.updateCustomer(editing.id, payload);
    await loadPatients();
  };

  const handleRemovePatient = async (patient: CustomerItem) => {
    try {
      await DashboardController.deleteCustomer(patient.id);
      setError(null);
      await loadPatients();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not remove the patient.');
    }
  };

  const closeHistory = useCallback(() => setHistoryOf(null), []);

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
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-8">
      <PatientsHeader onAddPatient={() => setIsAddModalOpen(true)} />
      
      <PatientsFilterBar
        search={search}
        onSearchChange={setSearch}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
      />

      {error && (
        <div role="alert" className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-center justify-between gap-3">
          <span>{error}</span>
          <button onClick={loadPatients} className="font-semibold underline cursor-pointer">Retry</button>
        </div>
      )}

      <PatientsTable
        patients={filteredPatients}
        isLoading={loading}
        onEdit={setEditing}
        onRemove={handleRemovePatient}
        onHistory={setHistoryOf}
      />

      <NewPatientModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSubmit={handleAddPatient}
      />

      {editing && (
        <NewPatientModal
          key={editing.id}
          isOpen
          initial={editing}
          onClose={() => setEditing(null)}
          onSubmit={handleEditPatient}
        />
      )}

      <PatientHistoryDrawer key={historyOf?.id ?? 'none'} patient={historyOf} onClose={closeHistory} />
    </div>
  );
}
