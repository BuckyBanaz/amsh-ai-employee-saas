import { StorageService } from './storage.service';

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
}

let isRedirectingToLogin = false;

function handleSessionExpired() {
  if (isRedirectingToLogin) return;
  isRedirectingToLogin = true;
  StorageService.clearAll();
  if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    const current = window.location.pathname;
    window.location.href = `/login?expired=1&redirect=${encodeURIComponent(current)}`;
  }
}

function isTokenExpired(token: string): boolean {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (payload.exp && typeof payload.exp === 'number') {
      // If token expires within 5 seconds, treat as expired
      return payload.exp * 1000 <= Date.now() + 5000;
    }
    return false;
  } catch {
    return false;
  }
}

export const ApiService = {
  async request<T>(url: string, options: ApiOptions = {}): Promise<T> {
    const { requireAuth = true, headers: customHeaders, ...restOptions } = options;
    
    const headers = new Headers(customHeaders);
    if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
      headers.set('Content-Type', 'application/json');
    }
    
    if (requireAuth) {
      const token = StorageService.getToken();
      if (!token) {
        handleSessionExpired();
        throw new Error('Session expired. Redirecting to login...');
      }

      if (isTokenExpired(token)) {
        handleSessionExpired();
        throw new Error('Session expired. Redirecting to login...');
      }

      headers.set('Authorization', `Bearer ${token}`);
    }
    
    try {
      const response = await fetch(url, {
        ...restOptions,
        headers,
      });
      
      const isJson = response.headers.get('content-type')?.includes('application/json');
      const data = isJson ? await response.json() : await response.text();
      
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired or invalid on server: clear all session storage and redirect to login
          handleSessionExpired();
          throw new Error('Session expired. Redirecting to login...');
        }
        let errorMessage = 'API request failed';
        if (typeof data?.detail === 'string') {
          errorMessage = data.detail;
        } else if (Array.isArray(data?.detail)) {
          errorMessage = data.detail.map((err: any) => err.msg || JSON.stringify(err)).join(', ');
        } else if (typeof data?.detail === 'object' && data?.detail !== null) {
          errorMessage = JSON.stringify(data.detail);
        } else if (data?.message) {
          errorMessage = data.message;
        }
        throw new Error(errorMessage);
      }
      
      return data as T;
    } catch (error: any) {
      if (error?.message?.includes('Session expired')) {
        throw error;
      }
      console.error(`[API Error] ${url}:`, error);
      throw error;
    }
  },
  
  get<T>(url: string, options?: ApiOptions) {
    return this.request<T>(url, { ...options, method: 'GET' });
  },
  
  post<T>(url: string, body: any, options?: ApiOptions) {
    return this.request<T>(url, { 
      ...options, 
      method: 'POST',
      body: JSON.stringify(body)
    });
  },
  
  put<T>(url: string, body: any, options?: ApiOptions) {
    return this.request<T>(url, { 
      ...options, 
      method: 'PUT',
      body: JSON.stringify(body)
    });
  },

  patch<T>(url: string, body: any, options?: ApiOptions) {
    return this.request<T>(url, { 
      ...options, 
      method: 'PATCH',
      body: JSON.stringify(body)
    });
  },
  
  delete<T>(url: string, options?: ApiOptions) {
    return this.request<T>(url, { ...options, method: 'DELETE' });
  }
};
