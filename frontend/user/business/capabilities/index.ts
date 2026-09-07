export interface Capability {
  id: string;
  label: string;
  icon: string;
  routes: {
    list: string;
    create?: string;
  };
}

export const CAPABILITIES: Record<string, Capability> = {
  appointments: {
    id: 'appointments',
    label: 'Appointments',
    icon: 'calendar',
    routes: { list: '/appointments', create: '/appointments/new' },
  },
  customers: {
    id: 'customers',
    label: 'Customers',
    icon: 'users',
    routes: { list: '/customers', create: '/customers/new' },
  },
  staff: {
    id: 'staff',
    label: 'Staff',
    icon: 'briefcase',
    routes: { list: '/staff', create: '/staff/new' },
  },
  services: {
    id: 'services',
    label: 'Services',
    icon: 'list',
    routes: { list: '/services', create: '/services/new' },
  },
  calls: {
    id: 'calls',
    label: 'Call Logs',
    icon: 'phone',
    routes: { list: '/calls' },
  },
  ai_receptionist: {
    id: 'ai_receptionist',
    label: 'AI Receptionist',
    icon: 'bot',
    routes: { list: '/ai' },
  },
  knowledge_base: {
    id: 'knowledge_base',
    label: 'Knowledge Base',
    icon: 'book',
    routes: { list: '/knowledge' },
  },
  analytics: {
    id: 'analytics',
    label: 'Analytics',
    icon: 'bar-chart',
    routes: { list: '/analytics' },
  },
  integrations: {
    id: 'integrations',
    label: 'Integrations',
    icon: 'plug',
    routes: { list: '/integrations' },
  },
};
