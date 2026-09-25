import { StorageService } from './storage.service';

interface ApiOptions extends RequestInit {
  requireAuth?: boolean;
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
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
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
          // Handle unauthorized (e.g. redirect to login, clear token)
          StorageService.removeToken();
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
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
    } catch (error) {
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
