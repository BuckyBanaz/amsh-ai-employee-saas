"use client";
import React, { useState } from 'react';
import { DashboardController } from '../../../controllers/dashboard.controller';

interface SyncWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function SyncWebsiteModal({ isOpen, onClose, onSuccess }: SyncWebsiteModalProps) {
  const [url, setUrl] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setError('Please provide a valid website URL.');
      return;
    }

    const formattedUrl = url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;

    try {
      setIsSyncing(true);
      setError('');
      await DashboardController.syncKnowledgeUrl(formattedUrl);
      onSuccess();
      onClose();
      setUrl('');
    } catch (err: any) {
      console.error('Website sync failed:', err);
      setError(err.message || 'Failed to crawl and sync website.');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#F9FAFB]/50">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Sync Clinic Website URL</h3>
            <p className="text-xs text-gray-500 mt-0.5">Scrape public services, operating hours, and location info directly into AI memory.</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSync}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Website or Landing Page URL</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                </div>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://myclinic.com/services"
                  className="w-full border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all"
                  autoFocus
                />
              </div>
              <p className="text-[11px] text-gray-400 mt-1">Our crawler extracts readable text content, cleans HTML headers, and indexes key facts.</p>
            </div>

            <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-3 text-[11px] text-gray-600 flex items-start gap-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-600 shrink-0 mt-0.5">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
              <span>The AI Receptionist can immediately quote exact services, doctor biographies, and clinic guidelines from this website URL.</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-gray-100 bg-[#F9FAFB]/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSyncing}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSyncing || !url.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSyncing && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              {isSyncing ? 'Scraping & Indexing...' : 'Sync Website'}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
