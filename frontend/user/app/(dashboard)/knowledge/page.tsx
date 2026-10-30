"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { KnowledgeHeader } from '../../../components/dashboard/KnowledgeHeader';
import { KnowledgeStats } from '../../../components/dashboard/KnowledgeStats';
import { KnowledgeTable } from '../../../components/dashboard/KnowledgeTable';
import { UploadDocModal } from '../../../components/dashboard/knowledge/UploadDocModal';
import { SyncWebsiteModal } from '../../../components/dashboard/knowledge/SyncWebsiteModal';
import { AddFaqModal } from '../../../components/dashboard/knowledge/AddFaqModal';
import { TestRagModal } from '../../../components/dashboard/knowledge/TestRagModal';
import { DashboardController, KnowledgeItem, isKnowledgeProcessing } from '../../../controllers/dashboard.controller';

export default function KnowledgeBasePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeModal, setActiveModal] = useState<'upload' | 'website' | 'faq' | 'test' | null>(null);
  const [editingFaq, setEditingFaq] = useState<KnowledgeItem | null>(null);

  const fetchKnowledge = useCallback(async (quiet = false) => {
    try {
      if (!quiet) setLoading(true);
      const data = await DashboardController.getKnowledge();
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems([]);
      }
    } catch (err) {
      console.warn('Failed to load knowledge base items:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchKnowledge();
  }, [fetchKnowledge]);

  // Uploads and website syncs are processed in the background: refresh quietly until none is queued or processing.
  const anyProcessing = items.some(isKnowledgeProcessing);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!anyProcessing) return;
    pollRef.current = setTimeout(() => fetchKnowledge(true), 3000);
    return () => {
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [anyProcessing, items, fetchKnowledge]);

  const handleDelete = async (id: string) => {
    await DashboardController.deleteKnowledge(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const replaceItem = (updated: KnowledgeItem) => setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));

  const handleReindex = async (item: KnowledgeItem) => {
    replaceItem(await DashboardController.reindexKnowledge(item.id));
  };

  const handleReplace = async (item: KnowledgeItem, file: File) => {
    replaceItem(await DashboardController.replaceKnowledgeFile(item.id, file));
  };

  const handleEditFaq = (faq: KnowledgeItem) => {
    setEditingFaq(faq);
    setActiveModal('faq');
  };

  const handleCloseModal = () => {
    setActiveModal(null);
    setEditingFaq(null);
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-8 flex flex-col h-full w-full">
      <KnowledgeHeader
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        onOpenModal={(modal) => {
          setEditingFaq(null);
          setActiveModal(modal);
        }}
      />

      <KnowledgeStats items={items} loading={loading} />

      <KnowledgeTable
        items={items}
        loading={loading}
        searchQuery={searchQuery}
        onDelete={handleDelete}
        onEditFaq={handleEditFaq}
        onReindex={handleReindex}
        onReplace={handleReplace}
        onOpenModal={(modal) => {
          setEditingFaq(null);
          setActiveModal(modal);
        }}
      />

      {/* Modals */}
      <UploadDocModal
        isOpen={activeModal === 'upload'}
        onClose={handleCloseModal}
        onSuccess={() => fetchKnowledge()}
      />

      <SyncWebsiteModal
        isOpen={activeModal === 'website'}
        onClose={handleCloseModal}
        onSuccess={() => fetchKnowledge()}
      />

      <AddFaqModal
        isOpen={activeModal === 'faq'}
        onClose={handleCloseModal}
        onSuccess={() => fetchKnowledge()}
        editingFaq={editingFaq}
      />

      <TestRagModal
        isOpen={activeModal === 'test'}
        onClose={handleCloseModal}
      />
    </div>
  );
}
