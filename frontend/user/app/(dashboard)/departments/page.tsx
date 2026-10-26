"use client";
import React from 'react';
import { DepartmentsManager } from '../../../components/verticals/DepartmentsManager';
import { PageHeader } from '../../../components/verticals/PageBits';

export default function DepartmentsPage() {
  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-8 w-full">
      <PageHeader title="Departments" subtitle="Where the AI transfers each kind of call, and who is tried next when nobody answers." />
      <DepartmentsManager />
    </div>
  );
}
