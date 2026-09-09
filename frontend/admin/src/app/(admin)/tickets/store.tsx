"use client";
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';

export type TicketStatus = 'Open' | 'In Progress' | 'Waiting' | 'Resolved';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Critical';

export interface TicketMessage {
  id: string;
  author: string;
  role: 'Customer' | 'Agent' | 'System';
  body: string;
  at: string;
}

export interface Ticket {
  id: string;
  clinic: string;
  subject: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignee: string;
  created: string;
  messages: TicketMessage[];
}

export const TEAM_MEMBERS = ['Unassigned', 'Lars Janssen', 'Sophie Dubois', 'Aria de Vries', 'Jan de Jong'];

export const priorityStyles: Record<TicketPriority, string> = {
  Critical: 'bg-[#FEE2E2] text-[#991B1B]',
  High: 'bg-[#FEF3C7] text-[#92400E]',
  Medium: 'bg-[#DBEAFE] text-[#1D4ED8]',
  Low: 'bg-[#F1F5F9] text-[#334155]',
};

export const statusStyles: Record<TicketStatus, string> = {
  Open: 'bg-[#FEE2E2] text-[#991B1B]',
  'In Progress': 'bg-[#FEF3C7] text-[#92400E]',
  Waiting: 'bg-[#DBEAFE] text-[#1D4ED8]',
  Resolved: 'bg-[#D1FAE5] text-[#065F46]',
};

const PRIORITY_LADDER: TicketPriority[] = ['Low', 'Medium', 'High', 'Critical'];

const seedTickets: Ticket[] = [
  {
    id: 'AURA-824',
    clinic: 'Smile Dental Clinic',
    subject: 'Sarah Voice latency issue during booking sync',
    priority: 'Critical',
    status: 'Open',
    assignee: 'Lars Janssen',
    created: '2026-01-29',
    messages: [
      {
        id: 'm-1',
        author: 'Dr. Sarah Wilson',
        role: 'Customer',
        body: 'Our AI receptionist takes 4-5 seconds to respond when booking an appointment. Patients are hanging up.',
        at: '2026-01-29 09:14',
      },
      {
        id: 'm-2',
        author: 'Lars Janssen',
        role: 'Agent',
        body: 'Thanks for reporting. I can see elevated latency on your calendar sync webhook. Investigating now.',
        at: '2026-01-29 09:41',
      },
    ],
  },
  {
    id: 'AURA-821',
    clinic: 'Amsterdam Dental Care',
    subject: 'Invoice calculation error on platform upgrade',
    priority: 'High',
    status: 'In Progress',
    assignee: 'Sophie Dubois',
    created: '2026-01-28',
    messages: [
      {
        id: 'm-1',
        author: 'Dr. Mark de Jong',
        role: 'Customer',
        body: 'We upgraded to Business mid-cycle and the invoice charged the full amount without proration.',
        at: '2026-01-28 11:02',
      },
    ],
  },
  {
    id: 'AURA-819',
    clinic: 'Berlin Health Center',
    subject: 'Requesting custom voice integration parameters',
    priority: 'Medium',
    status: 'Waiting',
    assignee: 'Aria de Vries',
    created: '2026-01-27',
    messages: [
      {
        id: 'm-1',
        author: 'Dr. Klaus Schmidt',
        role: 'Customer',
        body: 'We would like a German voice with a slower speaking rate. What parameters can we tune?',
        at: '2026-01-27 15:20',
      },
      {
        id: 'm-2',
        author: 'Aria de Vries',
        role: 'Agent',
        body: 'Sent over the voice tuning guide. Waiting on your preferred sample before we apply it.',
        at: '2026-01-27 16:05',
      },
    ],
  },
  {
    id: 'AURA-814',
    clinic: 'Munich Orthodontics',
    subject: 'Unable to load patient record historical logs',
    priority: 'High',
    status: 'Open',
    assignee: 'Unassigned',
    created: '2026-01-26',
    messages: [
      {
        id: 'm-1',
        author: 'Dr. Lisa Muller',
        role: 'Customer',
        body: 'Records older than 90 days return an empty list in the dashboard.',
        at: '2026-01-26 08:47',
      },
    ],
  },
  {
    id: 'AURA-810',
    clinic: 'Paris Dental Studio',
    subject: 'API key validation timeout errors',
    priority: 'Medium',
    status: 'Resolved',
    assignee: 'Jan de Jong',
    created: '2026-01-25',
    messages: [
      {
        id: 'm-1',
        author: 'Dr. Pierre Dubois',
        role: 'Customer',
        body: 'Our integration key intermittently times out during validation.',
        at: '2026-01-25 10:30',
      },
      {
        id: 'm-2',
        author: 'Jan de Jong',
        role: 'Agent',
        body: 'Rotated the key and increased the validation timeout. Confirmed stable for 24 hours.',
        at: '2026-01-25 14:12',
      },
    ],
  },
  {
    id: 'AURA-808',
    clinic: 'London Tooth Clinic',
    subject: 'New onboarding wizard assistant setup help',
    priority: 'Low',
    status: 'Resolved',
    assignee: 'Lars Janssen',
    created: '2026-01-24',
    messages: [
      {
        id: 'm-1',
        author: 'Emma Watson',
        role: 'Customer',
        body: 'Need a walkthrough of the onboarding wizard for our second location.',
        at: '2026-01-24 13:05',
      },
    ],
  },
  {
    id: 'AURA-801',
    clinic: 'Utrecht Ortho Care',
    subject: 'Platform latency alert - Twilio gateway webhook disconnect',
    priority: 'Critical',
    status: 'In Progress',
    assignee: 'Jan de Jong',
    created: '2026-01-22',
    messages: [
      {
        id: 'm-1',
        author: 'System Monitor',
        role: 'System',
        body: 'Twilio webhook endpoint returned 504 for 12 consecutive calls.',
        at: '2026-01-22 03:11',
      },
    ],
  },
];

