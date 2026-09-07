export type BusinessType = 'clinic' | 'restaurant' | 'ecommerce' | 'retail' | 'salon' | 'realEstate' | 'gym' | 'hotel' | 'serviceCenter';

export interface BusinessConfig {
  type: BusinessType;
  terminology: Record<string, string>;
  capabilities: string[];
}

import { clinicConfig } from '../../verticals/clinic/config';

export const businessRegistry: Record<string, BusinessConfig> = {
  clinic: clinicConfig,
  // Add more as needed...
};

export const getBusinessConfig = (type: BusinessType): BusinessConfig => {
  return businessRegistry[type] || clinicConfig;
};
