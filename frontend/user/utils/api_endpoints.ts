export const BASE_URL = 'http://127.0.0.1:8010/api';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: `${BASE_URL}/auth/login`,
    REGISTER: `${BASE_URL}/auth/register`,
  },
  VOICE: {
    GET_VOICES: `${BASE_URL}/voice/voices`,
    PREVIEW: `${BASE_URL}/voice/preview`,
  },
  BUSINESS: {
    CREATE: `${BASE_URL}/onboarding/businesses`,
    UPDATE: (id: string) => `${BASE_URL}/onboarding/businesses/${id}`,
    GET: (id: string) => `${BASE_URL}/onboarding/businesses/${id}`,
  },
  SERVICES: {
    CREATE: (businessId: string) => `${BASE_URL}/onboarding/businesses/${businessId}/services`,
  },
  STAFF: {
    CREATE: (businessId: string) => `${BASE_URL}/onboarding/businesses/${businessId}/staff`,
  },
  AGENTS: {
    CREATE: (businessId: string) => `${BASE_URL}/onboarding/businesses/${businessId}/agents`,
  },
  KNOWLEDGE: {
    CREATE: (businessId: string) => `${BASE_URL}/onboarding/businesses/${businessId}/knowledge`,
  }
};
