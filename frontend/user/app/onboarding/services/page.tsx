"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';

// Duration options — value = integer minutes (matches backend duration_minutes: int)
const DURATION_OPTIONS = [
  { label: '10 min',      value: 10  },
  { label: '15 min',      value: 15  },
  { label: '20 min',      value: 20  },
  { label: '30 min',      value: 30  },
  { label: '45 min',      value: 45  },
  { label: '1 hr',        value: 60  },
  { label: '1 hr 30 min', value: 90  },
  { label: '2 hr',        value: 120 },
  { label: '3 hr',        value: 180 },
];

// 30 → "30 min"  |  90 → "1 hr 30 min"
const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} min`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs} hr ${mins} min` : `${hrs} hr`;
};

type Service = {
  id: number;
  title: string;
  description: string;
  duration_minutes: number;
  price_amount: number;
};

const initialServices: Service[] = [
  { id: 1, title: 'Dental Consultation', description: 'Standard clinic appointment slot', duration_minutes: 30,  price_amount: 50  },
  { id: 2, title: 'Dental Cleaning',     description: 'Professional teeth cleaning',      duration_minutes: 45,  price_amount: 80  },
  { id: 3, title: 'Teeth Whitening',     description: 'In-office whitening treatment',    duration_minutes: 60,  price_amount: 150 },
];

const emptyForm = { title: '', description: '', duration_minutes: 30, price_amount: '' as number | '' };

