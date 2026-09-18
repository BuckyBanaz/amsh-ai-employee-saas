"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { STRINGS } from '../../../utils/strings/en';

const initialServices = [
  {
    id: 1,
    title: 'Dental Consultation',
    description: 'Standard clinic appointment slot',
    duration: '30 min',
    price: '50',
  },
  {
    id: 2,
    title: 'Dental Cleaning',
    description: 'Standard clinic appointment slot',
    duration: '45 min',
    price: '80',
  },
  {
    id: 3,
    title: 'Teeth Whitening',
    description: 'Standard clinic appointment slot',
    duration: '60 min',
    price: '150',
  },
];

export default function ServicesOnboardingPage() {
  const router = useRouter();
  const [servicesList, setServicesList] = useState(initialServices);
  const [isAdding, setIsAdding] = useState(false);
  const [newService, setNewService] = useState({ title: '', description: '', duration: '30 min', price: '' });
  const [currencySymbol, setCurrencySymbol] = useState('$');

  useEffect(() => {
    const savedCurrency = localStorage.getItem('onboarding_currency');
    if (savedCurrency) {
      const symbols: Record<string, string> = {
        'USD': '$',
        'EUR': '€',
        'GBP': '£',
        'INR': '₹',
        'CAD': '$',
        'AUD': '$'
      };
      setCurrencySymbol(symbols[savedCurrency] || '$');
    }
  }, []);

  const handleAddService = () => {
    if (!newService.title) return;
    setServicesList([...servicesList, { ...newService, id: Date.now() }]);
    setNewService({ title: '', description: '', duration: '30 min', price: '' });
    setIsAdding(false);
  };

  return (
    <div className="w-full max-w-4xl bg-white rounded-2xl shadow-sm border border-gray-100 p-8 sm:p-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">{STRINGS.ONBOARDING.SERVICES.TITLE}</h1>
        <p className="text-gray-500">
          {STRINGS.ONBOARDING.SERVICES.SUBTITLE}
        </p>
      </div>

      <div className="space-y-4 mb-8">
        {servicesList.map((service) => (
          <div key={service.id} className="border border-gray-200 rounded-xl p-5 hover:border-gray-300 transition-colors bg-white group">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900">{service.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{service.description}</p>
              </div>
              <div className="flex items-center gap-2">
                <button className="p-1.5 text-gray-400 hover:text-[#0066FF] hover:bg-blue-50 rounded-md transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>
                <button className="p-1.5 text-gray-400 hover:text-[#0066FF] hover:bg-blue-50 rounded-md transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                  </svg>
                </button>
                <button className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="flex items-center gap-4 pt-1">
              <div className="flex items-center bg-[#F0F7FF] px-2.5 py-1 rounded-md">
                <span className="text-xs font-semibold text-[#0066FF]">{service.duration}</span>
              </div>
              <span className="text-sm font-bold text-gray-900">{currencySymbol}{service.price}</span>
            </div>
          </div>
        ))}

        {isAdding ? (
          <div className="border-2 border-[#0066FF] rounded-xl p-5 bg-blue-50/30">
            <h3 className="text-sm font-bold text-gray-900 mb-4">Add New Service</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Service Name</label>
                <input 
                  type="text" 
                  value={newService.title}
                  onChange={(e) => setNewService({...newService, title: e.target.value})}
                  placeholder="e.g. Teeth Whitening"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-sm"
                  autoFocus
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Description</label>
                <input 
                  type="text" 
                  value={newService.description}
                  onChange={(e) => setNewService({...newService, description: e.target.value})}
                  placeholder="e.g. Standard 60m session"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Duration</label>
                <input 
                  type="text"
                  list="duration-options"
                  value={newService.duration}
                  onChange={(e) => setNewService({...newService, duration: e.target.value})}
                  placeholder="e.g. 30 min"
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-sm bg-white"
                />
                <datalist id="duration-options">
                  <option value="15 min" />
                  <option value="30 min" />
                  <option value="45 min" />
                  <option value="60 min" />
                  <option value="1 hr 30 min" />
                </datalist>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-700 mb-1 block">Price</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">{currencySymbol}</span>
                  </div>
                  <input 
                    type="text" 
                    value={newService.price}
                    onChange={(e) => setNewService({...newService, price: e.target.value})}
                    placeholder="150"
                    className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#0066FF] text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button 
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddService}
                disabled={!newService.title}
                className="px-4 py-2 text-sm font-medium text-white bg-[#0066FF] hover:bg-[#0052cc] rounded-lg transition-colors disabled:opacity-50"
              >
                Save Service
              </button>
            </div>
          </div>
        ) : (
          <button 
            type="button" 
            onClick={() => setIsAdding(true)}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl bg-[#FAFAFB] p-6 flex flex-col items-center justify-center hover:bg-gray-50 hover:border-[#0066FF] transition-colors group"
          >
            <div className="w-10 h-10 mb-3 bg-[#F0F7FF] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0066FF" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
            </div>
            <p className="text-sm font-semibold text-[#0066FF]">{STRINGS.ONBOARDING.SERVICES.ADD_SERVICE}</p>
            <p className="text-xs text-gray-500 mt-1">{STRINGS.ONBOARDING.SERVICES.ADD_SERVICE_SUBTITLE}</p>
          </button>
        )}
      </div>

      {/* Footer Buttons */}
      <div className="pt-6 border-t border-gray-100 flex items-center justify-between">
        <button 
          type="button" 
          onClick={() => router.push('/onboarding/business')}
          className="px-6 py-2.5 rounded-lg border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.SERVICES.BACK_BTN}
        </button>
        <button 
          type="button"
          onClick={() => router.push('/onboarding/staff')} 
          className="px-8 py-2.5 rounded-lg bg-[#0066FF] text-white font-medium hover:bg-[#0052cc] transition-colors shadow-sm"
        >
          {STRINGS.ONBOARDING.SERVICES.CONTINUE_BTN}
        </button>
      </div>
    </div>
  );
}

