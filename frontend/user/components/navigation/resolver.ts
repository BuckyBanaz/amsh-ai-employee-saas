import { BusinessConfig } from '../../business/registry';
import { CAPABILITIES } from '../../business/capabilities';

export interface NavItem {
  label: string;
  href: string;
  icon: string;
}

export const resolveNavigation = (config: BusinessConfig): NavItem[] => {
  const nav: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: 'home' }
  ];

  config.capabilities.forEach((capId) => {
    const cap = CAPABILITIES[capId];
    if (cap) {
      let label = cap.label;
      
      // Override label with terminology if applicable
      if (capId === 'customers' && config.terminology.customer) {
        label = config.terminology.customer + 's';
      } else if (capId === 'staff' && config.terminology.staff) {
        label = config.terminology.staff + 's';
      } else if (capId === 'services' && config.terminology.service) {
        label = config.terminology.service + 's';
      } else if (capId === 'appointments' && config.terminology.appointment) {
        label = config.terminology.appointment + 's';
      }

      nav.push({
        label,
        href: cap.routes.list,
        icon: cap.icon,
      });
    }
  });

  nav.push({ label: 'Settings', href: '/settings', icon: 'settings' });

  return nav;
};
