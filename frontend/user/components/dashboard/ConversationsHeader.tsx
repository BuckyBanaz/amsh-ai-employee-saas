"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

export function ConversationsHeader() {
  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 py-1 shrink-0">
      <div>
        <h1 className="text-xl font-extrabold text-gray-900 tracking-tight leading-tight">
          {STRINGS.DASHBOARD.HEADERS.CONVERSATIONS.TITLE}
        </h1>
        <p className="text-xs text-gray-500 font-medium mt-0.5">
          {STRINGS.DASHBOARD.HEADERS.CONVERSATIONS.SUBTITLE}
        </p>
      </div>

      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Channels Active
        </span>
      </div>
    </header>
  );
}
