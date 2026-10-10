"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { ServicesHeader } from '../../../components/dashboard/ServicesHeader';
import { ServiceCards } from '../../../components/dashboard/ServiceCards';
import { ServiceModal } from '../../../components/dashboard/ServiceModal';
import { ServiceSuggestions } from '../../../components/dashboard/ServiceSuggestions';
import { DashboardController, ServiceItem, ServiceSuggestion } from '../../../controllers/dashboard.controller';

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);
  const [suggestions, setSuggestions] = useState<ServiceSuggestion[]>([]);
  const [draft, setDraft] = useState<{ title: string; description?: string } | null>(null);

  // Services on the clinic's website that are not in this list. Loaded separately: it reads the website with the AI, so it
  // can take a few seconds the first time, and it must never hold up or break the list itself.
  const loadSuggestions = useCallback(async () => {
    try {
      const data = await DashboardController.getServiceSuggestions();
      setSuggestions(data?.suggestions || []);
    } catch (err) {
      console.error('Failed to load service suggestions:', err);
      setSuggestions([]);
    }
  }, []);

  const loadServices = useCallback(async () => {
    try {
      setLoading(true);
      const data = await DashboardController.getServices();
      setServices(data || []);
    } catch (err) {
      console.error('Failed to load clinic services:', err);
      setServices([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServices();
    loadSuggestions();
  }, [loadServices, loadSuggestions]);

  const handleOpenAdd = () => {
    setEditingService(null);
    setDraft(null);
    setIsModalOpen(true);
  };

  const handleAddSuggestion = (s: ServiceSuggestion) => {
    setEditingService(null);
    setDraft({ title: s.title, description: s.description });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (service: ServiceItem) => {
    setDraft(null);
    setEditingService(service);
    setIsModalOpen(true);
  };

  const handleSaveService = async (serviceData: {
    title: string;
    description?: string;
    duration_minutes?: number;
    price_amount?: number;
    price_currency?: string;
  }) => {
    if (editingService) {
      await DashboardController.updateService(editingService.id, serviceData);
    } else {
      await DashboardController.createService(serviceData);
    }
    await loadServices();
    if (!editingService) {
      setSuggestions((prev) => prev.filter((s) => s.title.trim().toLowerCase() !== serviceData.title.trim().toLowerCase()));
      loadSuggestions();  // the server re-checks against the updated list (the website is not read again)
    }
  };

  const handleDeleteService = async (serviceId: string) => {
    try {
      await DashboardController.deleteService(serviceId);
      await loadServices();
    } catch (err) {
      console.error('Failed to delete service:', err);
    }
  };

  return (
    <div className="space-y-3.5 animate-in fade-in duration-300 pb-8 flex flex-col h-full w-full">
      <ServicesHeader onAddService={handleOpenAdd} />

      <ServiceSuggestions suggestions={suggestions} onAdd={handleAddSuggestion} />
      
      <div className="flex-1 min-h-0">
        <ServiceCards
          services={services}
          loading={loading}
          onEdit={handleOpenEdit}
          onDelete={handleDeleteService}
          onAdd={handleOpenAdd}
        />
      </div>

      <ServiceModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingService(null);
          setDraft(null);
        }}
        onSave={handleSaveService}
        editingService={editingService}
        draft={draft}
      />
    </div>
  );
}
