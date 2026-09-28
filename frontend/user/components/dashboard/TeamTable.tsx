"use client";
import React, { useState } from 'react';
import { STRINGS } from '../../utils/strings/en';
import { TableSkeleton } from '../common/ShimmerSkeleton';

export interface TeamMemberItem {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active?: boolean;
  status?: string;
  last_active?: string;
  created_at?: string;
}

interface TeamTableProps {
  members: TeamMemberItem[];
  loading?: boolean;
  onDeleteMember?: (id: string) => void;
}

export function TeamTable({
  members,
  loading = false,
  onDeleteMember,
}: TeamTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (loading) {
    return (
      <TableSkeleton
        rows={5}
        headers={["TEAM MEMBER", "ROLE", "LAST ACTIVE", "STATUS", "ACTIONS"]}
        statusMessage="Loading clinic team roster & permissions..."
      />
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-xs p-12 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#0066FF] mb-3">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-gray-900">No team members yet</h3>
        <p className="text-xs text-gray-500 mt-1 max-w-xs">
          Invite receptionists, doctors, or administrators to manage your receptionist workspace.
        </p>
      </div>
    );
  }

  const getInitials = (name?: string) => {
    if (!name) return 'TM';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  const getRoleBadge = (role: string = 'member') => {
    const r = role.toLowerCase();
    if (r === 'owner' || r === 'admin') {
      return 'bg-purple-50 text-purple-700 border-purple-100';
    }
    if (r === 'doctor') {
      return 'bg-blue-50 text-blue-700 border-blue-100';
    }
    return 'bg-emerald-50 text-emerald-700 border-emerald-100';
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-xs overflow-hidden mb-4 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-bold text-gray-900 tracking-tight">{STRINGS.TABLES.TEAM.TITLE}</h3>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0066FF] border border-blue-100">
            {members.length} {members.length === 1 ? 'member' : 'members'}
          </span>
        </div>
      </div>
      
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#F9FAFB]/60 border-b border-gray-100">{STRINGS.TABLES.TEAM.HEADERS.NAME}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#F9FAFB]/60 border-b border-gray-100">{STRINGS.TABLES.TEAM.HEADERS.EMAIL}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#F9FAFB]/60 border-b border-gray-100">{STRINGS.TABLES.TEAM.HEADERS.ROLE}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#F9FAFB]/60 border-b border-gray-100">{STRINGS.TABLES.TEAM.HEADERS.STATUS}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#F9FAFB]/60 border-b border-gray-100 text-right">{STRINGS.TABLES.TEAM.HEADERS.ACTIONS}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {members.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                
                {/* Name Column */}
                <td className="px-3.5 py-2.5 whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs bg-blue-50 text-[#0066FF] border border-blue-100">
                      {getInitials(member.name)}
                    </div>
                    <div className="text-xs font-semibold text-gray-900">{member.name || 'Unnamed Member'}</div>
                  </div>
                </td>

                {/* Email Column */}
                <td className="px-3.5 py-2.5 whitespace-nowrap">
                  <div className="text-xs text-gray-500 font-medium">{member.email}</div>
                </td>

                {/* Role Column */}
                <td className="px-3.5 py-2.5 whitespace-nowrap">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider border ${getRoleBadge(member.role)}`}>
                    {member.role || 'Member'}
                  </span>
                </td>

                {/* Status Column */}
                <td className="px-3.5 py-2.5 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Active
                  </span>
                </td>

                {/* Actions Column */}
                <td className="px-3.5 py-2.5 text-right whitespace-nowrap">
                  {member.role?.toLowerCase() === 'owner' ? (
                    <span className="text-gray-300 font-bold text-xs">—</span>
                  ) : (
                    <div className="flex items-center justify-end gap-2">
                      {deletingId === member.id ? (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              onDeleteMember?.(member.id);
                              setDeletingId(null);
                            }}
                            className="text-[11px] font-bold text-red-600 bg-red-50 hover:bg-red-100 px-2 py-0.5 rounded border border-red-200 transition-colors cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="text-[11px] font-medium text-gray-500 hover:text-gray-700 px-1.5 py-0.5 transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(member.id)}
                          className="text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 px-2 py-1 rounded transition-colors cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  )}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
