"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

const teamMembers = STRINGS.TABLES.TEAM.MOCK_DATA;

export function TeamTable() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden mb-10 flex flex-col">
      <div className="p-6 border-b border-gray-50 flex items-center justify-between">
        <h3 className="text-[16px] font-extrabold text-gray-900 tracking-tight">{STRINGS.TABLES.TEAM.TITLE}</h3>
      </div>
      
      <div className="overflow-x-auto scrollbar-hide">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-6 py-4 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider bg-white border-b border-gray-50">{STRINGS.TABLES.TEAM.HEADERS.NAME}</th>
              <th className="px-6 py-4 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider bg-white border-b border-gray-50">{STRINGS.TABLES.TEAM.HEADERS.EMAIL}</th>
              <th className="px-6 py-4 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider bg-white border-b border-gray-50">{STRINGS.TABLES.TEAM.HEADERS.ROLE}</th>
              <th className="px-6 py-4 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider bg-white border-b border-gray-50">{STRINGS.TABLES.TEAM.HEADERS.STATUS}</th>
              <th className="px-6 py-4 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider bg-white border-b border-gray-50">{STRINGS.TABLES.TEAM.HEADERS.LAST_ACTIVE}</th>
              <th className="px-6 py-4 text-[11px] font-extrabold text-gray-400 uppercase tracking-wider bg-white border-b border-gray-50 text-right">{STRINGS.TABLES.TEAM.HEADERS.ACTIONS}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {teamMembers.map((member) => (
              <tr key={member.id} className="hover:bg-gray-50/50 transition-colors">
                
                {/* Name Column */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${member.avatarBg} ${member.avatarColor}`}>
                      {member.initials}
                    </div>
                    <div className="text-[13px] font-extrabold text-gray-900">{member.name}</div>
                  </div>
                </td>

                {/* Email Column */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-[13px] font-medium text-gray-500">{member.email}</div>
                </td>

                {/* Role Column */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-md uppercase tracking-wide ${member.roleColor}`}>
                    {member.role}
                  </span>
                </td>

                {/* Status Column */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${member.statusColor}`}>
                    {member.status}
                  </span>
                </td>

                {/* Last Active Column */}
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-[13px] font-medium text-gray-500">{member.lastActive}</div>
                </td>

                {/* Actions Column */}
                <td className="px-6 py-4 text-right whitespace-nowrap">
                  {member.role === 'OWNER' ? (
                    <span className="text-gray-300 font-bold">—</span>
                  ) : member.status === 'INVITED' ? (
                    <div className="flex items-center justify-end gap-3">
                      <button className="text-[13px] font-bold text-[#0066FF] hover:text-[#0052cc] transition-colors">
                        {STRINGS.TABLES.TEAM.ACTIONS.RESEND}
                      </button>
                      <button className="text-[13px] font-bold text-gray-500 hover:text-gray-900 transition-colors">
                        {STRINGS.TABLES.TEAM.ACTIONS.CANCEL}
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-end gap-3">
                      <button className="text-[13px] font-bold text-[#0066FF] hover:text-[#0052cc] transition-colors">
                        {STRINGS.TABLES.TEAM.ACTIONS.EDIT}
                      </button>
                      <button className="text-[13px] font-bold text-[#EF4444] hover:text-red-700 transition-colors">
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
