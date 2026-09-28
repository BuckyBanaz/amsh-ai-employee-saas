/** Admin portal API client. The token lives in localStorage; 401 signs the admin out. */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010/api';

const TOKEN_KEY = 'amsh_admin_token';
const USER_KEY = 'amsh_admin_user';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  scope: string;
}

const canUseStorage = () => typeof window !== 'undefined';

const sessionListeners = new Set<() => void>();
const notifySession = () => sessionListeners.forEach((l) => l());

/** For useSyncExternalStore: re-render when the session is saved, cleared, or changed in another tab. */
export function subscribeSession(callback: () => void): () => void {
  sessionListeners.add(callback);
  window.addEventListener('storage', callback);
  return () => {
    sessionListeners.delete(callback);
    window.removeEventListener('storage', callback);
  };
}

/** The raw stored admin (a JSON string) or null. A string keeps the snapshot stable between renders. */
export function getUserSnapshot(): string | null {
  try {
    return window.localStorage.getItem(USER_KEY);
  } catch {
    return null;
  }
}

export const adminAuth = {
  getToken(): string | null {
    try {
      return canUseStorage() ? window.localStorage.getItem(TOKEN_KEY) : null;
    } catch {
      return null;
    }
  },
  getUser(): AdminUser | null {
    try {
      const raw = canUseStorage() ? window.localStorage.getItem(USER_KEY) : null;
      return raw ? (JSON.parse(raw) as AdminUser) : null;
    } catch {
      return null;
    }
  },
  setSession(token: string, user: AdminUser) {
    try {
      window.localStorage.setItem(TOKEN_KEY, token);
      window.localStorage.setItem(USER_KEY, JSON.stringify(user));
    } catch {
      /* storage blocked: the session just will not persist across reloads */
    }
    notifySession();
  },
  clear() {
    try {
      window.localStorage.removeItem(TOKEN_KEY);
      window.localStorage.removeItem(USER_KEY);
    } catch {
      /* nothing to clear */
    }
    notifySession();
  },
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

/** FastAPI errors: `detail` is a string, or a list of validation problems. */
function readableError(body: unknown, fallback: string): string {
  const detail = (body as { detail?: unknown } | null)?.detail;
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((d) => (d && typeof d === 'object' && 'msg' in d ? String((d as { msg: unknown }).msg) : '')).filter(Boolean).join('; ') || fallback;
  }
  return fallback;
}

export async function adminFetch<T>(path: string, options: RequestInit & { auth?: boolean } = {}): Promise<T> {
  const { auth = true, headers, ...rest } = options;
  const finalHeaders = new Headers(headers);
  if (rest.body && !finalHeaders.has('Content-Type')) finalHeaders.set('Content-Type', 'application/json');
  const token = adminAuth.getToken();
  if (auth && token) finalHeaders.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, { ...rest, headers: finalHeaders });
  } catch {
    throw new ApiError('Cannot reach the server. Check that the API is running.', 0);
  }
  const isJson = response.headers.get('content-type')?.includes('application/json');
  const body = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    if (response.status === 401 && auth && token) {
      adminAuth.clear();
      if (canUseStorage()) window.location.href = '/login'; // full reload: drops all in-memory state of the expired session
    }
    throw new ApiError(readableError(body, `Request failed (${response.status})`), response.status);
  }
  return body as T;
}

// ---- Tenants (businesses) ------------------------------------------------------------------------------------------

export interface TenantItem {
  id: string;
  name: string;
  type: string;
  owner_name: string | null;
  owner_email: string | null;
  country: string | null;
  ai_receptionist: string | null;
  plan: string;
  status: string;
  created_at: string | null;
  users_count: number;
  calls_30d: number;
  minutes_30d: number;
}

export interface TenantList {
  items: TenantItem[];
  total: number;
  facets: { countries: string[]; plans: string[]; statuses: string[]; types: string[] };
}

export function fetchTenants(params: { search?: string; status?: string; plan?: string; country?: string; type?: string }): Promise<TenantList> {
  const query = new URLSearchParams({ limit: '200' });
  for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
  return adminFetch<TenantList>(`/admin/tenants?${query.toString()}`);
}

export function updateTenant(id: string, body: { status?: string; plan?: string }): Promise<{ id: string; status: string; plan: string }> {
  return adminFetch(`/admin/tenants/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
}

// ---- Plans -------------------------------------------------------------------------------------------------------------

export interface PlanApi {
  id: string;
  key: string;
  name: string;
  description: string | null;
  kind: 'catalog' | 'enterprise';
  client: string | null;
  price: number;
  cycle: 'monthly' | 'yearly';
  price_yearly: number | null;
  currency: string;
  custom_pricing: boolean;
  status: 'draft' | 'active' | 'archived';
  highlighted: boolean;
  sort_order: number;
  quotas: Record<string, number | null>;
  overage: Record<string, number>;
  features: string[];
  subscribers: number;
}

export type PlanBody = Partial<Omit<PlanApi, 'id' | 'subscribers'>>;

export const fetchPlans = () => adminFetch<{ items: PlanApi[] }>('/admin/plans');
export const createPlan = (body: PlanBody) => adminFetch<PlanApi>('/admin/plans', { method: 'POST', body: JSON.stringify(body) });
export const updatePlan = (id: string, body: PlanBody) =>
  adminFetch<PlanApi>(`/admin/plans/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
export const deletePlan = (id: string) => adminFetch<void>(`/admin/plans/${encodeURIComponent(id)}`, { method: 'DELETE' });

// ---- One business (detail page) ----------------------------------------------------------------------------------------

export interface TenantDetail extends TenantItem {
  phone: string | null;
  email: string | null;
  website: string | null;
  address: string | null;
  city: string | null;
  timezone: string;
  agents: { id: string; name: string; status: string; created_at: string | null }[];
  totals: { calls: number; appointments: number };
  last_call_at: string | null;
}

export const fetchTenant = (id: string) => adminFetch<TenantDetail>(`/admin/tenants/${encodeURIComponent(id)}`);

export const fetchTenantSection = <T>(id: string, section: string) =>
  adminFetch<{ items: T[] }>(`/admin/tenants/${encodeURIComponent(id)}/${section}`);
