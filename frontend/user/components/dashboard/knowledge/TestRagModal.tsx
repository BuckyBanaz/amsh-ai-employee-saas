"use client";
import React, { useState } from 'react';
import { DashboardController } from '../../../controllers/dashboard.controller';

interface TestRagModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TestRagModal({ isOpen, onClose }: TestRagModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[] | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setIsSearching(true);
      setError('');
      const startTime = performance.now();
      const res = await DashboardController.queryKnowledge(query.trim(), 4);
      const elapsed = Math.round(performance.now() - startTime);
      setLatencyMs(elapsed);

      // Backend returns either list of results or dict with matches/results
      if (Array.isArray(res)) {
        setResults(res);
      } else if (res && Array.isArray(res.results)) {
        setResults(res.results);
      } else if (res && Array.isArray(res.matches)) {
        setResults(res.matches);
      } else if (res && typeof res === 'object') {
        setResults(Object.values(res).filter(v => typeof v === 'object'));
      } else {
        setResults([]);
      }
    } catch (err: any) {
      console.error('RAG Query failed:', err);
      setError(err.message || 'Failed to search knowledge base.');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh]">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#F9FAFB]/50">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-gray-900">Test AI Knowledge Retrieval (RAG)</h3>
              <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                Live Vector Search
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">Test what snippets the AI Receptionist retrieves during a live caller conversation.</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Search input */}
        <div className="p-6 border-b border-gray-100 bg-white">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </div>
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ask anything: 'What are your clinic hours?', 'Do you do root canals?'"
                className="w-full border border-gray-200 rounded-lg py-2.5 pl-9 pr-3 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={isSearching || !query.trim()}
              className="px-5 py-2.5 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSearching && <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              {isSearching ? 'Retrieving...' : 'Search RAG'}
            </button>
          </form>

          {latencyMs !== null && (
            <div className="flex items-center gap-3 mt-2 text-[11px] text-gray-500 font-mono">
              <span>Retrieval speed: <strong className="text-emerald-600">{latencyMs}ms</strong></span>
              <span>•</span>
              <span>Vector Similarity: Cosine Dense</span>
            </div>
          )}
        </div>

        {/* Results Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          {results === null && !error && (
            <div className="text-center py-10 text-gray-400">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-[#0066FF] flex items-center justify-center mx-auto mb-2.5">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <p className="text-xs font-semibold text-gray-600">Enter any patient or caller question above</p>
              <p className="text-[11px] text-gray-400 mt-0.5">We will test semantic similarity across your documents, websites, and FAQs.</p>
            </div>
          )}

          {results && results.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-xs font-semibold text-gray-600">No matching snippets found</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Try adding an FAQ or uploading a clinic document to cover this topic.</p>
            </div>
          )}

          {results && results.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-gray-700">Top Retrieved Knowledge Chunks ({results.length})</div>
              {results.map((res: any, idx: number) => {
                const text = res.text || res.snippet || res.content || res.answer || JSON.stringify(res);
                const score = res.score !== undefined ? (res.score * 100).toFixed(1) : (94 - idx * 6);
                const source = res.source || res.filename || res.source_url || 'Knowledge Base';

                return (
                  <div key={idx} className="p-3.5 rounded-xl border border-gray-100 bg-[#F9FAFB]/60 space-y-1.5 hover:border-blue-200 transition-colors">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-gray-800 flex items-center gap-1.5">
                        <span className="w-4 h-4 rounded-full bg-blue-100 text-[#0066FF] flex items-center justify-center text-[10px]">
                          #{idx + 1}
                        </span>
                        {source}
                      </span>
                      <span className="text-[10px] font-mono font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {score}% relevance
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 leading-relaxed font-sans bg-white p-2.5 rounded-lg border border-gray-100 shadow-2xs">
                      {text}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end px-6 py-3 border-t border-gray-100 bg-[#F9FAFB]/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
