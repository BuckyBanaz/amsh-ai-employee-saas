"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { ServicesHeader } from '../../../components/dashboard/ServicesHeader';
import { ServiceCards } from '../../../components/dashboard/ServiceCards';
import { ServiceModal } from '../../../components/dashboard/ServiceModal';
import { DashboardController, ServiceItem } from '../../../controllers/dashboard.controller';

export default function ServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

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
  }, [loadServices]);

  const handleOpenAdd = () => {
    setEditingService(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (service: ServiceItem) => {
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
        }}
        onSave={handleSaveService}
        editingService={editingService}
      />
    </div>
  );
}
