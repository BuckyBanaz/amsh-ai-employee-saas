"use client";
import React, { useState, useRef } from 'react';
import { DashboardController } from '../../../controllers/dashboard.controller';

interface UploadDocModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadDocModal({ isOpen, onClose, onSuccess }: UploadDocModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setError('');
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
      setError('');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a document file (.pdf, .docx, .txt).');
      return;
    }

    try {
      setIsUploading(true);
      setError('');
      await DashboardController.uploadKnowledgeFile(selectedFile);
      onSuccess();
      onClose();
      setSelectedFile(null);
    } catch (err: any) {
      console.error('File upload failed:', err);
      setError(err.message || 'Failed to upload and index document.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#F9FAFB]/50">
          <div>
            <h3 className="text-sm font-bold text-gray-900">Upload Knowledge Document</h3>
            <p className="text-xs text-gray-500 mt-0.5">Index clinical policies, pricing sheets, or FAQs into RAG vector memory.</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg">
              {error}
            </div>
          )}

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-gray-200 hover:border-[#0066FF] rounded-xl p-8 flex flex-col items-center justify-center cursor-pointer bg-gray-50/50 hover:bg-blue-50/20 transition-all text-center group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.docx,.doc,.txt"
              className="hidden"
            />
            <div className="w-12 h-12 mb-3 bg-[#F0F7FF] group-hover:scale-105 rounded-full flex items-center justify-center text-[#0066FF] shadow-xs transition-transform">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 8 12 3 7 8"></polyline>
                <line x1="12" y1="3" x2="12" y2="15"></line>
              </svg>
            </div>
            {selectedFile ? (
              <div>
                <p className="text-xs font-bold text-gray-900">{selectedFile.name}</p>
                <p className="text-[11px] text-[#0066FF] font-medium mt-0.5">
                  {(selectedFile.size / 1024).toFixed(1)} KB • Click to choose different file
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-bold text-gray-900">Click or drag file to this area to upload</p>
                <p className="text-[11px] text-gray-400 mt-1">Supports PDF, DOCX, and TXT files up to 25MB</p>
              </div>
            )}
          </div>

          <div className="bg-blue-50/60 border border-blue-100 rounded-lg p-3 text-[11px] text-gray-600 flex items-start gap-2.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-[#0066FF] shrink-0 mt-0.5">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <span>Once uploaded, the document is automatically parsed, split into semantic chunks, and embedded for sub-50ms AI Receptionist retrieval.</span>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-gray-100 bg-[#F9FAFB]/50">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={isUploading || !selectedFile}
            className="px-5 py-2 text-xs font-semibold text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isUploading && <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>}
            {isUploading ? 'Uploading & Indexing...' : 'Upload & Index'}
          </button>
        </div>

      </div>
    </div>
  );
}
