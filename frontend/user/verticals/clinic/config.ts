export const clinicConfig = {
  type: "clinic" as const,

  terminology: {
    customer: "Patient",
    staff: "Doctor",
    service: "Treatment",
    appointment: "Appointment",
  },

  capabilities: [
    "appointments",
    "customers",
    "staff",
    "services",
    "calls",
    "ai_receptionist",
    "knowledge_base",
    "analytics",
    "integrations",
  ],
};
