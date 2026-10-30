"use client";
import React from 'react';
import { KnowledgeItem, isKnowledgeProcessing } from '../../controllers/dashboard.controller';

interface KnowledgeStatsProps {
  items: KnowledgeItem[];
  loading?: boolean;
}

export function KnowledgeStats({ items, loading }: KnowledgeStatsProps) {
  const ready = (i: KnowledgeItem) => i.status === 'indexed';
  const docs = items.filter(i => i.doc_type === 'document');
  const sites = items.filter(i => i.doc_type === 'website');
  const faqCount = items.filter(i => i.doc_type === 'faq').length;
  const processing = items.filter(isKnowledgeProcessing).length;
  const failed = items.filter(i => i.status === 'failed').length;
  const passages = items.reduce((n, i) => n + (ready(i) ? i.chunk_count || 0 : 0), 0);
  const pages = sites.reduce((n, i) => n + (i.meta?.crawl?.urls_processed || 0), 0);

  const stats = [
    {
      title: "Documents Uploaded",
      subtext: loading ? "Loading..." : `${docs.filter(ready).length} of ${docs.length} files indexed`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
        </svg>
      )
    },
    {
      title: "Websites Synced",
      subtext: loading ? "Loading..." : `${sites.filter(ready).length} sites · ${pages} pages indexed`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="2" y1="12" x2="22" y2="12"></line>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
        </svg>
      )
    },
    {
      title: "FAQs Configured",
      subtext: loading ? "Loading..." : `${faqCount} custom Q&As`,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
          <line x1="12" y1="17" x2="12.01" y2="17"></line>
        </svg>
      )
    },
    {
      title: "Searchable Knowledge",
      subtext: loading ? "Loading..." : [`${passages} passages`, processing ? `${processing} processing` : '', failed ? `${failed} failed` : ''].filter(Boolean).join(' · '),
      isLive: !loading && processing === 0 && failed === 0 && passages > 0,
      icon: (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
        </svg>
      )
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
      {stats.map((stat, idx) => (
        <div key={idx} className="bg-white border border-gray-100 rounded-xl p-3 shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center flex-shrink-0 shadow-2xs">
            {stat.icon}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-xs font-bold text-gray-900 truncate">{stat.title}</h3>
            <div className="flex items-center gap-1.5 mt-0.5">
              {stat.isLive && <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>}
              <p className={`text-[11px] font-medium truncate ${stat.isLive ? 'text-emerald-700 font-semibold' : 'text-gray-500'}`}>
                {stat.subtext}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
