"use client";
import React, { useState } from 'react';
import { STRINGS } from '../../utils/strings/en';
import { ServiceSuggestion } from '../../controllers/dashboard.controller';

interface ServiceSuggestionsProps {
  suggestions: ServiceSuggestion[];
  onAdd: (suggestion: ServiceSuggestion) => void;
}

const VISIBLE = 6;

/** Services found on the clinic's own website that are missing from its Services list. Nothing is added automatically:
 *  "Add" opens the service form pre-filled, and the owner sets duration and price before saving. */
export function ServiceSuggestions({ suggestions, onAdd }: ServiceSuggestionsProps) {
  const [expanded, setExpanded] = useState(false);
  const [hidden, setHidden] = useState(false);
  const text = STRINGS.DASHBOARD.HEADERS.SERVICES.SUGGESTIONS;

  if (hidden || suggestions.length === 0) return null;
  const shown = expanded ? suggestions : suggestions.slice(0, VISIBLE);
  const sources = Array.from(new Set(suggestions.map((s) => s.source_url).filter(Boolean)));

  return (
    <section className="rounded-xl border border-amber-200 bg-amber-50 p-3.5 shrink-0" aria-label={text.TITLE}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-bold text-gray-900">
            {text.TITLE} <span className="text-amber-700">({suggestions.length})</span>
          </h2>
          <p className="text-xs text-gray-600 mt-0.5">{text.BODY}</p>
          {sources.length > 0 && (
            <p className="text-[11px] text-gray-500 mt-1 truncate">
              {text.FROM}{' '}
              {sources.map((url, i) => (
                <React.Fragment key={url}>
                  {i > 0 && ', '}
                  <a href={url} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-700">
                    {url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                  </a>
                </React.Fragment>
              ))}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setHidden(true)}
          className="text-[11px] font-semibold text-gray-500 hover:text-gray-800 cursor-pointer shrink-0"
        >
          {text.HIDE}
        </button>
      </div>

      <ul className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {shown.map((s) => (
          <li key={s.title} className="flex items-center justify-between gap-2 rounded-lg bg-white border border-amber-100 px-2.5 py-2">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-gray-900 truncate" title={s.title}>{s.title}</p>
              {s.description && <p className="text-[11px] text-gray-500 truncate" title={s.description}>{s.description}</p>}
            </div>
            <button
              type="button"
              onClick={() => onAdd(s)}
              title={text.ADD_ALL_HINT}
              className="flex items-center gap-1 px-2 py-1 bg-[#0066FF] text-white rounded-md text-[11px] font-semibold hover:bg-[#0052cc] transition-colors cursor-pointer active:scale-95 shrink-0"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
              {text.ADD}
            </button>
          </li>
        ))}
      </ul>

      {suggestions.length > VISIBLE && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-[11px] font-semibold text-[#0066FF] hover:underline cursor-pointer"
        >
          {expanded ? text.SHOW_LESS : `${text.SHOW_MORE} (${suggestions.length})`}
        </button>
      )}
    </section>
  );
}
