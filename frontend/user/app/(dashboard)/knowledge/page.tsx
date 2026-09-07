"use client";
import React from 'react';
import { KnowledgeHeader } from '../../../components/dashboard/KnowledgeHeader';
import { KnowledgeStats } from '../../../components/dashboard/KnowledgeStats';
import { KnowledgeTable } from '../../../components/dashboard/KnowledgeTable';

export default function KnowledgeBasePage() {
  return (
    <div className="animate-in fade-in duration-500 pt-4 pb-6 flex flex-col h-full w-full">
      <KnowledgeHeader />
      <KnowledgeStats />
      <KnowledgeTable />
    </div>
  );
}
