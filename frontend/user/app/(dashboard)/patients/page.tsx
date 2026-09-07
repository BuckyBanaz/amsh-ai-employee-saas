"use client";
import React from 'react';
import { PatientsHeader } from '../../../components/dashboard/PatientsHeader';
import { PatientsFilterBar } from '../../../components/dashboard/PatientsFilterBar';
import { PatientsTable } from '../../../components/dashboard/PatientsTable';

export default function PatientsPage() {
  return (
    <div className="animate-in fade-in duration-500 pt-6 pb-12">
      <PatientsHeader />
      <PatientsFilterBar />
      <PatientsTable />
    </div>
  );
}
