"use client";
import React, { useState, useEffect, useRef } from 'react';
import { STRINGS } from '../../utils/strings/en';
import { StorageService } from '../../services/storage.service';

interface KnowledgeHeaderProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onOpenModal: (modal: 'upload' | 'website' | 'faq' | 'test') => void;
}

export function KnowledgeHeader({ searchQuery, onSearchChange, onOpenModal }: KnowledgeHeaderProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [userInitials, setUserInitials] = useState('AM');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const user = StorageService.getUser();
    if (user?.name) {
      const parts = user.name.trim().split(' ');
      setUserInitials(parts.length > 1 ? (parts[0][0] + parts[1][0]).toUpperCase() : parts[0].slice(0, 2).toUpperCase());
    }

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 py-1">
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
          {STRINGS.DASHBOARD.HEADERS.KNOWLEDGE.TITLE}
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">
          {STRINGS.DASHBOARD.HEADERS.KNOWLEDGE.SUBTITLE}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Search Input */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={STRINGS.DASHBOARD.HEADERS.KNOWLEDGE.SEARCH_PLACEHOLDER} 
            className="w-[180px] sm:w-[210px] border border-gray-200 rounded-lg py-1.5 pl-8 pr-3 text-xs text-gray-800 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] shadow-2xs transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Add Source Dropdown Button */}
        <div className="relative" ref={dropdownRef}>
          <button 
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0066FF] text-white rounded-lg text-xs font-semibold shadow-xs hover:bg-[#0052cc] transition-colors cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            {STRINGS.DASHBOARD.HEADERS.KNOWLEDGE.ADD_BTN}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''}`}>
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.1)] border border-gray-100 py-1.5 z-40 animate-in fade-in zoom-in-95 duration-150">
              
              {/* Option 1: Upload Document */}
              <button
                onClick={() => { setDropdownOpen(false); onOpenModal('upload'); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#0066FF] flex items-center justify-center shrink-0 group-hover:bg-[#0066FF] group-hover:text-white transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="12" y1="18" x2="12" y2="12"></line>
                    <line x1="9" y1="15" x2="12" y2="12"></line>
                    <line x1="15" y1="15" x2="12" y2="12"></line>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-900 group-hover:text-[#0066FF] transition-colors">Upload Document</div>
                  <div className="text-[10px] text-gray-400">PDF, DOCX, TXT files</div>
                </div>
              </button>

              {/* Option 2: Sync Website */}
              <button
                onClick={() => { setDropdownOpen(false); onOpenModal('website'); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">Sync Clinic Website</div>
                  <div className="text-[10px] text-gray-400">Crawl public pages &amp; services</div>
                </div>
              </button>

              {/* Option 3: Add FAQ */}
              <button
                onClick={() => { setDropdownOpen(false); onOpenModal('faq'); }}
                className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2.5 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"></circle>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-900 group-hover:text-amber-600 transition-colors">Add Custom FAQ</div>
                  <div className="text-[10px] text-gray-400">Pre-approved Q&amp;A pairs</div>
                </div>
              </button>

              <div className="my-1 border-t border-gray-100"></div>

              {/* Option 4: Test Knowledge RAG */}
              <button
                onClick={() => { setDropdownOpen(false); onOpenModal('test'); }}
                className="w-full px-3 py-2 text-left hover:bg-blue-50/60 flex items-center gap-2.5 transition-colors cursor-pointer group"
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-[#0066FF] group-hover:text-white transition-colors">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-bold text-[#0066FF]">Test Knowledge (RAG)</div>
                  <div className="text-[10px] text-gray-400">Live vector query simulator</div>
                </div>
              </button>

            </div>
          )}
        </div>

        {/* User Initials Badge */}
        <div className="w-8 h-8 rounded-full bg-[#F0F7FF] text-[#0066FF] border border-blue-100 flex items-center justify-center font-bold text-xs shadow-2xs">
          {userInitials}
        </div>
      </div>
    </header>
  );
}
