"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

const teamMembers = STRINGS.TABLES.TEAM.MOCK_DATA;

export function TeamTable() {
  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] overflow-hidden mb-4 flex flex-col">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-900 tracking-tight">{STRINGS.TABLES.TEAM.TITLE}</h3>
      </div>
      
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#F9FAFB]/60 border-b border-gray-100">{STRINGS.TABLES.TEAM.HEADERS.NAME}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#F9FAFB]/60 border-b border-gray-100">{STRINGS.TABLES.TEAM.HEADERS.EMAIL}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#F9FAFB]/60 border-b border-gray-100">{STRINGS.TABLES.TEAM.HEADERS.ROLE}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#F9FAFB]/60 border-b border-gray-100">{STRINGS.TABLES.TEAM.HEADERS.STATUS}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#F9FAFB]/60 border-b border-gray-100">{STRINGS.TABLES.TEAM.HEADERS.LAST_ACTIVE}</th>
              <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider bg-[#F9FAFB]/60 border-b border-gray-100 text-right">{STRINGS.TABLES.TEAM.HEADERS.ACTIONS}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {teamMembers.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                
                {/* Name Column */}
                <td className="px-3.5 py-2 whitespace-nowrap">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs shadow-2xs ${member.avatarBg} ${member.avatarColor}`}>
                      {member.initials}
                    </div>
                    <div className="text-xs font-semibold text-gray-900">{member.name}</div>
                  </div>
                </td>

                {/* Email Column */}
                <td className="px-3.5 py-2 whitespace-nowrap">
                  <div className="text-xs text-gray-500">{member.email}</div>
                </td>

                {/* Role Column */}
                <td className="px-3.5 py-2 whitespace-nowrap">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${member.roleColor}`}>
                    {member.role}
                  </span>
                </td>

                {/* Status Column */}
                <td className="px-3.5 py-2 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider ${member.statusColor}`}>
                    {member.status}
                  </span>
                </td>

                {/* Last Active Column */}
                <td className="px-3.5 py-2 whitespace-nowrap">
                  <div className="text-xs text-gray-500">{member.lastActive}</div>
                </td>

                {/* Actions Column */}
                <td className="px-3.5 py-2 text-right whitespace-nowrap">
                  {member.role === 'OWNER' ? (
                    <span className="text-gray-300 font-bold">—</span>
                  ) : member.status === 'INVITED' ? (
                    <div className="flex items-center justify-end gap-2.5">
                      <button className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors">
                        {STRINGS.TABLES.TEAM.ACTIONS.RESEND}
                      </button>
                      <button className="text-xs font-medium text-gray-500 hover:text-gray-900 transition-colors">
                        {STRINGS.TABLES.TEAM.ACTIONS.CANCEL}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-2.5">
                      <button className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors">
                        {STRINGS.TABLES.TEAM.ACTIONS.EDIT}
                      </button>
                      <button className="text-xs font-semibold text-[#EF4444] hover:text-red-700 transition-colors">
                        {STRINGS.TABLES.TEAM.ACTIONS.REMOVE}
                      </button>
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
