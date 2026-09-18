"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';

const initialDocuments = [
  { id: 1, name: 'Pricing Guide.pdf', status: 'Ready' },
  { id: 2, name: 'Business Policy.docx', status: 'Processing' },
];


const initialWebsites = [
  { id: 1, url: 'www.smileclinic.com', status: 'Ready' },
];

const initialFaqs = [
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

  const [docList, setDocList] = useState(initialDocuments);
  const [siteList, setSiteList] = useState(initialWebsites);
  const [faqList, setFaqList] = useState(initialFaqs);

  const [newUrl, setNewUrl] = useState('');
  const [isAddingFaq, setIsAddingFaq] = useState(false);
  const [newFaq, setNewFaq] = useState({ question: '', answer: '' });

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

  const removeDoc = (id: number) => setDocList(docList.filter(d => d.id !== id));
  const removeSite = (id: number) => setSiteList(siteList.filter(s => s.id !== id));
  const removeFaq = (id: number) => setFaqList(faqList.filter(f => f.id !== id));

  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">{STRINGS.ONBOARDING.KNOWLEDGE.TITLE}</h1>
        <p className="text-gray-500 leading-relaxed">
          {STRINGS.ONBOARDING.KNOWLEDGE.SUBTITLE}
        </p>
      </div>

      <div className="space-y-12 mb-8">

        {/* Section 1: Upload Documents */}
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1">{STRINGS.ONBOARDING.KNOWLEDGE.SECTION_DOCS.TITLE}</h2>
            <p className="text-sm text-gray-500">
              {STRINGS.ONBOARDING.KNOWLEDGE.SECTION_DOCS.DESC}
            </p>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 rounded-xl bg-gray-50/50 p-8 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 hover:border-[#0066FF] transition-colors group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              accept=".pdf,.doc,.docx,.txt"
            />
            <div className="w-10 h-10 mb-3 bg-[#F0F7FF] rounded-full shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#0066FF]">{STRINGS.ONBOARDING.KNOWLEDGE.SECTION_DOCS.DRAG_DROP}</p>
            <p className="text-xs text-gray-500 mt-1">{STRINGS.ONBOARDING.KNOWLEDGE.SECTION_DOCS.HINT}</p>
          </div>

          <div className="space-y-2.5">
            {docList.map(doc => (
              <div key={doc.id} className="flex items-center justify-between p-3.5 border border-gray-200 rounded-lg bg-white shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                      <polyline points="14 2 14 8 20 8"></polyline>
                      <line x1="16" y1="13" x2="8" y2="13"></line>
                      <line x1="16" y1="17" x2="8" y2="17"></line>
                      <polyline points="10 9 9 9 8 9"></polyline>
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{doc.name}</p>
                    <p className="text-xs text-gray-400">{STRINGS.ONBOARDING.KNOWLEDGE.SECTION_DOCS.UPDATED}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  {doc.status === 'Ready' ? (
                    <span className="bg-[#E6FBF3] text-[#10B981] text-[11px] font-bold px-2 py-1 rounded">
                      {STRINGS.ONBOARDING.KNOWLEDGE.SECTION_DOCS.STATUS_READY}
                    </span>
                  ) : (
                    <span className="bg-[#FEF3C7] text-[#F59E0B] text-[11px] font-bold px-2 py-1 rounded">
                      {STRINGS.ONBOARDING.KNOWLEDGE.SECTION_DOCS.STATUS_PROCESSING}
                    </span>
                  )}
                  <button onClick={() => removeDoc(doc.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1">{STRINGS.ONBOARDING.KNOWLEDGE.SECTION_WEBSITE.TITLE}</h2>
            <p className="text-sm text-gray-500">
              {STRINGS.ONBOARDING.KNOWLEDGE.SECTION_WEBSITE.DESC}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="text"
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              placeholder="https://example.com"
              className="flex-1 px-4 py-3 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] focus:border-transparent transition-all"
            />
            <button onClick={handleAddSite} className="px-5 py-3 bg-[#0066FF] text-white font-semibold rounded-lg hover:bg-[#0052cc] transition-colors whitespace-nowrap">
              {STRINGS.ONBOARDING.KNOWLEDGE.SECTION_WEBSITE.ADD_URL}
            </button>
          </div>

          <div className="space-y-2.5">
            {siteList.map(site => (
              <div key={site.id} className="flex items-center justify-between p-3.5 border border-gray-200 rounded-lg bg-white shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded bg-gray-50 flex items-center justify-center shrink-0">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                      <circle cx="12" cy="12" r="10"></circle>
                      <line x1="2" y1="12" x2="22" y2="12"></line>
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{site.url}</p>
                </div>
                <div className="flex items-center gap-4">
                  <span className="bg-[#E6FBF3] text-[#10B981] text-[11px] font-bold px-2 py-1 rounded">
                    {STRINGS.ONBOARDING.KNOWLEDGE.SECTION_DOCS.STATUS_READY}
                  </span>
                  <button onClick={() => removeSite(site.id)} className="text-gray-400 hover:text-red-500 transition-colors p-1">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
        <div className="space-y-4">
          <div>
            <h2 className="text-base font-bold text-gray-900 mb-1">{STRINGS.ONBOARDING.KNOWLEDGE.SECTION_FAQ.TITLE}</h2>
            <p className="text-sm text-gray-500">
              {STRINGS.ONBOARDING.KNOWLEDGE.SECTION_FAQ.DESC}
            </p>
          </div>

          <div className="space-y-3">
            {faqList.map(faq => (
              <div key={faq.id} className="p-5 bg-[#F9FAFB] border border-gray-200 rounded-xl relative group">
                <button
                  onClick={() => removeFaq(faq.id)}
                  className="absolute top-4 right-4 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
                <div className="flex items-start justify-between mb-2">
                  <h3 className="text-sm font-bold text-gray-900 pr-8">{STRINGS.ONBOARDING.KNOWLEDGE.SECTION_FAQ.Q_PREFIX}{faq.question}</h3>
                </div>
                <p className="text-sm text-gray-600">{STRINGS.ONBOARDING.KNOWLEDGE.SECTION_FAQ.A_PREFIX}{faq.answer}</p>
              </div>
            ))}
          </div>

          {isAddingFaq ? (
            <div className="p-5 border-2 border-[#0066FF] bg-blue-50/30 rounded-xl space-y-4 mt-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Question</label>
                <input
                  type="text"
                  value={newFaq.question}
                  onChange={e => setNewFaq({ ...newFaq, question: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Answer</label>
                <textarea
                  value={newFaq.answer}
                  onChange={e => setNewFaq({ ...newFaq, answer: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-sm min-h-[80px]"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsAddingFaq(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddFaq}
                  disabled={!newFaq.question || !newFaq.answer}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-colors disabled:opacity-50"
                >
                  Save FAQ
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingFaq(true)}
              className="flex items-center gap-1.5 text-sm font-semibold text-[#0066FF] hover:text-[#0052cc] transition-colors pt-1"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              {STRINGS.ONBOARDING.KNOWLEDGE.SECTION_FAQ.ADD_FAQ}
            </button>
          )}
        </div>

      </div>

      {/* Footer Buttons */}
      <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/onboarding/ai-receptionist')}
          className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.KNOWLEDGE.BACK_BTN}
        </button>
        <button
          type="button"
          onClick={() => router.push('/onboarding/integrations')}
          className="px-8 py-2.5 rounded-lg bg-[#0066FF] text-white font-medium hover:bg-[#0052cc] transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.KNOWLEDGE.CONTINUE_BTN}
        </button>
      </div>
    </div>
  );
}
