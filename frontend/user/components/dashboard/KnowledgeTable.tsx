"use client";
import React from 'react';

import { STRINGS } from '../../utils/strings/en';

const sources = STRINGS.TABLES.KNOWLEDGE.MOCK_DATA;

export function KnowledgeTable() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm flex flex-col flex-1 overflow-hidden">
      
      <div className="p-6 border-b border-gray-50">
        <h2 className="text-[16px] font-extrabold text-gray-900 tracking-tight">{STRINGS.TABLES.KNOWLEDGE.TITLE}</h2>
      </div>

      <div className="overflow-x-auto scrollbar-hide flex-1">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/50">{STRINGS.TABLES.KNOWLEDGE.HEADERS.NAME}</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/50">{STRINGS.TABLES.KNOWLEDGE.HEADERS.TYPE}</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/50">{STRINGS.TABLES.KNOWLEDGE.HEADERS.STATUS}</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/50">{STRINGS.TABLES.KNOWLEDGE.HEADERS.LAST_UPDATED}</th>
              <th className="px-6 py-4 text-[11px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50 bg-[#F9FAFB]/50 text-right">{STRINGS.TABLES.KNOWLEDGE.HEADERS.ACTIONS}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {sources.map((source, idx) => (
              <tr key={idx} className="hover:bg-gray-50/50 transition-colors group">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="text-gray-500">
                      {source.icon === 'globe' ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
                      )}
                    </div>
                    <span className="text-[13px] font-bold text-gray-900">{source.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-[13px] font-medium text-gray-500 whitespace-nowrap">{source.type}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {source.status === 'Ready' ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-[#E6FBF3] text-[#10B981]">
                      {STRINGS.TABLES.KNOWLEDGE.STATUS.READY}
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-yellow-50 text-yellow-600">
                      {STRINGS.TABLES.KNOWLEDGE.STATUS.PROCESSING}
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 text-[13px] font-medium text-gray-500 whitespace-nowrap">{source.date}</td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-[13px] font-bold">
                  {source.status === 'Ready' ? (
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button className="text-[#0066FF] hover:text-[#0052cc]">{source.type === 'Website' ? STRINGS.TABLES.KNOWLEDGE.ACTIONS.REFRESH : STRINGS.TABLES.KNOWLEDGE.ACTIONS.EDIT}</button>
                      <button className="text-[#EF4444] hover:text-red-600">{STRINGS.TABLES.KNOWLEDGE.ACTIONS.DELETE}</button>
                    </div>
                  ) : (
                    <span className="text-gray-300">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-6 border-t border-gray-50 bg-[#F9FAFB]/30 flex items-center gap-4">
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-[13px] font-bold shadow-sm hover:bg-gray-50 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          {STRINGS.TABLES.KNOWLEDGE.BUTTONS.UPLOAD_DOC}
        </button>
        <button className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg text-[13px] font-bold shadow-sm hover:bg-gray-50 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
          {STRINGS.TABLES.KNOWLEDGE.BUTTONS.ADD_FAQ}
        </button>
      </div>

    </div>
  );
}
