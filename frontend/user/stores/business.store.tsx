"use client";
import React, { createContext, useContext, useState } from 'react';
import { BusinessType, getBusinessConfig, BusinessConfig } from '../business/registry';

interface BusinessState {
  type: BusinessType;
  config: BusinessConfig;
  setType: (type: BusinessType) => void;
}

const BusinessContext = createContext<BusinessState | undefined>(undefined);

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const [type, setTypeState] = useState<BusinessType>('clinic');
  const config = getBusinessConfig(type);

  return (
    <BusinessContext.Provider value={{ type, config, setType: setTypeState }}>
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusinessStore() {
  const context = useContext(BusinessContext);
  if (!context) throw new Error('useBusinessStore must be used within BusinessProvider');
  return context;
}
