"use client";
import React from 'react';
import { CallLogItem } from '../../controllers/dashboard.controller';
import { ChatThreadSkeleton } from '../common/ShimmerSkeleton';

interface ConversationThreadProps {
  call: CallLogItem | null;
  loading: boolean;
}

export function ConversationThread({ call, loading }: ConversationThreadProps) {
  if (loading) {
    return <ChatThreadSkeleton />;
  }

  if (!call) {
    return (
      <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col h-full overflow-hidden items-center justify-center p-8 text-center">
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0066FF] flex items-center justify-center mb-3 shadow-2xs">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
          </svg>
        </div>
        <h3 className="text-sm font-extrabold text-gray-900 tracking-tight mb-1">Select a Conversation</h3>
        <p className="text-xs text-gray-500 max-w-xs leading-relaxed">
          Choose a conversation from the left to view the complete turn-by-turn dialogue, AI responses, and audio recording.
        </p>
      </div>
    );
  }

  const callerTitle = call.caller_name || call.caller_number || 'Caller';
  const durationMin = Math.floor((call.duration_seconds || 0) / 60);
  const durationSec = (call.duration_seconds || 0) % 60;
  const durationStr = `${durationMin}m ${durationSec < 10 ? '0' : ''}${durationSec}s`;

  // The server sends one row per spoken turn: role "assistant" is the AI, anything else is the caller.
  const messageList: Array<{ isAI: boolean; sender: string; text: string; time?: string }> = (call.messages ?? []).map((m) => ({
    isAI: m.role === 'assistant',
    sender: m.role === 'assistant' ? 'AI Receptionist' : 'Caller',
    text: m.content,
    time: m.created_at ? new Date(m.created_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '',
  }));

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col h-full overflow-hidden">
      {/* Thread Header */}
      <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between flex-shrink-0 bg-white z-10">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-extrabold text-gray-900 tracking-tight">{callerTitle}</h2>
            {call.is_test && (
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                Test Call (Playground)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500 font-medium">
            <span>{call.caller_number}</span>
            <span className="w-1 h-1 rounded-full bg-gray-300"></span>
            <span>Duration: {durationStr}</span>
            {call.started_at && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                <span>{new Date(call.started_at).toLocaleDateString()}</span>
              </>
            )}
            {call.is_test && (
              <>
                <span className="w-1 h-1 rounded-full bg-gray-300"></span>
                <span className="text-amber-600 font-semibold text-[11px]">Playground Mode</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {call.is_test && (
            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-amber-500/10 text-amber-700 border border-amber-300/60">
              TEST MODE
            </span>
          )}
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#F0F7FF] text-[#0066FF] border border-blue-100">
            {call.intent || 'Inbound'}
          </span>
          {call.outcome && (
            <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
              call.outcome === 'booked' 
                ? 'bg-[#E6FBF3] text-[#10B981] border-[#10B981]/20'
                : call.outcome === 'transferred'
                ? 'bg-[#FEF3C7] text-[#D97706] border-[#D97706]/20'
                : 'bg-gray-100 text-gray-600 border-gray-200'
            }`}>
              {call.outcome.toUpperCase()}
            </span>
          )}
        </div>
      </div>

      {/* Summary Banner if exists */}
      {call.summary && (
        <div className="px-5 py-2.5 bg-blue-50/50 border-b border-blue-100/60 text-xs text-gray-700 flex items-start gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#0066FF] mt-0.5 bg-white px-1.5 py-0.5 rounded border border-blue-200/60 shrink-0">
            AI Summary
          </span>
          <p className="font-medium leading-relaxed">{call.summary}</p>
        </div>
      )}

      {/* Recording Audio Player if exists */}
      {call.recording_url && (
        <div className="px-5 py-2 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between gap-3">
          <span className="text-[11px] font-bold text-gray-700 flex items-center gap-1.5">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#0066FF]">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            Audio Recording
          </span>
          <audio controls src={call.recording_url} className="h-7 max-w-xs" />
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#FCFCFD]">
        {messageList.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-xs font-medium">
            No turn-by-turn transcript recorded for this call.
          </div>
        ) : (
          messageList.map((msg, idx) => (
            msg.isAI ? (
              <div key={idx} className="flex flex-col items-start animate-in fade-in duration-150">
                <div className="flex items-center gap-2 mb-1 ml-1">
                  <span className="text-[10px] font-extrabold text-[#0066FF] uppercase tracking-wider flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#0066FF]"></span>
                    {msg.sender}
                  </span>
                  {msg.time && <span className="text-[10px] font-medium text-gray-400">{msg.time}</span>}
                </div>
                <div className="bg-white border border-gray-200/80 text-gray-900 text-xs leading-relaxed p-3.5 rounded-2xl rounded-tl-xs max-w-[85%] md:max-w-[75%] shadow-2xs font-medium">
                  {msg.text}
                </div>
              </div>
            ) : (
              <div key={idx} className="flex flex-col items-end animate-in fade-in duration-150">
                <div className="flex items-center gap-2 mb-1 mr-1">
                  {msg.time && <span className="text-[10px] font-medium text-gray-400">{msg.time}</span>}
                  <span className="text-[10px] font-extrabold text-gray-700 uppercase tracking-wider">{msg.sender}</span>
                </div>
                <div className="bg-[#0066FF] text-white text-xs leading-relaxed p-3.5 rounded-2xl rounded-tr-xs max-w-[85%] md:max-w-[75%] shadow-xs font-medium">
                  {msg.text}
                </div>
              </div>
            )
          ))
        )}
      </div>
    </div>
  );
}
