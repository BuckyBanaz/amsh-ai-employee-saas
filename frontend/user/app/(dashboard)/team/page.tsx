"use client";
import React, { useState, useEffect } from 'react';
import { TeamHeader } from '../../../components/dashboard/TeamHeader';
import { TeamTable, TeamMemberItem } from '../../../components/dashboard/TeamTable';
import { InviteMemberModal } from '../../../components/dashboard/InviteMemberModal';
import { DashboardController } from '../../../controllers/dashboard.controller';

export default function TeamPage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [members, setMembers] = useState<TeamMemberItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const data = await DashboardController.getTeamMembers();
      setMembers(data || []);
    } catch (err) {
      console.error('Failed to load team members:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleDeleteMember = async (userId: string) => {
    try {
      await DashboardController.deleteTeamMember(userId);
      setMembers((prev) => prev.filter((m) => m.id !== userId));
    } catch (err) {
      console.error('Failed to remove team member:', err);
    }
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-8 flex flex-col h-full w-full relative">
      <TeamHeader onInviteClick={() => setIsModalOpen(true)} />

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        <TeamTable 
          members={members} 
          loading={loading} 
          onDeleteMember={handleDeleteMember} 
        />
      </div>

      <InviteMemberModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onMemberInvited={fetchMembers}
      />
    </div>
  );
}
