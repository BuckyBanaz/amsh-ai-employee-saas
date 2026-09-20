export const StorageService = {
  getToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  },
  
  setToken: (token: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', token);
  },
  
  removeToken: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
  },
  
  getUser: () => {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    try {
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  },
  
  setUser: (user: any) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('user', JSON.stringify(user));
  },
  
  removeUser: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('user');
  },

  getBusinessId: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('business_id');
  },

  setBusinessId: (id: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('business_id', id);
  },

  removeBusinessId: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('business_id');
  },
  
  clearAll: () => {
    if (typeof window === 'undefined') return;
    localStorage.clear();
  }
};
