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
  },

  listKnowledge: async (businessId: string, docType?: string) => {
    try {
      const url = docType
        ? `${API_ENDPOINTS.KNOWLEDGE.LIST(businessId)}?doc_type=${docType}`
        : API_ENDPOINTS.KNOWLEDGE.LIST(businessId);
      return await ApiService.get<any[]>(url, { requireAuth: true });
    } catch (error) {
      console.error('List knowledge error:', error);
      return [];
    }
  },

  uploadKnowledgeFile: async (businessId: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

      const response = await fetch(API_ENDPOINTS.KNOWLEDGE.UPLOAD_FILE(businessId), {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload file');
      }
      return await response.json();
    } catch (error) {
      console.error('Upload knowledge file error:', error);
      throw error;
    }
  },

  syncKnowledgeUrl: async (businessId: string, sourceUrl: string) => {
    try {
      return await ApiService.post<any>(
        API_ENDPOINTS.KNOWLEDGE.SYNC_URL(businessId),
        { source_url: sourceUrl },
        { requireAuth: true }
      );
    } catch (error) {
      console.error('Sync knowledge URL error:', error);
      throw error;
    }
  },

  deleteKnowledge: async (businessId: string, entryId: string) => {
    try {
      return await ApiService.delete<any>(
        API_ENDPOINTS.KNOWLEDGE.DELETE(businessId, entryId),
        { requireAuth: true }
      );
    } catch (error) {
      console.error('Delete knowledge error:', error);
      throw error;
    }
  }
};
