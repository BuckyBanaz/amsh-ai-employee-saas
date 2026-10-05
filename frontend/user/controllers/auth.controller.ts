import { API_ENDPOINTS } from '../utils/api_endpoints';
import { ApiService } from '../services/api.service';
import { StorageService } from '../services/storage.service';

export const AuthController = {
  /** Sends a reset link. The server answers the same whether or not the email has an account. */
  forgotPassword: (email: string) =>
    ApiService.post<{ ok: boolean; message: string }>(API_ENDPOINTS.AUTH.FORGOT_PASSWORD, { email }, { requireAuth: false }),

  resetPassword: (token: string, password: string) =>
    ApiService.post<{ ok: boolean }>(API_ENDPOINTS.AUTH.RESET_PASSWORD, { token, password }, { requireAuth: false }),

  verifyEmail: (token: string) =>
    ApiService.post<{ ok: boolean }>(API_ENDPOINTS.AUTH.VERIFY_EMAIL, { token }, { requireAuth: false }),

  sendVerification: () => ApiService.post<{ ok: boolean; already_verified?: boolean }>(API_ENDPOINTS.AUTH.SEND_VERIFICATION, {}),

  /** Other devices are signed out by the server; this one gets a fresh token so it stays signed in. */
  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await ApiService.post<{ ok: boolean; access_token?: string }>(API_ENDPOINTS.AUTH.CHANGE_PASSWORD, {
      current_password: currentPassword,
      new_password: newPassword,
    });
    if (res.access_token) StorageService.setToken(res.access_token);
    return res;
  },

  /** Sign out everywhere: every existing login of this account stops working; this device continues with a fresh token. */
  logoutAll: async () => {
    const res = await ApiService.post<{ access_token: string }>(API_ENDPOINTS.AUTH.LOGOUT_ALL, {});
    if (res.access_token) StorageService.setToken(res.access_token);
    return res;
  },

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
  
  register: async (name: string, email: string, password: string, acceptTerms = true) => {
    try {
      const response = await ApiService.post<any>(
        API_ENDPOINTS.AUTH.REGISTER, 
        { name, email, password, accept_terms: acceptTerms },
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
