export const BASE_URL = 'http://localhost:8010/api';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${BASE_URL}/auth/login`,
    REGISTER: `${BASE_URL}/auth/register`,
  },
  VOICE: {
    GET_VOICES: `${BASE_URL}/voice/voices`,
    PREVIEW: `${BASE_URL}/voice/preview`,
    LLM_MODELS: `${BASE_URL}/voice/llm-models`,
    SIMULATE: `${BASE_URL}/voice/simulate`,
    CALL_ME: `${BASE_URL}/voice/call-me`,
    TRANSCRIBE: `${BASE_URL}/voice/transcribe`,
  },
  BUSINESS: {
    CREATE: `${BASE_URL}/onboarding/businesses`,
    UPDATE: (id: string) => `${BASE_URL}/onboarding/businesses/${id}`,
    GET: (id: string) => `${BASE_URL}/onboarding/businesses/${id}`,
  },
  DASHBOARD: {
    GET_STATS: (businessId: string) => `${BASE_URL}/businesses/${businessId}/dashboard/stats`,
    GET_OVERVIEW: (businessId: string) => `${BASE_URL}/businesses/${businessId}/dashboard`,
  },
  APPOINTMENTS: {
    LIST: (businessId: string) => `${BASE_URL}/businesses/${businessId}/appointments`,
    CREATE: (businessId: string) => `${BASE_URL}/businesses/${businessId}/appointments`,
    GET: (businessId: string, id: string) => `${BASE_URL}/businesses/${businessId}/appointments/${id}`,
    UPDATE: (businessId: string, id: string) => `${BASE_URL}/businesses/${businessId}/appointments/${id}`,
    DELETE: (businessId: string, id: string) => `${BASE_URL}/businesses/${businessId}/appointments/${id}`,
  },
  CALLS: {
    LIST: (businessId: string) => `${BASE_URL}/businesses/${businessId}/calls`,
    GET: (businessId: string, id: string) => `${BASE_URL}/businesses/${businessId}/calls/${id}`,
    RECORDING: (businessId: string, id: string) => `${BASE_URL}/businesses/${businessId}/calls/${id}/recording`,
    END: (businessId: string, id: string) => `${BASE_URL}/businesses/${businessId}/calls/${id}/end`,
  },
  CUSTOMERS: {
    LIST: (businessId: string) => `${BASE_URL}/businesses/${businessId}/customers`,
    CREATE: (businessId: string) => `${BASE_URL}/businesses/${businessId}/customers`,
  },
  SERVICES: {
    CREATE: (businessId: string) => `${BASE_URL}/businesses/${businessId}/services`,
    LIST: (businessId: string) => `${BASE_URL}/businesses/${businessId}/services`,
    UPDATE: (businessId: string, id: string) => `${BASE_URL}/businesses/${businessId}/services/${id}`,
    DELETE: (businessId: string, id: string) => `${BASE_URL}/businesses/${businessId}/services/${id}`,
  },
  STAFF: {
    CREATE: (businessId: string) => `${BASE_URL}/businesses/${businessId}/staff`,
    LIST: (businessId: string) => `${BASE_URL}/businesses/${businessId}/staff`,
    UPDATE: (businessId: string, id: string) => `${BASE_URL}/businesses/${businessId}/staff/${id}`,
    DELETE: (businessId: string, id: string) => `${BASE_URL}/businesses/${businessId}/staff/${id}`,
  },
  AGENTS: {
    CREATE: (businessId: string) => `${BASE_URL}/onboarding/businesses/${businessId}/agents`,
    GET: (businessId: string) => `${BASE_URL}/businesses/${businessId}/agent`,
    UPDATE: (businessId: string) => `${BASE_URL}/businesses/${businessId}/agent`,
  },
  KNOWLEDGE: {
    CREATE: (businessId: string) => `${BASE_URL}/onboarding/businesses/${businessId}/knowledge`,
    LIST: (businessId: string) => `${BASE_URL}/onboarding/businesses/${businessId}/knowledge`,
    UPLOAD_FILE: (businessId: string) => `${BASE_URL}/onboarding/businesses/${businessId}/knowledge/upload-file`,
    SYNC_URL: (businessId: string) => `${BASE_URL}/onboarding/businesses/${businessId}/knowledge/sync-url`,
    QUERY: (businessId: string) => `${BASE_URL}/onboarding/businesses/${businessId}/knowledge/query`,
    DELETE: (businessId: string, id: string) => `${BASE_URL}/onboarding/businesses/${businessId}/knowledge/${id}`,
  },
  INTEGRATIONS: {
    LIST: (businessId: string) => `${BASE_URL}/onboarding/businesses/${businessId}/integrations`,
    CONNECT: (businessId: string, provider: string) => `${BASE_URL}/onboarding/businesses/${businessId}/integrations/${provider}/connect`,
    WHATSAPP_EMBEDDED_SIGNUP: (businessId: string) => `${BASE_URL}/onboarding/businesses/${businessId}/integrations/whatsapp/embedded-signup`,
    WHATSAPP_TEST_MESSAGE: (businessId: string) => `${BASE_URL}/onboarding/businesses/${businessId}/integrations/whatsapp/test-message`,
  },
  BILLING: {
    CONFIG: `${BASE_URL}/billing/config`,
    CREATE_ORDER: `${BASE_URL}/billing/razorpay/create-order`,
    VERIFY: `${BASE_URL}/billing/razorpay/verify`,
    GET_BUSINESS_BILLING: (businessId: string) => `${BASE_URL}/billing/businesses/${businessId}`,
  }
};
