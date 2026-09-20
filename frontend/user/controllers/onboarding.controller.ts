import { API_ENDPOINTS } from '../utils/api_endpoints';
import { ApiService } from '../services/api.service';

export const OnboardingController = {
  fetchVoices: async () => {
    try {
      const response = await ApiService.get<any>(
        API_ENDPOINTS.VOICE.GET_VOICES,
        { requireAuth: false } // We can make this true if voices API needs auth
      );
      
      return response;
    } catch (error) {
      console.error('Fetch voices error:', error);
      throw error;
    }
  },
  
  createBusiness: async (businessData: any) => {
    try {
      const response = await ApiService.post<any>(
        API_ENDPOINTS.BUSINESS.CREATE,
        businessData,
        { requireAuth: true }
      );
      return response;
    } catch (error) {
      console.error('Create business error:', error);
      throw error;
    }
  },

  updateBusiness: async (id: string, businessData: any) => {
    try {
      const response = await ApiService.put<any>(
        API_ENDPOINTS.BUSINESS.UPDATE(id),
        businessData,
        { requireAuth: true }
      );
      return response;
    } catch (error) {
      console.error('Update business error:', error);
      throw error;
    }
  },

  createService: async (businessId: string, serviceData: any) => {
    try {
      const response = await ApiService.post<any>(
        API_ENDPOINTS.SERVICES.CREATE(businessId),
        serviceData,
        { requireAuth: true }
      );
      return response;
    } catch (error) {
      console.error('Create service error:', error);
      throw error;
    }
  },

  createStaff: async (businessId: string, staffData: any) => {
    try {
      const response = await ApiService.post<any>(
        API_ENDPOINTS.STAFF.CREATE(businessId),
        staffData,
        { requireAuth: true }
      );
      return response;
    } catch (error) {
      console.error('Create staff error:', error);
      throw error;
    }
  },

  createAgent: async (businessId: string, agentData: any) => {
    try {
      const response = await ApiService.post<any>(
        API_ENDPOINTS.AGENTS.CREATE(businessId),
        agentData,
        { requireAuth: true }
      );
      return response;
    } catch (error) {
      console.error('Create agent error:', error);
      throw error;
    }
  },

  createKnowledge: async (businessId: string, knowledgeData: any) => {
    try {
      const response = await ApiService.post<any>(
        API_ENDPOINTS.KNOWLEDGE.CREATE(businessId),
        knowledgeData,
        { requireAuth: true }
      );
      return response;
    } catch (error) {
      console.error('Create knowledge error:', error);
      throw error;
    }
  }
};
