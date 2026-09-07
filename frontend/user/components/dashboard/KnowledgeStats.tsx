"use client";
import React from 'react';
import { STRINGS } from '../../../../utils/strings/en';

const stats = [
  {
    title: STRINGS.DASHBOARD.COMPONENTS.KNOWLEDGE_STATS[0].title,
    subtext: STRINGS.DASHBOARD.COMPONENTS.KNOWLEDGE_STATS[0].subtext,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
      </svg>
    )
  },
  {
    title: STRINGS.DASHBOARD.COMPONENTS.KNOWLEDGE_STATS[1].title,
    subtext: STRINGS.DASHBOARD.COMPONENTS.KNOWLEDGE_STATS[1].subtext,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    )
  },
  {
    title: STRINGS.DASHBOARD.COMPONENTS.KNOWLEDGE_STATS[2].title,
    subtext: STRINGS.DASHBOARD.COMPONENTS.KNOWLEDGE_STATS[2].subtext,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
        <line x1="12" y1="17" x2="12.01" y2="17"></line>
      </svg>
    )
  },
  {
    title: STRINGS.DASHBOARD.COMPONENTS.KNOWLEDGE_STATS[3].title,
    subtext: STRINGS.DASHBOARD.COMPONENTS.KNOWLEDGE_STATS[3].subtext,
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      </svg>
    )
  }
];

export function KnowledgeStats() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, idx) => (
        <div key={idx} className="bg-white border border-gray-100 rounded-xl p-5 shadow-[0_2px_10px_rgb(0,0,0,0.02)] flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-[#F0F7FF] text-[#0066FF] flex items-center justify-center flex-shrink-0">
            {stat.icon}
          </div>
          <div>
            <h3 className="text-[14px] font-extrabold text-gray-900">{stat.title}</h3>
            <p className="text-[12px] font-medium text-gray-500 mt-0.5">{stat.subtext}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
