"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';

interface KnowledgeDoc {
  id: number;
  name: string;
  status: 'Ready' | 'Processing';
}

interface KnowledgeSite {
  id: number;
  url: string;
  status: 'Ready' | 'Processing';
}

interface KnowledgeFaq {
  id: number;
  question: string;
  answer: string;
}

const initialDocuments: KnowledgeDoc[] = [
  { id: 1, name: 'Pricing Guide.pdf', status: 'Ready' },
  { id: 2, name: 'Business Policy.docx', status: 'Processing' },
];

const initialWebsites: KnowledgeSite[] = [
  { id: 1, url: 'www.smileclinic.com', status: 'Ready' },
];

const initialFaqs: KnowledgeFaq[] = [
  {
    id: 1,
    question: 'Do you accept walk-ins?',
    answer: 'Walk-ins are accepted during business hours, subject to availability.'
  },
  {
    id: 2,
    question: 'What insurance do you accept?',
    answer: 'We accept most major dental insurance plans.'
  },
];

export default function KnowledgeOnboardingPage() {
  const router = useRouter();

  const [docList, setDocList] = useState<KnowledgeDoc[]>(initialDocuments);
  const [siteList, setSiteList] = useState<KnowledgeSite[]>(initialWebsites);
  const [faqList, setFaqList] = useState<KnowledgeFaq[]>(initialFaqs);

  const [newUrl, setNewUrl] = useState('');
  const [isAddingFaq, setIsAddingFaq] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });
  const [editingFaqId, setEditingFaqId] = useState<number | null>(null);
  const [editFaqForm, setEditFaqForm] = useState({ question: '', answer: '' });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setDocList([...docList, { id: Date.now(), name: file.name, status: 'Processing' }]);
    }
  };

  const handleAddSite = () => {
    if (!newUrl.trim()) return;
    setSiteList([...siteList, { id: Date.now(), url: newUrl.replace(/^https?:\/\//, ''), status: 'Ready' }]);
    setNewUrl('');
  };

  const handleAddFaq = () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) return;
    setFaqList([...faqList, { id: Date.now(), ...newFaq }]);
    setNewFaq({ question: '', answer: '' });
    setIsAddingFaq(false);
  };

  const startEditFaq = (faq: KnowledgeFaq) => {
    setEditingFaqId(faq.id);
    setEditFaqForm({ question: faq.question, answer: faq.answer });
    setIsAddingFaq(false);
  };

  const handleSaveEditFaq = () => {
    if (!editFaqForm.question.trim() || !editFaqForm.answer.trim()) return;
    setFaqList(faqList.map(f => (f.id === editingFaqId ? { ...f, ...editFaqForm } : f)));
    setEditingFaqId(null);
  };

  const cancelEditFaq = () => setEditingFaqId(null);

  const removeDoc = (id: number) => setDocList(docList.filter(d => d.id !== id));
  const removeSite = (id: number) => setSiteList(siteList.filter(s => s.id !== id));
  const removeFaq = (id: number) => setFaqList(faqList.filter(f => f.id !== id));

  return (
    <div className="w-full max-w-3xl bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1.5">{STRINGS.ONBOARDING.KNOWLEDGE.TITLE}</h1>
        <p className="text-sm text-gray-500 leading-relaxed">
          {STRINGS.ONBOARDING.KNOWLEDGE.SUBTITLE}
        </p>
      </div>

      <div className="space-y-6 mb-6">

        {/* Section 1: Upload Documents */}
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-0.5">{STRINGS.ONBOARDING.KNOWLEDGE.SECTION_DOCS.TITLE}</h2>
            <p className="text-xs text-gray-500">
              {STRINGS.ONBOARDING.KNOWLEDGE.SECTION_DOCS.DESC}
            </p>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 p-4 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-[#0066FF] transition-colors group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
            />
            <div className="w-8 h-8 mb-2 bg-[#F0F7FF] rounded-full shadow-xs flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <p className="text-xs font-semibold text-[#0066FF]">{STRINGS.ONBOARDING.KNOWLEDGE.SECTION_DOCS.DRAG_DROP}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{STRINGS.ONBOARDING.KNOWLEDGE.SECTION_DOCS.HINT}</p>
          </div>

          <div className="space-y-2">
            {docList.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-2.5 border border-gray-200 rounded-lg bg-white shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-gray-50 flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-900">{doc.name}</p>
                    <p className="text-[10px] text-gray-400">{STRINGS.ONBOARDING.KNOWLEDGE.SECTION_DOCS.UPDATED}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {doc.status === 'Ready' ? (
                    <span className="bg-[#E6FBF3] text-[#10B981] text-[10px] font-bold px-1.5 py-0.5 rounded">
                      {STRINGS.ONBOARDING.KNOWLEDGE.SECTION_DOCS.STATUS_READY}
                    </span>
                  ) : (
                    <span className="bg-[#FEF3C7] text-[#F59E0B] text-[10px] font-bold px-1.5 py-0.5 rounded">
                      {STRINGS.ONBOARDING.KNOWLEDGE.SECTION_DOCS.STATUS_PROCESSING}
                    </span>
                  )}
                  <button onClick={() => removeDoc(doc.id)} title="Delete Document" className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 2: Sync Website */}
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-0.5">{STRINGS.ONBOARDING.KNOWLEDGE.SECTION_WEBSITE.TITLE}</h2>
            <p className="text-xs text-gray-500">
              {STRINGS.ONBOARDING.KNOWLEDGE.SECTION_WEBSITE.DESC}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
            <button onClick={handleAddSite} className="px-4 py-2 bg-[#0066FF] text-white text-xs font-semibold rounded-lg hover:bg-[#0052cc] transition-colors whitespace-nowrap">
              {STRINGS.ONBOARDING.KNOWLEDGE.SECTION_WEBSITE.ADD_URL}
            </button>
          </div>

          <div className="space-y-2">
            {siteList.map(site => (
              <div key={site.id} className="flex items-center justify-between p-2.5 border border-gray-200 rounded-lg bg-white shadow-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded bg-gray-50 flex items-center justify-center shrink-0">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                  </div>
                  <p className="text-xs font-semibold text-gray-900">{site.url}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="bg-[#E6FBF3] text-[#10B981] text-[10px] font-bold px-1.5 py-0.5 rounded">
                    {STRINGS.ONBOARDING.KNOWLEDGE.SECTION_DOCS.STATUS_READY}
                  </span>
                  <button onClick={() => removeSite(site.id)} title="Remove Website" className="text-gray-400 hover:text-red-500 transition-colors p-1 rounded hover:bg-red-50">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Custom FAQs */}
        <div className="space-y-3">
          <div>
            <h2 className="text-sm font-bold text-gray-900 mb-0.5">{STRINGS.ONBOARDING.KNOWLEDGE.SECTION_FAQ.TITLE}</h2>
            <p className="text-xs text-gray-500">
              {STRINGS.ONBOARDING.KNOWLEDGE.SECTION_FAQ.DESC}
            </p>
          </div>

          <div className="space-y-2">
            {faqList.map(faq => (
              <div key={faq.id}>
                {editingFaqId === faq.id ? (
                  <div className="p-4 border-2 border-[#0066FF] bg-blue-50/30 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-gray-900">Edit FAQ</h4>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Question</label>
                      <input
                        type="text"
                        value={editFaqForm.question}
                        onChange={e => setEditFaqForm({ ...editFaqForm, question: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-xs bg-white"
                        autoFocus
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Answer</label>
                      <textarea
                        value={editFaqForm.answer}
                        onChange={e => setEditFaqForm({ ...editFaqForm, answer: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-xs min-h-[60px] bg-white"
                      />
                    </div>
                    <div className="flex justify-end gap-2 pt-1">
                      <button
                        onClick={cancelEditFaq}
                        className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEditFaq}
                        disabled={!editFaqForm.question.trim() || !editFaqForm.answer.trim()}
                        className="px-4 py-1.5 text-xs font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-md transition-colors disabled:opacity-50"
                      >
                        Save Changes
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-[#F9FAFB] border border-gray-200 rounded-lg relative group hover:border-gray-300 transition-colors">
                    <div className="absolute top-2.5 right-2.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => startEditFaq(faq)}
                        title="Edit FAQ"
                        className="p-1 text-gray-400 hover:text-[#0066FF] hover:bg-blue-50 rounded transition-colors"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        onClick={() => removeFaq(faq.id)}
                        title="Delete FAQ"
                        className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    </div>
                    <div className="flex items-start justify-between mb-1">
                      <h3 className="text-xs font-bold text-gray-900 pr-12">{STRINGS.ONBOARDING.KNOWLEDGE.SECTION_FAQ.Q_PREFIX}{faq.question}</h3>
                    </div>
                    <p className="text-xs text-gray-600">{STRINGS.ONBOARDING.KNOWLEDGE.SECTION_FAQ.A_PREFIX}{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>

          {isAddingFaq ? (
            <div className="p-4 border-2 border-[#0066FF] bg-blue-50/30 rounded-xl space-y-3 mt-3">
              <h4 className="text-xs font-bold text-gray-900">Add New FAQ</h4>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Question</label>
                <input
                  type="text"
                  value={newFaq.question}
                  onChange={e => setNewFaq({ ...newFaq, question: e.target.value })}
                  placeholder="e.g. Do you accept emergency appointments?"
                  className="w-full px-3 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-xs bg-white"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Answer</label>
                <textarea
                  value={newFaq.answer}
                  onChange={e => setNewFaq({ ...newFaq, answer: e.target.value })}
                  placeholder="e.g. Yes, we reserve dedicated slots each day for emergencies."
                  className="w-full px-3 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-xs min-h-[60px] bg-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => { setIsAddingFaq(false); setNewFaq({ question: '', answer: '' }); }}
                  className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFaq}
                  disabled={!newFaq.question.trim() || !newFaq.answer.trim()}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-md transition-colors disabled:opacity-50"
                >
                  Save FAQ
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setIsAddingFaq(true); setEditingFaqId(null); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors pt-0.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              {STRINGS.ONBOARDING.KNOWLEDGE.SECTION_FAQ.ADD_FAQ}
            </button>
          )}
        </div>

      </div>

      {/* Footer Buttons */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/onboarding/ai-receptionist')}
          className="px-5 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.KNOWLEDGE.BACK_BTN}
        </button>
        <button
          type="button"
          onClick={() => router.push('/onboarding/integrations')}
          className="px-6 py-2 rounded-lg bg-[#0066FF] text-white text-sm font-medium hover:bg-[#0052cc] transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.KNOWLEDGE.CONTINUE_BTN}
        </button>
      </div>
    </div>
  );
}
