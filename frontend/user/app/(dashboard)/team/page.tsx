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
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string; url?: string } | null>(null);

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

  const handleResendInvite = async (member: TeamMemberItem) => {
    try {
      const res = await DashboardController.resendInvite(member.id);
      let copied = false;
      try {
        await navigator.clipboard.writeText(res.invite_url);
        copied = true;
      } catch {}
      setNotice({ kind: 'ok', text: `A new invite link was emailed to ${member.email}${copied ? ' and copied to your clipboard' : ''}.`, url: res.invite_url });
    } catch (err: unknown) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Could not resend the invite.' });
    }
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-8 flex flex-col h-full w-full relative">
      <TeamHeader onInviteClick={() => setIsModalOpen(true)} />

      {notice && (
        <div
          role={notice.kind === 'error' ? 'alert' : 'status'}
          className={`p-3 rounded-lg border text-xs flex items-start justify-between gap-3 ${
            notice.kind === 'ok' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-700'
          }`}
        >
          <div className="min-w-0">
            <p>{notice.text}</p>
            {notice.url && <p className="mt-1 font-mono text-[11px] break-all text-gray-600">{notice.url}</p>}
          </div>
          <button onClick={() => setNotice(null)} aria-label="Dismiss" className="font-semibold shrink-0 cursor-pointer">
            ✕
          </button>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide">
        <TeamTable 
          members={members} 
          loading={loading} 
          onDeleteMember={handleDeleteMember} 
          onResendInvite={handleResendInvite}
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
