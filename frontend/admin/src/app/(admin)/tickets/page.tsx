"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  TEAM_MEMBERS,
  TicketStatus,
  priorityStyles,
  statusStyles,
  useTickets,
} from './store';

const filters: ('All' | TicketStatus)[] = ['All', 'Open', 'In Progress', 'Waiting', 'Resolved'];

export default function SupportTicketsPage() {
  const router = useRouter();
  const { tickets, resolve, reopen, escalate, assign } = useTickets();
  const [activeFilter, setActiveFilter] = useState<'All' | TicketStatus>('All');
  const [assigningId, setAssigningId] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const countFor = (filter: 'All' | TicketStatus) =>
    filter === 'All' ? tickets.length : tickets.filter((ticket) => ticket.status === filter).length;

  const visibleTickets = tickets.filter(
    (ticket) => activeFilter === 'All' || ticket.status === activeFilter
  );

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2600);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5 animate-in fade-in duration-500">
      <header className="mb-4 pb-3 border-b border-[#E2E8F0] flex justify-between items-center">
        <div>
          <h1 className="text-lg font-bold text-[#0F172A] tracking-tight leading-tight">Support Tickets</h1>
          <p className="text-xs text-[#475569] mt-0.5 font-normal">Customer support management.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 border border-[#E2E8F0] rounded-lg py-1.5 px-2.5 text-xs font-medium text-[#475569] bg-white shadow-2xs hover:bg-gray-50 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            Jan 1 - Jan 30, 2026
          </button>
          <button className="flex items-center justify-center border border-[#E2E8F0] rounded-full w-7 h-7 text-[#475569] bg-white shadow-2xs hover:bg-gray-50 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </button>
        </div>
      </header>

      {/* Status filter tabs */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3.5">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-2.5 py-1 rounded-md border text-xs font-semibold transition-colors ${
              activeFilter === filter
                ? 'bg-[#2563EB] border-[#2563EB] text-white shadow-2xs'
                : 'bg-white border-[#E2E8F0] text-[#475569] hover:bg-gray-50'
            }`}
          >
            {filter} ({countFor(filter)})
          </button>
        ))}
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-lg shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Ticket ID</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Business</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider min-w-[220px]">Subject</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Priority</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Status</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Assigned To</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider">Created</th>
                <th className="px-3.5 py-2 text-[10px] font-bold text-[#475569] uppercase tracking-wider w-[200px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E2E8F0]">
              {visibleTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3.5 py-6 text-center text-xs text-[#94A3B8]">
                    No tickets in this view.
                  </td>
                </tr>
              ) : (
                visibleTickets.map((ticket) => (
                  <tr
                    key={ticket.id}
                    onClick={() => router.push(`/tickets/${ticket.id}`)}
                    className="hover:bg-[#F8FAFC]/70 transition-colors cursor-pointer"
                  >
                    <td className="px-3.5 py-2 whitespace-nowrap">
                      <Link
                        href={`/tickets/${ticket.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-xs font-bold text-[#0F172A] hover:text-[#2563EB] transition-colors"
                      >
                        {ticket.id}
                      </Link>
                    </td>
                    <td className="px-3.5 py-2 text-xs font-semibold text-[#0F172A] whitespace-nowrap">{ticket.clinic}</td>
                    <td className="px-3.5 py-2 text-xs text-[#475569]">{ticket.subject}</td>
                    <td className="px-3.5 py-2 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${priorityStyles[ticket.priority]}`}>
                        {ticket.priority}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 whitespace-nowrap">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${statusStyles[ticket.status]}`}>
                        {ticket.status}
                      </span>
                    </td>
                    <td className="px-3.5 py-2 text-xs text-[#475569] whitespace-nowrap">{ticket.assignee}</td>
                    <td className="px-3.5 py-2 text-xs text-[#94A3B8] whitespace-nowrap">{ticket.created}</td>
                    <td className="px-3.5 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/tickets/${ticket.id}#reply`}
                          className="text-xs font-semibold text-[#2563EB] hover:underline"
                        >
                          Reply
                        </Link>

                        {ticket.status === 'Resolved' ? (
                          <button
                            onClick={() => {
                              reopen(ticket.id);
                              flash(`${ticket.id} reopened`);
                            }}
                            className="text-xs font-semibold text-[#475569] hover:underline"
                          >
                            Reopen
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              resolve(ticket.id);
                              flash(`${ticket.id} marked resolved`);
                            }}
                            className="text-xs font-semibold text-[#10B981] hover:underline"
                          >
                            Resolve
                          </button>
                        )}

                        <button
                          onClick={() => {
                            escalate(ticket.id);
                            flash(`${ticket.id} escalated`);
                          }}
                          disabled={ticket.priority === 'Critical'}
                          className="text-xs font-semibold text-[#F59E0B] hover:underline disabled:text-[#CBD5E1] disabled:no-underline disabled:cursor-not-allowed"
                        >
                          Escalate
                        </button>

                        <div className="relative">
                          <button
                            onClick={() => setAssigningId(assigningId === ticket.id ? null : ticket.id)}
                            className="text-xs font-semibold text-[#475569] hover:underline"
                          >
                            Assign
                          </button>
                          {assigningId === ticket.id && (
                            <div className="absolute right-0 top-6 z-20 w-40 bg-white border border-[#E2E8F0] rounded-lg shadow-lg py-1">
                              {TEAM_MEMBERS.map((member) => (
                                <button
                                  key={member}
                                  onClick={() => {
                                    assign(ticket.id, member);
                                    setAssigningId(null);
                                    flash(`${ticket.id} assigned to ${member}`);
                                  }}
                                  className={`w-full text-left px-2.5 py-1.5 text-xs transition-colors ${
                                    ticket.assignee === member
                                      ? 'bg-[#EFF6FF] text-[#2563EB] font-semibold'
                                      : 'text-[#0F172A] hover:bg-gray-50'
                                  }`}
                                >
                                  {member}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {toast && (
        <div
          role="status"
          className="fixed bottom-6 right-6 z-40 bg-[#0F172A] text-white text-[13px] font-semibold px-4 py-2.5 rounded-lg shadow-lg"
        >
          {toast}
        </div>
      )}
    </div>
  );
}
