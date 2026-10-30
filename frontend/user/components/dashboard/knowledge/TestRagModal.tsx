"use client";
import React, { useState } from 'react';
import { DashboardController } from '../../../controllers/dashboard.controller';

interface TestRagModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Passage {
  text: string;
  source: string;
  score: number;
  confidence: 'high' | 'medium' | 'low';
  match: 'keyword' | 'semantic' | 'hybrid';
  updated_at?: string | null;
}

interface TableMatch {
  status: 'exact' | 'ambiguous' | 'no_match';
  table: string;
  rows: Record<string, string>[];
  ask_for: string[];
  options: Record<string, string[]>;
}

interface SearchResult {
  results: Passage[];
  structured: TableMatch | null;
  confidence: string;
  mode: 'keyword' | 'hybrid';
  latency_ms: number;
}

interface AnswerPreview {
  answer: string;
  grounded: boolean;
  note?: string;
}

const CONFIDENCE_STYLE: Record<string, string> = {
  high: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  medium: 'text-amber-700 bg-amber-50 border-amber-200',
  low: 'text-gray-600 bg-gray-50 border-gray-200',
};

export function TestRagModal({ isOpen, onClose }: TestRagModalProps) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [answer, setAnswer] = useState<AnswerPreview | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    try {
      setIsSearching(true);
      setError('');
      setAnswer(null);
      const [search, preview] = await Promise.all([
        DashboardController.queryKnowledge(query.trim(), 4),
        DashboardController.testKnowledgeAnswer(query.trim()).catch(() => null),
      ]);
      setResult(search as SearchResult);
      setAnswer(preview as AnswerPreview | null);
    } catch (err: any) {
      setError(err.message || 'Failed to search knowledge base.');
    } finally {
      setIsSearching(false);
    }
  };

  const table = result?.structured;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[85vh]">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#F9FAFB]/50">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Test AI Answers</h3>
            <p className="text-xs text-gray-500 mt-0.5">Ask what a caller or WhatsApp customer would ask. You see the answer the AI would give and the information it is based on.</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
            aria-label="Close"
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
                placeholder="e.g. 'What are your opening hours?' or 'B.Tech fee for a Nepali student in 2026-27?'"
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
              {isSearching ? 'Checking...' : 'Test'}
            </button>
          </form>

          {result && (
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-gray-500 font-mono">
              <span>Retrieval: <strong className="text-emerald-600">{Math.round(result.latency_ms)} ms</strong></span>
              <span>•</span>
              <span>{result.mode === 'hybrid' ? 'Keyword + semantic search' : 'Keyword search'}</span>
              <span>•</span>
              <span>Confidence: {result.confidence}</span>
            </div>
          )}
        </div>

        {/* Results Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg" role="alert">
              {error}
            </div>
          )}

          {result === null && !error && (
            <div className="text-center py-10 text-gray-400">
              <p className="text-xs font-semibold text-gray-600">Enter a customer question above</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Searches your documents, spreadsheets, websites, FAQs, business profile and services.</p>
            </div>
          )}

          {answer && (
            <div className={`p-3.5 rounded-xl border space-y-1 ${answer.grounded ? 'border-blue-200 bg-blue-50/50' : 'border-amber-200 bg-amber-50/60'}`}>
              <div className="text-[11px] font-bold text-gray-700">{answer.grounded ? 'AI answer' : 'No verified answer'}</div>
              <p className="text-xs text-gray-800 leading-relaxed">{answer.answer}</p>
              {answer.note && <p className="text-[10px] text-gray-500">{answer.note}</p>}
            </div>
          )}

          {table && (
            <div className="p-3.5 rounded-xl border border-gray-100 bg-[#F9FAFB]/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-gray-800">Table: {table.table}</span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${table.status === 'exact' ? CONFIDENCE_STYLE.high : CONFIDENCE_STYLE.medium}`}>
                  {table.status === 'exact' ? 'Exact match' : table.status === 'ambiguous' ? 'Needs one more detail' : 'Not listed'}
                </span>
              </div>
              {table.status === 'ambiguous' && table.ask_for.length > 0 && (
                <p className="text-xs text-gray-700">
                  The AI will ask for: {table.ask_for.map((c) => `${c} (${(table.options[c] || []).join(', ')})`).join('; ')}
                </p>
              )}
              {table.rows.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="text-[11px] text-gray-700 bg-white border border-gray-100 rounded-lg">
                    <thead>
                      <tr>{Object.keys(table.rows[0]).map((k) => <th key={k} className="px-2 py-1 text-left font-bold border-b border-gray-100">{k}</th>)}</tr>
                    </thead>
                    <tbody>
                      {table.rows.slice(0, 6).map((row, i) => (
                        <tr key={i}>{Object.keys(table.rows[0]).map((k) => <td key={k} className="px-2 py-1 border-b border-gray-50">{row[k]}</td>)}</tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {result && result.results.length === 0 && !table && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-xs font-semibold text-gray-600">Nothing relevant found</p>
              <p className="text-[11px] text-gray-400 mt-0.5">The AI will say it is not sure and offer to take details or connect your team. Add an FAQ or document to cover this.</p>
            </div>
          )}

          {result && result.results.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-bold text-gray-700">Matching passages ({result.results.length})</div>
              {result.results.map((res, idx) => (
                <div key={idx} className="p-3.5 rounded-xl border border-gray-100 bg-[#F9FAFB]/60 space-y-1.5 hover:border-blue-200 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-gray-800 truncate">{res.source}{res.updated_at ? ` · ${res.updated_at}` : ''}</span>
                    <span className={`shrink-0 text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${CONFIDENCE_STYLE[res.confidence] || CONFIDENCE_STYLE.low}`}>
                      {(res.score * 100).toFixed(0)}% · {res.confidence} · {res.match}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed font-sans bg-white p-2.5 rounded-lg border border-gray-100 shadow-2xs whitespace-pre-line">
                    {res.text}
                  </p>
                </div>
              ))}
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
