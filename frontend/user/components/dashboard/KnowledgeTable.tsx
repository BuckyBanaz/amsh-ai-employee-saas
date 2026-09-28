"use client";
import React, { useState } from 'react';
import { STRINGS } from '../../utils/strings/en';
import { KnowledgeItem } from '../../controllers/dashboard.controller';
import { GlobalLoader } from '../common/GlobalLoader';

interface KnowledgeTableProps {
  items: KnowledgeItem[];
  loading: boolean;
  searchQuery: string;
  onDelete: (id: string) => Promise<void>;
  onEditFaq: (faq: KnowledgeItem) => void;
  onSyncUrl: (url: string) => Promise<void>;
  onOpenModal: (modal: 'upload' | 'website' | 'faq' | 'test') => void;
}

export function KnowledgeTable({
  items,
  loading,
  searchQuery,
  onDelete,
  onEditFaq,
  onSyncUrl,
  onOpenModal,
}: KnowledgeTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const filteredItems = items.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.filename?.toLowerCase().includes(q) ||
      item.source_url?.toLowerCase().includes(q) ||
      item.question?.toLowerCase().includes(q) ||
      item.answer?.toLowerCase().includes(q) ||
      item.doc_type?.toLowerCase().includes(q)
    );
  });

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this knowledge source from AI memory?')) return;
    try {
      setDeletingId(id);
      await onDelete(id);
    } catch (err) {
      console.error('Delete error:', err);
    } finally {
      setDeletingId(null);
    }
  };

  const handleResync = async (item: KnowledgeItem) => {
    if (!item.source_url) return;
    try {
      setSyncingId(item.id);
      await onSyncUrl(item.source_url);
    } catch (err) {
      console.error('Resync error:', err);
    } finally {
      setSyncingId(null);
    }
  };

  const getItemDisplayName = (item: KnowledgeItem) => {
    if (item.doc_type === 'document') return item.filename || 'Document File';
    if (item.doc_type === 'website') return item.source_url || 'Website URL';
    if (item.doc_type === 'faq') return item.question || 'Custom FAQ';
    return item.filename || item.source_url || item.question || 'Knowledge Source';
  };

  const getItemTypeLabel = (item: KnowledgeItem) => {
    if (item.doc_type === 'document') return 'Document';
    if (item.doc_type === 'website') return 'Website';
    if (item.doc_type === 'faq') return 'FAQ';
    return item.doc_type;
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Just now';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)] flex flex-col flex-1 overflow-hidden">
      
      {/* Table Header */}
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-gray-900 tracking-tight">{STRINGS.TABLES.KNOWLEDGE.TITLE}</h2>
          <span className="text-[11px] font-mono font-semibold text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full border border-gray-100">
            {filteredItems.length} sources
          </span>
        </div>

        <button
          onClick={() => onOpenModal('test')}
          className="text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] flex items-center gap-1.5 cursor-pointer transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>Test Knowledge Base</span>
        </button>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto scrollbar-hide flex-1">
        {loading ? (
          <GlobalLoader message="Loading knowledge base & RAG documents..." size="md" />
        ) : filteredItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
              </svg>
            </div>
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              {searchQuery ? 'No matching knowledge sources' : 'No knowledge sources added yet'}
            </h3>
            <p className="text-xs text-gray-500 max-w-sm mb-4">
              {searchQuery
                ? `No knowledge entries found matching "${searchQuery}".`
                : 'Upload PDFs, sync clinic websites, or add custom FAQs so your AI Receptionist can answer caller questions accurately.'}
            </p>
            {!searchQuery && (
              <div className="flex flex-wrap items-center justify-center gap-2">
                <button
                  onClick={() => onOpenModal('upload')}
                  className="px-3 py-1.5 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors cursor-pointer"
                >
                  Upload Document
                </button>
                <button
                  onClick={() => onOpenModal('website')}
                  className="px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
                >
                  Sync Website
                </button>
                <button
                  onClick={() => onOpenModal('faq')}
                  className="px-3 py-1.5 border border-gray-200 bg-white text-gray-700 rounded-lg text-xs font-semibold hover:bg-gray-50 transition-colors cursor-pointer shadow-2xs"
                >
                  Add FAQ
                </button>
              </div>
            )}
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">
                  {STRINGS.TABLES.KNOWLEDGE.HEADERS.NAME}
                </th>
                <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">
                  {STRINGS.TABLES.KNOWLEDGE.HEADERS.TYPE}
                </th>
                <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">
                  {STRINGS.TABLES.KNOWLEDGE.HEADERS.STATUS}
                </th>
                <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60">
                  {STRINGS.TABLES.KNOWLEDGE.HEADERS.LAST_UPDATED}
                </th>
                <th className="px-3.5 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 bg-[#F9FAFB]/60 text-right">
                  {STRINGS.TABLES.KNOWLEDGE.HEADERS.ACTIONS}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredItems.map((item) => {
                const isSyncing = syncingId === item.id;
                const isDeleting = deletingId === item.id;

                return (
                  <tr key={item.id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="px-3.5 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-2.5">
                        <div className="text-gray-500">
                          {item.doc_type === 'website' ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
                              <circle cx="12" cy="12" r="10"></circle>
                              <line x1="2" y1="12" x2="22" y2="12"></line>
                              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            </svg>
                          ) : item.doc_type === 'faq' ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500">
                              <circle cx="12" cy="12" r="10"></circle>
                              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                              <line x1="12" y1="17" x2="12.01" y2="17"></line>
                            </svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-500">
                              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                              <polyline points="14 2 14 8 20 8"></polyline>
                            </svg>
                          )}
                        </div>
                        <div className="flex flex-col max-w-[280px] sm:max-w-md">
                          <span className="text-xs font-semibold text-gray-900 truncate">
                            {getItemDisplayName(item)}
                          </span>
                          {item.answer && (
                            <span className="text-[10px] text-gray-400 truncate">
                              {item.answer}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-3.5 py-2 text-xs text-gray-500 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.doc_type === 'website' ? 'bg-blue-50 text-[#0066FF]' :
                        item.doc_type === 'faq' ? 'bg-amber-50 text-amber-700' :
                        'bg-purple-50 text-purple-700'
                      }`}>
                        {getItemTypeLabel(item)}
                      </span>
                    </td>

                    <td className="px-3.5 py-2 whitespace-nowrap">
                      {isSyncing || item.status === 'processing' || item.status === 'crawling' ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-600 animate-pulse">
                          <div className="w-2 h-2 rounded-full bg-amber-500 animate-spin"></div>
                          Processing
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-[#E6FBF3] text-[#10B981]">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]"></div>
                          Ready
                        </span>
                      )}
                    </td>

                    <td className="px-3.5 py-2 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(item.uploaded_at)}
                    </td>

                    <td className="px-3.5 py-2 whitespace-nowrap text-right text-xs font-semibold">
                      <div className="flex items-center justify-end gap-3 opacity-80 group-hover:opacity-100 transition-opacity">
                        {item.doc_type === 'website' && (
                          <button
                            onClick={() => handleResync(item)}
                            disabled={isSyncing}
                            className="text-[#0066FF] hover:text-[#0052cc] cursor-pointer disabled:opacity-50"
                            title="Re-crawl website content"
                          >
                            {isSyncing ? 'Syncing...' : 'Re-sync'}
                          </button>
                        )}
                        {item.doc_type === 'faq' && (
                          <button
                            onClick={() => onEditFaq(item)}
                            className="text-[#0066FF] hover:text-[#0052cc] cursor-pointer"
                            title="Edit Question & Answer"
                          >
                            Edit
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(item.id)}
                          disabled={isDeleting}
                          className="text-[#EF4444] hover:text-red-700 cursor-pointer disabled:opacity-50"
                          title="Remove from knowledge memory"
                        >
                          {isDeleting ? 'Deleting...' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="px-4 py-2.5 border-t border-gray-100 bg-[#F9FAFB]/40 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onOpenModal('upload')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md text-xs font-semibold shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Upload Document
          </button>
          <button 
            onClick={() => onOpenModal('website')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md text-xs font-semibold shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Sync Website
          </button>
          <button 
            onClick={() => onOpenModal('faq')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-md text-xs font-semibold shadow-2xs hover:bg-gray-50 transition-colors cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            Add FAQ
          </button>
        </div>

        <button
          onClick={() => onOpenModal('test')}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-[#0066FF] border border-blue-200/60 rounded-md text-xs font-semibold hover:bg-blue-100 transition-colors cursor-pointer"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>Test Vector RAG Search</span>
        </button>
      </div>

    </div>
  );
}
