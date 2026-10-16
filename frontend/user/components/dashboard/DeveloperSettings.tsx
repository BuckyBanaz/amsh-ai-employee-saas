"use client";
import React from 'react';
import { STRINGS } from '../../utils/strings/en';

const COMING_SOON =
  'px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-400 rounded-md text-xs font-semibold shrink-0 cursor-not-allowed';

/** API keys and webhooks are not built yet: say so instead of showing a sample key and buttons that do nothing. */
export function DeveloperSettings() {
  const t = STRINGS.DASHBOARD.COMPONENTS.DEVELOPER_SETTINGS;
  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-tight">{t.API_KEYS.TITLE}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{t.API_KEYS.SUBTITLE}</p>
          </div>
          <button disabled title="Coming soon" className={COMING_SOON}>
            Coming soon
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-500 border border-dashed border-gray-200 rounded-lg px-3 py-4 text-center">{t.API_KEYS.EMPTY}</p>
      </div>

      <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-sm font-bold text-gray-900 tracking-tight">{t.WEBHOOKS.TITLE}</h3>
            <p className="text-xs text-gray-500 mt-0.5">{t.WEBHOOKS.SUBTITLE}</p>
          </div>
          <button disabled title="Coming soon" className={COMING_SOON}>
            Coming soon
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Planned events: <span className="font-mono text-gray-700">{t.WEBHOOKS.EVENTS.join(', ')}</span>
        </p>
      </div>
    </div>
  );
}
