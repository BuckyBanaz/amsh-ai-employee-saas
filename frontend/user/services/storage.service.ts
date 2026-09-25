export const StorageService = {
  getToken: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  },
  
  setToken: (token: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', token);
    document.cookie = `access_token=${token}; path=/; max-age=604800; SameSite=Lax`;
  },
  
  removeToken: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
    document.cookie = `access_token=; path=/; max-age=0`;
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

  getBusiness: () => {
    if (typeof window === 'undefined') return null;
    const bStr = localStorage.getItem('business');
    try {
      return bStr ? JSON.parse(bStr) : null;
    } catch {
      return null;
    }
  },

  setBusiness: (business: any) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('business', JSON.stringify(business));
  },

  removeBusiness: () => {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('business');
  },

  getOnboardingStep: () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('onboarding_step') || '/onboarding/business';
  },

  setOnboardingStep: (stepPath: string) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('onboarding_step', stepPath);
    document.cookie = `amsh_onboarding_step=${encodeURIComponent(stepPath)}; path=/; max-age=604800; SameSite=Lax`;
  },

  isOnboardingCompleted: () => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('onboarding_completed') === 'true';
  },

  setOnboardingCompleted: (completed: boolean = true) => {
    if (typeof window === 'undefined') return;
    localStorage.setItem('onboarding_completed', completed ? 'true' : 'false');
    document.cookie = `amsh_onboarding_completed=${completed ? 'true' : 'false'}; path=/; max-age=604800; SameSite=Lax`;
  },
  
  clearAll: () => {
    if (typeof window === 'undefined') return;
    localStorage.clear();
    document.cookie = `access_token=; path=/; max-age=0`;
    document.cookie = `amsh_onboarding_step=; path=/; max-age=0`;
    document.cookie = `amsh_onboarding_completed=; path=/; max-age=0`;
  }
};

