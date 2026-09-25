"use client";

import React, { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';
import { OnboardingController } from '../../../controllers/onboarding.controller';
import { StorageService } from '../../../services/storage.service';

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

const initialDocuments: KnowledgeDoc[] = [];
const initialWebsites: KnowledgeSite[] = [];
const initialFaqs: KnowledgeFaq[] = [];

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Hydrate from localStorage or derive website from Step 1
  React.useEffect(() => {
    try {
      const rawDocs = localStorage.getItem('onboarding_knowledge_docs');
      if (rawDocs) {
        const parsed = JSON.parse(rawDocs);
        if (Array.isArray(parsed)) setDocList(parsed);
      }
      const rawSites = localStorage.getItem('onboarding_knowledge_urls') || localStorage.getItem('onboarding_knowledge_sites');
      if (rawSites) {
        const parsed = JSON.parse(rawSites);
        if (Array.isArray(parsed)) setSiteList(parsed);
      } else {
        // Derive real website from Step 1 if user provided one
        const rawBiz = localStorage.getItem('onboarding_business_data');
        if (rawBiz) {
          const biz = JSON.parse(rawBiz);
          if (biz.website && biz.website.trim()) {
            setSiteList([{ id: Date.now(), url: biz.website.replace(/^https?:\/\//, ''), status: 'Ready' }]);
          }
        }
      }
      const rawFaqs = localStorage.getItem('onboarding_knowledge_faqs');
      if (rawFaqs) {
        const parsed = JSON.parse(rawFaqs);
        if (Array.isArray(parsed)) setFaqList(parsed);
      }
    } catch (e) {
      console.error('Failed to parse knowledge data from storage:', e);
    }
  }, []);

  // Sync back to localStorage
  React.useEffect(() => {
    localStorage.setItem('onboarding_knowledge_docs', JSON.stringify(docList));
  }, [docList]);

  React.useEffect(() => {
    localStorage.setItem('onboarding_knowledge_urls', JSON.stringify(siteList));
    localStorage.setItem('onboarding_knowledge_sites', JSON.stringify(siteList));
  }, [siteList]);

  React.useEffect(() => {
    localStorage.setItem('onboarding_knowledge_faqs', JSON.stringify(faqList));
  }, [faqList]);

  const [fileUploading, setFileUploading] = useState(false);
  const [siteSyncing, setSiteSyncing] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const tempId = Date.now();
    setDocList(prev => [...prev, { id: tempId, name: file.name, status: 'Processing' }]);
    setFileUploading(true);
    setError('');

    try {
      const businessId = StorageService.getBusinessId();
      if (businessId) {
        await OnboardingController.uploadKnowledgeFile(businessId, file);
      }
      setDocList(prev => prev.map(d => (d.id === tempId ? { ...d, status: 'Ready' } : d)));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'File upload failed');
      setDocList(prev => prev.filter(d => d.id !== tempId));
    } finally {
      setFileUploading(false);
    }
  };

  const handleAddSite = async () => {
    if (!newUrl.trim()) return;
    const formattedUrl = newUrl.startsWith('http') ? newUrl : `https://${newUrl}`;
    const tempId = Date.now();
    setSiteList(prev => [...prev, { id: tempId, url: formattedUrl.replace(/^https?:\/\//, ''), status: 'Processing' }]);
    setNewUrl('');
    setSiteSyncing(true);
    setError('');

    try {
      const businessId = StorageService.getBusinessId();
      if (businessId) {
        await OnboardingController.syncKnowledgeUrl(businessId, formattedUrl);
      }
      // Min 1.2s animation delay so user sees live scraping progress indicator
      await new Promise(resolve => setTimeout(resolve, 1200));
      setSiteList(prev => prev.map(s => (s.id === tempId ? { ...s, status: 'Ready' } : s)));
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to sync website URL');
    } finally {
      setSiteSyncing(false);
    }
  };

  const handleAddFaq = async () => {
    if (!newFaq.question.trim() || !newFaq.answer.trim()) return;
    const tempFaq = { id: Date.now(), ...newFaq };
    setFaqList(prev => [...prev, tempFaq]);
    setNewFaq({ question: '', answer: '' });
    setIsAddingFaq(false);

    try {
      const businessId = StorageService.getBusinessId();
      if (businessId) {
        await OnboardingController.createKnowledge(businessId, {
          doc_type: 'faq',
          question: tempFaq.question,
          answer: tempFaq.answer,
        });
      }
    } catch (err: any) {
      console.error(err);
    }
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

  const handleFinish = async () => {
    const businessId = StorageService.getBusinessId();
    if (!businessId) {
      router.push('/onboarding/integrations');
      return;
    }
    setLoading(true);
    setError('');
    router.push('/onboarding/integrations');
  };

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
            {docList.length === 0 && (
              <div className="text-center py-3 text-xs text-gray-400 italic bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                No documents uploaded yet (Optional — upload pricing or policy PDFs)
              </div>
            )}
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
            {siteList.length === 0 && (
              <div className="text-center py-3 text-xs text-gray-400 italic bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                No websites synced yet (Optional — add website URL to scrape FAQs and details)
              </div>
            )}
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
                  {site.status === 'Ready' ? (
                    <span className="bg-[#E6FBF3] text-[#10B981] text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                      {STRINGS.ONBOARDING.KNOWLEDGE.SECTION_DOCS.STATUS_READY}
                    </span>
                  ) : (
                    <span className="bg-[#FEF3C7] text-[#D97706] text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1.5 animate-pulse">
                      <svg className="animate-spin h-2.5 w-2.5 text-[#D97706]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      {STRINGS.ONBOARDING.KNOWLEDGE.SECTION_DOCS.STATUS_PROCESSING}
                    </span>
                  )}
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
            {faqList.length === 0 && !isAddingFaq && (
              <div className="text-center py-3 text-xs text-gray-400 italic bg-gray-50/50 rounded-lg border border-dashed border-gray-200">
                No custom FAQs added yet (Optional — click &quot;+ Add FAQ&quot; to provide common answers)
              </div>
            )}
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

      {error && <div className="mb-3 text-red-500 text-xs font-medium p-2.5 bg-red-50 rounded-lg border border-red-100">{error}</div>}

      {/* Footer Buttons */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/onboarding/ai-receptionist')}
          disabled={loading}
          className="px-5 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm disabled:opacity-50"
        >
          {STRINGS.ONBOARDING.KNOWLEDGE.BACK_BTN}
        </button>
        <button
          type="button"
          onClick={handleFinish}
          disabled={loading}
          className="px-6 py-2 rounded-lg bg-[#0066FF] text-white text-sm font-medium hover:bg-[#0052cc] transition-colors shadow-sm disabled:bg-blue-300"
        >
          {loading ? 'Finishing...' : STRINGS.ONBOARDING.KNOWLEDGE.CONTINUE_BTN}
        </button>
      </div>
    </div>
  );
}
