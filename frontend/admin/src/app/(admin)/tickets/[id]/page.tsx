"use client";
import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import {
  TEAM_MEMBERS,
  TicketStatus,
  priorityStyles,
  statusStyles,
  useTickets,
} from '../store';

const statusOptions: TicketStatus[] = ['Open', 'In Progress', 'Waiting', 'Resolved'];

const roleStyles: Record<string, string> = {
  Customer: 'bg-white border-[#E2E8F0]',
  Agent: 'bg-[#EFF6FF] border-[#BFDBFE]',
  System: 'bg-[#F8FAFC] border-[#E2E8F0]',
};

export default function TicketDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { getTicket, reply, resolve, reopen, escalate, assign, setStatus } = useTickets();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);

  const ticket = getTicket(params.id);

  if (!ticket) {
    return (
      <div className="flex-1 overflow-y-auto p-8">
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-8 text-center">
          <h1 className="text-[18px] font-bold text-[#0F172A] mb-2">Ticket not found</h1>
          <p className="text-[13px] text-[#64748B] mb-4">
            {params.id} does not exist, or the page was reloaded and in-memory state was cleared.
          </p>
          <Link
            href="/tickets"
            className="inline-flex px-3.5 py-2 bg-[#2563EB] text-white rounded-lg text-[13px] font-semibold"
          >
            Back to tickets
          </Link>
        </div>
      </div>
    );
  }

  const submitReply = () => {
    if (!draft.trim()) {
      setError('Write a message before sending.');
      return;
    }
    reply(ticket.id, draft.trim());
    setDraft('');
    setError(null);
  };

  return (
    <div className="flex-1 overflow-y-auto scrollbar-hide p-8 animate-in fade-in duration-500">
      <button
        onClick={() => router.push('/tickets')}
        className="flex items-center gap-1.5 text-[13px] font-semibold text-[#475569] hover:text-[#0F172A] mb-4 transition-colors"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        Back to Support Tickets
      </button>

      <header className="mb-6 pb-5 border-b border-[#E2E8F0] flex flex-wrap justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[13px] font-bold text-[#94A3B8]">{ticket.id}</span>
            <span className={`px-2 py-0.5 rounded-md text-[12px] font-semibold ${priorityStyles[ticket.priority]}`}>
              {ticket.priority}
            </span>
            <span className={`px-2 py-0.5 rounded-md text-[12px] font-semibold ${statusStyles[ticket.status]}`}>
              {ticket.status}
            </span>
          </div>
          <h1 className="text-[22px] font-bold text-[#0F172A] tracking-tight leading-tight">{ticket.subject}</h1>
          <p className="text-[13px] text-[#475569] mt-1">
            {ticket.clinic} · opened {ticket.created}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {ticket.status === 'Resolved' ? (
            <button
              onClick={() => reopen(ticket.id)}
              className="px-3.5 py-2 border border-[#E2E8F0] bg-white text-[#475569] rounded-lg text-[13px] font-semibold hover:bg-gray-50 transition-colors"
            >
              Reopen
            </button>
          ) : (
            <button
              onClick={() => resolve(ticket.id)}
              className="px-3.5 py-2 bg-[#10B981] hover:bg-emerald-600 text-white rounded-lg text-[13px] font-semibold transition-colors"
            >
              Resolve
            </button>
          )}
          <button
            onClick={() => escalate(ticket.id)}
            disabled={ticket.priority === 'Critical'}
            className="px-3.5 py-2 border border-[#F59E0B] text-[#B45309] rounded-lg text-[13px] font-semibold hover:bg-[#FEF3C7] transition-colors disabled:border-[#E2E8F0] disabled:text-[#CBD5E1] disabled:hover:bg-transparent disabled:cursor-not-allowed"
          >
            {ticket.priority === 'Critical' ? 'Max priority' : 'Escalate'}
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Conversation */}
        <section className="xl:col-span-2 bg-white border border-[#E2E8F0] rounded-xl shadow-sm flex flex-col">
          <div className="p-4 border-b border-[#E2E8F0]">
            <h2 className="text-[14px] font-bold text-[#0F172A]">Conversation</h2>
            <p className="text-[12px] text-[#64748B] mt-0.5">{ticket.messages.length} messages</p>
          </div>

          <div className="p-4 space-y-3">
            {ticket.messages.map((message) => (
              <div key={message.id} className={`border rounded-lg p-3 ${roleStyles[message.role]}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[13px] font-semibold text-[#0F172A]">{message.author}</span>
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide bg-[#F1F5F9] text-[#475569]">
                      {message.role}
                    </span>
                  </div>
                  <span className="text-[11px] text-[#94A3B8]">{message.at}</span>
                </div>
                <p className="text-[13px] text-[#475569] leading-relaxed">{message.body}</p>
              </div>
            ))}
          </div>

          <div id="reply" className="p-4 border-t border-[#E2E8F0] bg-[#F8FAFC] rounded-b-xl">
            <label className="block text-[12px] font-bold text-[#94A3B8] uppercase tracking-wider mb-2">
              Reply to {ticket.clinic}
            </label>
            <textarea
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                if (error) setError(null);
              }}
              rows={4}
              placeholder="Type your response..."
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-[13px] text-[#0F172A] placeholder-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB] resize-y"
            />
            {error && <p className="text-[12px] font-semibold text-[#991B1B] mt-1.5">{error}</p>}
            <div className="flex items-center justify-between mt-3">
              <span className="text-[11px] text-[#94A3B8]">
                Replying moves a resolved ticket back to In Progress.
              </span>
              <button
                onClick={submitReply}
                className="px-3.5 py-2 bg-[#2563EB] hover:bg-blue-700 text-white rounded-lg text-[13px] font-semibold transition-colors"
              >
                Send Reply
              </button>
            </div>
          </div>
        </section>

        {/* Properties */}
        <aside className="bg-white border border-[#E2E8F0] rounded-xl shadow-sm h-fit">
          <div className="p-4 border-b border-[#E2E8F0]">
            <h2 className="text-[14px] font-bold text-[#0F172A]">Properties</h2>
          </div>
          <div className="p-4 space-y-4">
            <label className="block">
              <span className="text-[12px] font-semibold text-[#475569]">Status</span>
              <select
                value={ticket.status}
                onChange={(e) => setStatus(ticket.id, e.target.value as TicketStatus)}
                className="w-full mt-1 px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] font-semibold text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
              >
                {statusOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-[12px] font-semibold text-[#475569]">Assigned To</span>
              <select
                value={ticket.assignee}
                onChange={(e) => assign(ticket.id, e.target.value)}
                className="w-full mt-1 px-2.5 py-1.5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg text-[13px] font-semibold text-[#475569] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20"
              >
                {TEAM_MEMBERS.map((member) => (
                  <option key={member} value={member}>
                    {member}
                  </option>
                ))}
              </select>
            </label>

            <div className="pt-3 border-t border-[#E2E8F0] space-y-2.5">
              <div className="flex justify-between text-[12px]">
                <span className="text-[#64748B]">Priority</span>
                <span className={`px-2 py-0.5 rounded-md font-semibold ${priorityStyles[ticket.priority]}`}>
                  {ticket.priority}
                </span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-[#64748B]">Business</span>
                <span className="font-semibold text-[#0F172A]">{ticket.clinic}</span>
              </div>
              <div className="flex justify-between text-[12px]">
                <span className="text-[#64748B]">Created</span>
                <span className="font-semibold text-[#0F172A]">{ticket.created}</span>
              </div>
            </div>

            <Link
              href="/businesses"
              className="block text-center px-3 py-2 border border-[#E2E8F0] rounded-lg text-[12px] font-semibold text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
            >
              View business account
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
