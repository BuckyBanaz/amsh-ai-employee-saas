"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CallLogItem, DashboardController } from '../../controllers/dashboard.controller';
import { ListSkeleton } from '../common/ShimmerSkeleton';

export interface RecentConversationItem {
  id: string;
  channel: 'phone' | 'whatsapp' | 'web';
  caller: string;
  phoneNumber?: string;
  intent: string;
  outcome: 'Booked' | 'Answered' | 'Handled' | 'Escalated';
  duration?: string;
  timeAgo: string;
}

interface RecentAIConversationsProps {
  items?: RecentConversationItem[];
  loading?: boolean;
}

const ago = (iso: string | null): string => {
  if (!iso) return 'Live';
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
};

function toItem(c: CallLogItem): RecentConversationItem {
  const booked = (c.intent || '').toLowerCase().includes('book');
  const outcome: RecentConversationItem['outcome'] = c.outcome === 'transferred' ? 'Escalated' : c.outcome === 'live' ? 'Answered' : booked ? 'Booked' : 'Handled';
  const secs = c.duration_seconds || 0;
  return {
    id: c.id,
    channel: c.channel === 'whatsapp' ? 'whatsapp' : 'phone',
    caller: c.caller_name || c.caller_number || 'Caller',
    phoneNumber: c.caller_name ? c.caller_number : undefined,
    intent: c.summary || c.intent || 'Not analysed yet',
    outcome,
    duration: secs ? `${Math.floor(secs / 60)}m ${String(secs % 60).padStart(2, '0')}s` : undefined,
    timeAgo: ago(c.started_at),
  };
}

/** The clinic's latest real conversations. Pass `items` to control the list; otherwise it loads the last calls itself. */
export function RecentAIConversations({ items, loading: parentLoading = false }: RecentAIConversationsProps) {
  const [loaded, setLoaded] = useState<RecentConversationItem[] | null>(items ?? null);

  useEffect(() => {
    if (items) return;
    let cancelled = false;
    DashboardController.getCalls(undefined, { limit: 12 })
      .then((rows) => {
        if (!cancelled) {
          // Only show real caller conversations on the dashboard summary (test calls are kept in /calls & /conversations)
          const realCalls = (rows || []).filter((r) => !r.is_test).slice(0, 4);
          setLoaded(realCalls.map(toItem));
        }
      })
      .catch(() => { if (!cancelled) setLoaded([]); });
    return () => { cancelled = true; };
  }, [items]);

  const loading = parentLoading || (!items && loaded === null);
  const conversations = items ?? loaded ?? [];

  const getOutcomeBadge = (outcome: RecentConversationItem['outcome']) => {
    switch (outcome) {
      case 'Booked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Booked
          </span>
        );
      case 'Answered':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#0066FF] border border-blue-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF]" />
            Answered
          </span>
        );
      case 'Handled':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
            Handled
          </span>
        );
      case 'Escalated':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200/80">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            Escalated
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white border border-gray-100/90 rounded-2xl p-3.5 sm:p-4 shadow-xs hover:shadow-md transition-shadow flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div>
          <div className="flex items-center gap-1.5">
            <h3 className="text-sm font-bold text-gray-900 tracking-tight">Recent AI Conversations</h3>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          </div>
          <p className="text-[11px] text-gray-500 font-medium">Live interaction history & outcomes</p>
        </div>
        <Link
          href="/conversations"
          className="inline-flex items-center gap-0.5 text-[11px] font-bold text-[#0066FF] hover:text-blue-700 transition-colors"
        >
          <span>View All</span>
          <svg className="w-3 h-3" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </Link>
      </div>

      {/* Conversation Feed List */}
      {loading ? (
        <ListSkeleton count={4} />
      ) : conversations.length === 0 ? (
        <p className="py-8 text-center text-xs text-gray-500">No conversations yet. Calls and WhatsApp chats handled by the AI appear here.</p>
      ) : (
        <div className="divide-y divide-gray-100 -mx-1">
          {conversations.slice(0, 4).map((item) => (
          <div
            key={item.id}
            className="py-2 px-1.5 rounded-lg hover:bg-gray-50/80 transition-colors flex items-start justify-between gap-2.5 group"
          >
            {/* Left: Channel Icon + Text */}
            <div className="flex items-start gap-2.5 min-w-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 shadow-2xs ${
                  item.channel === 'whatsapp'
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-blue-50 text-[#0066FF]'
                }`}
              >
                {item.channel === 'whatsapp' ? (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                ) : (
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                  </svg>
                )}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h4 className="text-xs font-bold text-gray-900 truncate">{item.caller}</h4>
                  {item.phoneNumber && (
                    <span className="text-[10px] text-gray-400 font-medium hidden sm:inline">
                      {item.phoneNumber}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-600 line-clamp-1 mt-0.5 font-medium">{item.intent}</p>
                <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400 font-medium">
                  <span>{item.timeAgo}</span>
                  {item.duration && (
                    <>
                      <span>•</span>
                      <span>{item.duration}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Outcome Badge */}
            <div className="shrink-0 flex flex-col items-end">
              {getOutcomeBadge(item.outcome)}
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Footer live status */}
      <div className="pt-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500 mt-1">
        <span className="flex items-center gap-1 font-medium">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Listening for calls & chats
        </span>
        <span className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer">
          Audio logs enabled
        </span>
      </div>
    </div>
  );
}
