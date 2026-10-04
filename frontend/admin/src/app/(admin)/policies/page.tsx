"use client";

import { useMemo, useState, useSyncExternalStore } from 'react';
import { AdminUser, getUserSnapshot, subscribeSession } from '@/lib/api';
import { PageHeader } from '@/components/admin/ui';
import { DocumentsTab } from '@/components/admin/policies/DocumentsTab';
import { RulesTab } from '@/components/admin/policies/RulesTab';

const TABS = [['documents', 'Policy documents'], ['rules', 'AI privacy rules']] as const;

export default function PoliciesPage() {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('documents');
  const rawAdmin = useSyncExternalStore(subscribeSession, getUserSnapshot, () => null);
  const canEdit = useMemo(() => { try { const r = (rawAdmin ? (JSON.parse(rawAdmin) as AdminUser) : null)?.role; return r === 'superadmin' || r === 'super_admin'; } catch { return false; } }, [rawAdmin]);

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <PageHeader title="Policies & Privacy" subtitle="The documents clinics accept, and the privacy rules the AI follows, by region." />
      <div className="mb-4 flex gap-1 border-b border-[#E2E8F0]" role="tablist">
        {TABS.map(([key, name]) => (
          <button key={key} role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={`-mb-px border-b-2 px-4 py-2 text-xs font-bold ${tab === key ? 'border-[#0066FF] text-[#0066FF]' : 'border-transparent text-[#475569] hover:text-[#0F172A]'}`}>{name}</button>
        ))}
      </div>
      {tab === 'documents' ? <DocumentsTab canEdit={canEdit} /> : <RulesTab canEdit={canEdit} />}
    </div>
  );
}