interface TicketsContextValue {
  tickets: Ticket[];
  getTicket: (id: string) => Ticket | undefined;
  reply: (id: string, body: string) => void;
  resolve: (id: string) => void;
  reopen: (id: string) => void;
  escalate: (id: string) => void;
  assign: (id: string, assignee: string) => void;
  setStatus: (id: string, status: TicketStatus) => void;
}

const TicketsContext = createContext<TicketsContextValue | null>(null);

export function TicketsProvider({ children }: { children: React.ReactNode }) {
  const [tickets, setTickets] = useState<Ticket[]>(seedTickets);

  const update = useCallback((id: string, updater: (ticket: Ticket) => Ticket) => {
    setTickets((current) => current.map((ticket) => (ticket.id === id ? updater(ticket) : ticket)));
  }, []);

  const appendSystemNote = (ticket: Ticket, body: string): Ticket => ({
    ...ticket,
    messages: [
      ...ticket.messages,
      { id: `m-${ticket.messages.length + 1}`, author: 'Parikshit Arora', role: 'System', body, at: 'Just now' },
    ],
  });

  const value = useMemo<TicketsContextValue>(
    () => ({
      tickets,
      getTicket: (id) => tickets.find((ticket) => ticket.id === id),
      reply: (id, body) =>
        update(id, (ticket) => ({
          ...ticket,
          status: ticket.status === 'Resolved' ? 'In Progress' : ticket.status,
          messages: [
            ...ticket.messages,
            {
              id: `m-${ticket.messages.length + 1}`,
              author: 'Parikshit Arora',
              role: 'Agent',
              body,
              at: 'Just now',
            },
          ],
        })),
      resolve: (id) => update(id, (ticket) => appendSystemNote({ ...ticket, status: 'Resolved' }, 'Marked the ticket as resolved.')),
      reopen: (id) => update(id, (ticket) => appendSystemNote({ ...ticket, status: 'Open' }, 'Reopened the ticket.')),
      escalate: (id) =>
        update(id, (ticket) => {
          const next = PRIORITY_LADDER[Math.min(PRIORITY_LADDER.indexOf(ticket.priority) + 1, PRIORITY_LADDER.length - 1)];
          if (next === ticket.priority) {
            return appendSystemNote(ticket, 'Escalation requested but priority is already Critical.');
          }
          return appendSystemNote(
            { ...ticket, priority: next, status: ticket.status === 'Resolved' ? 'In Progress' : ticket.status },
            `Escalated priority from ${ticket.priority} to ${next}.`
          );
        }),
      assign: (id, assignee) =>
        update(id, (ticket) =>
          appendSystemNote(
            { ...ticket, assignee, status: ticket.status === 'Open' && assignee !== 'Unassigned' ? 'In Progress' : ticket.status },
            assignee === 'Unassigned' ? 'Removed the assignee.' : `Assigned to ${assignee}.`
          )
        ),
      setStatus: (id, status) => update(id, (ticket) => appendSystemNote({ ...ticket, status }, `Status changed to ${status}.`)),
    }),
    [tickets, update]
  );

  return <TicketsContext.Provider value={value}>{children}</TicketsContext.Provider>;
}

export function useTickets() {
  const context = useContext(TicketsContext);
  if (!context) throw new Error('useTickets must be used inside TicketsProvider');
  return context;
}
