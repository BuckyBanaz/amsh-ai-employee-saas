"use client";
import React, { useState, useEffect } from 'react';
import { DashboardController, KnowledgeItem } from '../../../controllers/dashboard.controller';

interface AddFaqModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editingFaq?: KnowledgeItem | null;
}

export function AddFaqModal({ isOpen, onClose, onSuccess, editingFaq }: AddFaqModalProps) {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingFaq) {
      setQuestion(editingFaq.question || '');
      setAnswer(editingFaq.answer || '');
    } else {
      setQuestion('');
      setAnswer('');
    }
  }, [editingFaq, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim() || !answer.trim()) {
      setError('Please provide both question and answer.');
      return;
    }

    try {
      setIsSaving(true);
      setError('');

      if (editingFaq) {
        // If editing existing entry
        await DashboardController.createKnowledge({
          doc_type: 'faq',
          question: question.trim(),
          answer: answer.trim(),
        });
        await DashboardController.deleteKnowledge(editingFaq.id);
      } else {
        await DashboardController.createKnowledge({
          doc_type: 'faq',
          question: question.trim(),
          answer: answer.trim(),
        });
      }

      onSuccess();
      onClose();
      setQuestion('');
      setAnswer('');
    } catch (err: any) {
      console.error('Save FAQ failed:', err);
      setError(err.message || 'Failed to save FAQ.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#F9FAFB]/50">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              {editingFaq ? 'Edit Clinical FAQ' : 'Add Custom FAQ / Policy'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Direct questions and approved answers for instant AI call response.</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            {error && (
              <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Caller Question or Inbound Query</label>
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="e.g. Do you accept emergency dental walk-ins on weekends?"
                className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">Approved AI Answer &amp; Instructions</label>
              <textarea
                rows={4}
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="e.g. Yes! We accept walk-in emergency appointments on Saturdays and Sundays between 9:00 AM and 2:00 PM. Please advise the patient to bring photo ID."
                className="w-full border border-gray-200 rounded-lg py-2.5 px-3 text-xs font-medium text-gray-900 focus:outline-none focus:border-[#0066FF] focus:ring-1 focus:ring-[#0066FF] transition-all resize-y"
              />
            </div>

            <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-3 text-[11px] text-gray-600 flex items-start gap-2.5">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0066FF] shrink-0 mt-0.5">
                <path d="M12 2a6 6 0 0 0-6 6c0 2.5 1.5 4.5 3 5.5v2.5a1 1 0 0 0 1 1h4a1 1 0 0 0 1-1V13.5c1.5-1 3-3 3-5.5a6 6 0 0 0-6-6z"></path>
                <line x1="9" y1="21" x2="15" y2="21"></line>
              </svg>
              <span>The AI Receptionist matches caller questions using semantic vector similarity, so exact wording is not required by the caller.</span>
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-gray-100 bg-[#F9FAFB]/50">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving || !question.trim() || !answer.trim()}
              className="px-5 py-2 text-xs font-semibold text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
            >
              {isSaving && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
              {isSaving ? 'Saving FAQ...' : (editingFaq ? 'Update FAQ' : 'Save FAQ')}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}
