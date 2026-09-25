import { API_ENDPOINTS } from '../utils/api_endpoints';
import { ApiService } from '../services/api.service';
import { StorageService } from '../services/storage.service';

export const AuthController = {
  login: async (email: string, password: string) => {
    try {
      const response = await ApiService.post<any>(
        API_ENDPOINTS.AUTH.LOGIN, 
        { email, password },
        { requireAuth: false }
      );
      
      if (response.access_token) {
        StorageService.setToken(response.access_token);
        if (response.user) {
          StorageService.setUser(response.user);
          if (response.user.business_id) {
            StorageService.setBusinessId(response.user.business_id);
            StorageService.setOnboardingCompleted(true);
          }
        }
      }
      return response;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },
  
  register: async (name: string, email: string, password: string) => {
    try {
      const response = await ApiService.post<any>(
        API_ENDPOINTS.AUTH.REGISTER, 
        { name, email, password },
        { requireAuth: false }
      );
      
      if (response.access_token) {
        StorageService.setToken(response.access_token);
        if (response.user) {
          StorageService.setUser(response.user);
        }
      }
      return response;
    } catch (error) {
      console.error('Register error:', error);
      throw error;
    }
  },
  
  logout: () => {
    StorageService.clearAll();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
};