export default function ServicesOnboardingPage() {
  const router = useRouter();
  const [servicesList, setServicesList] = useState<Service[]>(initialServices);
  const [isAdding, setIsAdding]         = useState(false);
  const [editingId, setEditingId]       = useState<number | null>(null);
  const [newService, setNewService]     = useState<typeof emptyForm>(emptyForm);
  const [editForm, setEditForm]         = useState<typeof emptyForm>(emptyForm);
  const [currencySymbol, setCurrencySymbol] = useState('$');

  useEffect(() => {
    const saved = localStorage.getItem('onboarding_currency');
    if (saved) {
      const map: Record<string, string> = { USD: '$', EUR: '€', GBP: '£', INR: '₹', CAD: '$', AUD: '$' };
      setCurrencySymbol(map[saved] || '$');
    }
  }, []);

  // ── Add ──────────────────────────────────────────────────────────────
  const handleAddService = () => {
    if (!newService.title.trim()) return;
    setServicesList([
      ...servicesList,
      { ...newService, id: Date.now(), price_amount: Number(newService.price_amount) || 0 },
    ]);
    setNewService(emptyForm);
    setIsAdding(false);
  };

  // ── Edit ─────────────────────────────────────────────────────────────
  const startEdit = (service: Service) => {
    setEditingId(service.id);
    setEditForm({ title: service.title, description: service.description, duration_minutes: service.duration_minutes, price_amount: service.price_amount });
    setIsAdding(false); // close add form if open
  };

  const handleSaveEdit = () => {
    if (!editForm.title.trim()) return;
    setServicesList(servicesList.map(s =>
      s.id === editingId
        ? { ...s, title: editForm.title, description: editForm.description, duration_minutes: editForm.duration_minutes, price_amount: Number(editForm.price_amount) || 0 }
        : s
    ));
    setEditingId(null);
  };

  const cancelEdit = () => setEditingId(null);

  // ── Delete ───────────────────────────────────────────────────────────
  const handleDelete = (id: number) => {
    setServicesList(servicesList.filter(s => s.id !== id));
    if (editingId === id) setEditingId(null);
  };

  // ── Shared form UI ───────────────────────────────────────────────────
  const ServiceForm = ({
    values, onChange, onSave, onCancel, saveLabel,
  }: {
    values: typeof emptyForm;
    onChange: (v: typeof emptyForm) => void;
    onSave: () => void;
    onCancel: () => void;
    saveLabel: string;
  }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
      <div>
        <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Service Name</label>
        <input
          type="text"
          value={values.title}
          onChange={e => onChange({ ...values, title: e.target.value })}
          placeholder="e.g. Teeth Whitening"
          autoFocus
          className="w-full px-3 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-xs"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Description</label>
        <input
          type="text"
          value={values.description}
          onChange={e => onChange({ ...values, description: e.target.value })}
          placeholder="e.g. Standard 60m session"
          className="w-full px-3 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-xs"
        />
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Duration</label>
        <select
          value={values.duration_minutes}
          onChange={e => onChange({ ...values, duration_minutes: Number(e.target.value) })}
          className="w-full px-3 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-xs bg-white"
        >
          {DURATION_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="text-[11px] font-semibold text-gray-700 mb-1 block">Price</label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
            <span className="text-gray-500 text-xs">{currencySymbol}</span>
          </div>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.price_amount}
            onChange={e => onChange({ ...values, price_amount: e.target.value === '' ? '' : Number(e.target.value) })}
            placeholder="150"
            className="w-full pl-6 pr-3 py-1.5 rounded-md border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-xs"
          />
        </div>
      </div>
      <div className="md:col-span-2 flex justify-end gap-2 pt-1">
        <button onClick={onCancel} className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
          Cancel
        </button>
        <button onClick={onSave} disabled={!values.title.trim()} className="px-4 py-1.5 text-xs font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-md transition-colors disabled:opacity-50">
          {saveLabel}
        </button>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-3xl bg-white rounded-xl shadow-sm border border-gray-100 p-4 sm:p-6 md:p-8">
      <div className="mb-5 sm:mb-6">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1.5">{STRINGS.ONBOARDING.SERVICES.TITLE}</h1>
        <p className="text-sm text-gray-500">{STRINGS.ONBOARDING.SERVICES.SUBTITLE}</p>
      </div>

      <div className="space-y-3 mb-6">
        {servicesList.map((service) => (
          <div key={service.id} className="border border-gray-200 rounded-lg overflow-hidden hover:border-gray-300 transition-colors bg-white group">

            {/* ── Edit mode ── */}
            {editingId === service.id ? (
              <div className="border-2 border-[#0066FF] rounded-lg p-4 bg-blue-50/30">
                <h3 className="text-xs font-bold text-gray-900 mb-3">Edit Service</h3>
                <ServiceForm
                  values={editForm}
                  onChange={setEditForm}
                  onSave={handleSaveEdit}
                  onCancel={cancelEdit}
                  saveLabel="Save Changes"
                />
              </div>
            ) : (
              /* ── View mode ── */
              <div className="p-3.5">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-bold text-gray-900">{service.title}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{service.description}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    {/* Edit */}
                    <button
                      onClick={() => startEdit(service)}
                      title="Edit"
                      className="p-1 text-gray-400 hover:text-[#0066FF] hover:bg-blue-50 rounded transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    {/* Delete */}
                    <button
                      onClick={() => handleDelete(service.id)}
                      title="Delete"
                      className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-0.5">
                  <div className="flex items-center bg-[#F0F7FF] px-2 py-0.5 rounded">
                    <span className="text-[11px] font-semibold text-[#0066FF]">{formatDuration(service.duration_minutes)}</span>
                  </div>
                  <span className="text-xs font-bold text-gray-900">{currencySymbol}{service.price_amount}</span>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* ── Add new form ── */}
        {isAdding ? (
          <div className="border-2 border-[#0066FF] rounded-xl p-4 bg-blue-50/30">
            <h3 className="text-xs font-bold text-gray-900 mb-3">Add New Service</h3>
            <ServiceForm
              values={newService}
              onChange={setNewService}
              onSave={handleAddService}
              onCancel={() => { setIsAdding(false); setNewService(emptyForm); }}
              saveLabel="Save Service"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setIsAdding(true); setEditingId(null); }}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl bg-[#FAFAFB] p-4 flex flex-col items-center justify-center hover:bg-gray-50 hover:border-[#0066FF] transition-colors group"
          >
            <div className="w-8 h-8 mb-2 bg-[#F0F7FF] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <p className="text-xs font-semibold text-[#0066FF]">{STRINGS.ONBOARDING.SERVICES.ADD_SERVICE}</p>
            <p className="text-[11px] text-gray-500 mt-0.5">{STRINGS.ONBOARDING.SERVICES.ADD_SERVICE_SUBTITLE}</p>
          </button>
        )}
      </div>

      {/* Footer */}
      <div className="pt-4 border-t border-gray-100 flex items-center justify-between">
        <button
          type="button"
          onClick={() => router.push('/onboarding/business')}
          className="px-5 py-2 rounded-lg border border-gray-200 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.SERVICES.BACK_BTN}
        </button>
        <button
          type="button"
          onClick={() => router.push('/onboarding/staff')}
          className="px-6 py-2 rounded-lg bg-[#0066FF] text-white text-sm font-medium hover:bg-[#0052cc] transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.SERVICES.CONTINUE_BTN}
        </button>
      </div>
    </div>
  );
}
