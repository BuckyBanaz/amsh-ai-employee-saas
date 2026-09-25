"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { KnowledgeHeader } from '../../../components/dashboard/KnowledgeHeader';
import { KnowledgeStats } from '../../../components/dashboard/KnowledgeStats';
import { KnowledgeTable } from '../../../components/dashboard/KnowledgeTable';
import { UploadDocModal } from '../../../components/dashboard/knowledge/UploadDocModal';
import { SyncWebsiteModal } from '../../../components/dashboard/knowledge/SyncWebsiteModal';
import { AddFaqModal } from '../../../components/dashboard/knowledge/AddFaqModal';
import { TestRagModal } from '../../../components/dashboard/knowledge/TestRagModal';
import { DashboardController, KnowledgeItem } from '../../../controllers/dashboard.controller';

export default function KnowledgeBasePage() {
  const [items, setItems] = useState<KnowledgeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [activeModal, setActiveModal] = useState<'upload' | 'website' | 'faq' | 'test' | null>(null);
  const [editingFaq, setEditingFaq] = useState<KnowledgeItem | null>(null);

  const fetchKnowledge = useCallback(async () => {
    try {
      setLoading(true);
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

  const handleDelete = async (id: string) => {
    await DashboardController.deleteKnowledge(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleSyncUrl = async (url: string) => {
    await DashboardController.syncKnowledgeUrl(url);
    await fetchKnowledge();
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
    <div className="animate-in fade-in duration-500 pt-4 pb-6 flex flex-col h-full w-full">
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
        onSyncUrl={handleSyncUrl}
        onOpenModal={(modal) => {
          setEditingFaq(null);
          setActiveModal(modal);
        }}
      />

      {/* Modals */}
      <UploadDocModal
        isOpen={activeModal === 'upload'}
        onClose={handleCloseModal}
        onSuccess={fetchKnowledge}
      />

      <SyncWebsiteModal
        isOpen={activeModal === 'website'}
        onClose={handleCloseModal}
        onSuccess={fetchKnowledge}
      />

      <AddFaqModal
        isOpen={activeModal === 'faq'}
        onClose={handleCloseModal}
        onSuccess={fetchKnowledge}
        editingFaq={editingFaq}
      />

      <TestRagModal
        isOpen={activeModal === 'test'}
        onClose={handleCloseModal}
      />
    </div>
  );
}
