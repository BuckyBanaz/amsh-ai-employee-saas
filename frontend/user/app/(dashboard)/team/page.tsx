"use client";
import React, { useState } from 'react';
import { TeamHeader } from '../../../components/dashboard/TeamHeader';
import { TeamTable } from '../../../components/dashboard/TeamTable';
import { STRINGS } from '../../../utils/strings/en';
import { InviteMemberModal } from '../../../components/dashboard/InviteMemberModal';

export default function TeamPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <div className="animate-in fade-in duration-500 pt-4 pb-6 flex flex-col h-full w-full relative">
      <TeamHeader onInviteClick={() => setIsModalOpen(true)} />
      
      <div className="flex justify-end mb-6">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="px-5 py-2.5 bg-[#0066FF] text-white rounded-lg text-[13px] font-bold shadow-sm hover:bg-[#0052cc] transition-colors"
        >
          {STRINGS.DASHBOARD.TEAM.INVITE_BTN}
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        <TeamTable />
      </div>

      <InviteMemberModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
