/** Admin portal API client. The token lives in localStorage; 401 signs the admin out. */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8010/api';

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
    return detail.map((d: unknown) => (d && typeof d === 'object' && 'msg' in d ? String((d as { msg: unknown }).msg) : '')).filter(Boolean).join('; ') || fallback;
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

// ---- Services ----------------------------------------------------------------------------------------------------------

export interface AdminServiceItem {
  id: string;
  name: string;
  category: string;
  businessId: string;
  businessName: string;
  businessType: string;
  duration: string;
  price: string;
  currency: string;
  status: 'Active' | 'Inactive';
  restriction: string;
  country: string;
  toolCallMapping: string;
  depositRequired: boolean;
}

export function fetchAdminServices(): Promise<{ items: AdminServiceItem[] }> {
  return adminFetch<{ items: AdminServiceItem[] }>('/admin/services');
}

// ---- Dashboard overview ------------------------------------------------------------------------------------------------

export interface Overview {
  generated_at: string;
  tenants: { total: number; active: number; pending: number; paused: number; suspended: number; new_7d: number; with_ai: number };
  calls: { last_24h: number; previous_24h: number; last_30d: number; minutes_30d: number; resolution_rate_30d: number | null; resolution_sample: number };
  appointments: { booked_24h: number; previous_24h: number; booked_30d: number };
  revenue: { monthly_estimate: Record<string, number>; paying_businesses: number; basis: string };
  top_businesses: {
    id: string; name: string; type: string; country: string | null; ai_status: string | null; ai_name: string | null;
    calls_30d: number; appointments_30d: number; plan: string; status: string;
  }[];
  recent_activity: { at: string | null; action: string; actor: string | null; outcome: string }[];
  health: { name: string; status: 'operational' | 'degraded' | 'not_configured'; detail: string }[];
}

export const fetchOverview = () => adminFetch<Overview>('/admin/overview');

// ---- Calls (Cross-Tenant Platform Monitoring) --------------------------------------------------------------------------

export interface AdminCallMessage {
  speaker: 'AI' | 'User';
  text: string;
  sentiment?: 'Positive' | 'Neutral' | 'Negative';
}

export interface AdminCallRecord {
  id: string;
  businessId: string;
  businessName: string;
  businessType: string;
  callerNumber: string;
  callerName?: string;
  time: string;
  startedAt: string | null;
  duration: string;
  durationSeconds: number;
  intent: string;
  outcome: 'Resolved' | 'Transferred' | 'Failed' | 'Live';
  outcomeColor: { bg: string; text: string };
  aiReceptionist: string;
  engine: string;
  latency: string;
  summary: string;
  recordingUrl?: string | null;
  transcript: AdminCallMessage[];
}

export interface AdminCallsKpi {
  callsToday: number;
  callsTodayDelta: string;
  averageDuration: string;
  averageDurationDelta: string;
  aiResolutionRate: string;
  aiResolutionDelta: string;
  transferredCount: number;
  transferredPercent: string;
  failedCount: number;
  failedDelta: string;
}

export interface AdminCallsResponse {
  items: AdminCallRecord[];
  total: number;
  kpis: AdminCallsKpi;
  facets: {
    businesses: string[];
    types: string[];
    outcomes: string[];
    intents: string[];
  };
}

export function fetchAdminCalls(params?: {
  search?: string;
  business?: string;
  outcome?: string;
  intent?: string;
  type?: string;
  limit?: number;
}): Promise<AdminCallsResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.business && params.business !== 'All') query.set('business_name', params.business);
  if (params?.outcome && params.outcome !== 'All') query.set('outcome', params.outcome);
  if (params?.intent && params.intent !== 'All') query.set('intent', params.intent);
  if (params?.type && params.type !== 'All') query.set('business_type', params.type);
  if (params?.limit) query.set('limit', String(params.limit));
  return adminFetch<AdminCallsResponse>(`/admin/calls?${query.toString()}`);
}

// ---- Business Users --------------------------------------------------------------------------------------------------

export interface BusinessUserItem {
  id: string;
  name: string;
  email: string;
  business: string;
  businessId: string | null;
  businessType: string;
  role: string;
  status: 'Active' | 'Suspended';
  lastActive: string;
  emailVerified: boolean;
  createdAt: string | null;
}

export interface BusinessUsersKpis {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  ownersCount: number;
  businessesCount: number;
}

export interface BusinessUsersResponse {
  items: BusinessUserItem[];
  total: number;
  kpis: BusinessUsersKpis;
  facets: {
    businesses: string[];
    roles: string[];
    types: string[];
    statuses: string[];
  };
}

export function fetchBusinessUsers(params?: {
  search?: string;
  role?: string;
  status?: string;
  business_id?: string;
}): Promise<BusinessUsersResponse> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.role && params.role !== 'All') query.set('role', params.role);
  if (params?.status && params.status !== 'All') query.set('status', params.status);
  if (params?.business_id && params.business_id !== 'All') query.set('business_id', params.business_id);
  return adminFetch<BusinessUsersResponse>(`/admin/business-users?${query.toString()}`);
}

export interface BusinessUserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Active' | 'Suspended';
  is_active: boolean;
  emailVerified: boolean;
  createdAt: string | null;
  lastActive: string;
  associatedBusinesses: {
    id: string;
    name: string;
    type: string;
    country: string;
    aiReceptionist: string;
    plan: string;
    status: string;
    roleInBusiness: string;
    appointmentsToday: number;
    callsToday: number;
  }[];
  activityLogs: {
    id: string;
    action: string;
    target: string;
    time: string;
    ip: string;
    outcome: string;
  }[];
}

export function fetchBusinessUser(userId: string): Promise<BusinessUserDetail> {
  return adminFetch<BusinessUserDetail>(`/admin/business-users/${encodeURIComponent(userId)}`);
}

export function updateBusinessUser(
  userId: string,
  body: { is_active?: boolean; role?: string }
): Promise<{ id: string; status: string; is_active: boolean; role: string }> {
  return adminFetch(`/admin/business-users/${encodeURIComponent(userId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function inviteBusinessUser(body: { business_id: string; name: string; email: string; role: string; password?: string }) {
  return adminFetch('/admin/business-users/invite', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

// ---- Receptionists ---------------------------------------------------------------------------------------------------

export interface AdminReceptionistItem {
  id: string;
  name: string;
  status: 'Active' | 'Paused' | 'Testing';
  businessId: string;
  businessName: string;
  businessType: string;
  voiceProvider: string;
  voiceModel: string;
  primaryLanguage: string;
  languages: string[];
  engine?: string;
  greeting: string;
  aiNumber: string;
  forwardedFrom: string;
  callsHandled: number;
  resolutionRate: number | null;
  lastCallAt: string | null;
  createdAt: string | null;
}

export interface ReceptionistsKpis {
  totalAgents: number;
  activeAgents: number;
  pausedAgents: number;
  liveCalls: number;
  callsToday: number;
  avgResolutionRate: number;
}

export interface ReceptionistsResponse {
  items: AdminReceptionistItem[];
  total: number;
  kpis: ReceptionistsKpis;
  facets: {
    businesses: string[];
    types: string[];
    providers: string[];
    statuses: string[];
  };
}

export function fetchAdminReceptionists(search?: string): Promise<ReceptionistsResponse> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return adminFetch<ReceptionistsResponse>(`/admin/receptionists${query}`);
}

export function updateAdminReceptionist(
  agentId: string,
  body: {
    status?: 'active' | 'paused' | 'testing';
    name?: string;
    greeting?: string;
    voice_provider?: string;
    voice_model?: string;
    primary_language?: string;
    languages?: string[];
  }
) {
  return adminFetch(`/admin/receptionists/${encodeURIComponent(agentId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  });
}

export function createAdminReceptionist(body: {
  business_id: string;
  name: string;
  voice_provider?: string;
  voice_model?: string;
  primary_language?: string;
  languages?: string[];
  greeting?: string;
  status?: string;
}) {
  return adminFetch('/admin/receptionists', {
    method: 'POST',
    body: JSON.stringify(body),
  });
}

export function deleteAdminReceptionist(agentId: string) {
  return adminFetch(`/admin/receptionists/${encodeURIComponent(agentId)}`, {
    method: 'DELETE',
  });
}


// ---- SEO -----------------------------------------------------------------------------------------------------------

export interface SeoGlobal {
  site_name: string;
  site_url: string;
  title_template: string;
  default_title: string;
  default_description: string;
  default_og_image: string;
  twitter_handle: string;
  locale: string;
  index_site: boolean;
  disallow_paths: string[];
  verification: { google: string; bing: string };
  analytics: { ga4_id: string; gtm_id: string };
  organization: { name: string; logo_url: string; phone: string; email: string; same_as: string[] };
}

export interface SeoPage {
  path: string;
  title?: string;
  description?: string;
  og_image?: string;
  canonical?: string;
  noindex?: boolean;
  changefreq?: string;
  priority?: number;
}

export interface SeoEffective {
  path: string;
  title: string;
  full_title: string;
  description: string;
  og_image: string;
  canonical: string;
  noindex: boolean;
}

export interface SeoIssue {
  level: 'error' | 'warning' | 'info';
  where: string;
  message: string;
}

export interface SeoOverview {
  global: SeoGlobal;
  pages: Record<string, SeoPage>;
  updated_at: string | null;
  known_pages: { path: string; label: string; index: boolean }[];
  changefreq: string[];
  limits: { title: [number, number]; description: [number, number] };
  effective: Record<string, SeoEffective>;
  health: { score: number; issues: SeoIssue[] };
  previews: { robots_txt: string; sitemap_urls: { loc: string; changefreq: string; priority: number }[]; json_ld: Record<string, unknown> | null };
}

export const fetchSeo = () => adminFetch<SeoOverview>('/admin/seo');
export const saveSeoGlobal = (body: SeoGlobal) => adminFetch<SeoOverview>('/admin/seo/global', { method: 'PUT', body: JSON.stringify(body) });
export const saveSeoPage = (body: SeoPage) => adminFetch<SeoOverview>('/admin/seo/pages', { method: 'PUT', body: JSON.stringify(body) });
export const deleteSeoPage = (path: string) => adminFetch<SeoOverview>(`/admin/seo/pages?path=${encodeURIComponent(path)}`, { method: 'DELETE' });

// ---- Audit and security --------------------------------------------------------------------------------------------

export interface AuditEntry {
  id: string;
  created_at: string | null;
  actor_email: string | null;
  business_id: string | null;
  business_name: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  outcome: string;
  ip: string | null;
  meta: Record<string, unknown>;
}

export interface AuditList {
  items: AuditEntry[];
  total: number;
  limit: number;
  offset: number;
  facets: { actions: string[]; outcomes: string[] };
}

export interface AuditQuery {
  action?: string;
  outcome?: string;
  actor?: string;
  q?: string;
  since?: string;
  limit?: number;
  offset?: number;
}

function queryString(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') query.set(key, String(value));
  const text = query.toString();
  return text ? `?${text}` : '';
}

export const fetchAudit = (params: AuditQuery) => adminFetch<AuditList>(`/admin/audit${queryString({ ...params })}`);

/** Downloads the audit log as CSV with the admin's token (a plain link cannot send it). */
export async function downloadAuditCsv(params: AuditQuery): Promise<void> {
  const token = adminAuth.getToken();
  const res = await fetch(`${API_BASE}/admin/audit/export.csv${queryString({ ...params, limit: undefined, offset: undefined })}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new ApiError(`Export failed (${res.status})`, res.status);
  const url = URL.createObjectURL(await res.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = 'amsh-audit-log.csv';
  link.click();
  URL.revokeObjectURL(url);
}

export interface SecurityOverview {
  counters: Record<string, number>;
  top_ips: { ip: string; failures: number }[];
  top_accounts: { email: string; failures: number }[];
  admins: { id: string; name: string; email: string; role: string; active: boolean; verified: boolean; last_active_at: string | null }[];
  checks: { key: string; label: string; ok: boolean; fix: string }[];
  problems: string[];
  policy: { login_max_failures: number; token_lifetime_minutes: number; cors_origins: string[]; environment: string };
}

export const fetchSecurity = () => adminFetch<SecurityOverview>('/admin/security');

// ---- Staff accounts ------------------------------------------------------------------------------------------------

export interface StaffAccount {
  id: string;
  name: string;
  email: string;
  role: string;
  active: boolean;
  verified: boolean;
  last_active_at: string | null;
  created_at: string | null;
}

export const fetchStaff = () => adminFetch<{ items: StaffAccount[]; roles: string[]; me: string }>('/admin/admin-users');
export const createStaff = (body: { name: string; email: string; role: string }) =>
  adminFetch<StaffAccount & { setup_email_sent: boolean }>('/admin/admin-users', { method: 'POST', body: JSON.stringify(body) });
export const updateStaff = (id: string, body: { name?: string; role?: string; is_active?: boolean }) =>
  adminFetch<StaffAccount>(`/admin/admin-users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
export const sendStaffSetupLink = (id: string) => adminFetch<{ setup_email_sent: boolean }>(`/admin/admin-users/${encodeURIComponent(id)}/setup-link`, { method: 'POST' });

// ---- Support tickets -----------------------------------------------------------------------------------------------

export interface TicketMessage {
  id: string;
  author: string;
  from_staff: boolean;
  internal: boolean;
  body: string;
  created_at: string | null;
}

export interface TicketItem {
  id: string;
  number: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  business_id: string;
  business_name: string | null;
  requester: string | null;
  requester_email: string | null;
  assignee_id: string | null;
  assignee: string | null;
  created_at: string | null;
  updated_at: string | null;
  first_response_at: string | null;
  resolved_at: string | null;
  message_count: number;
  last_message: string;
  messages?: TicketMessage[];
}

export interface TicketList {
  items: TicketItem[];
  counts: Record<string, number>;
  total: number;
  staff: { id: string; name: string }[];
  options: { statuses: string[]; priorities: string[]; categories: string[] };
}

export const fetchTickets = (params: { status?: string; priority?: string; category?: string; assignee?: string; q?: string }) =>
  adminFetch<TicketList>(`/admin/tickets${queryString({ ...params })}`);
export const fetchTicket = (id: string) => adminFetch<TicketItem>(`/admin/tickets/${encodeURIComponent(id)}`);
export const patchTicket = (id: string, body: { status?: string; priority?: string; assignee_id?: string; unassign?: boolean }) =>
  adminFetch<TicketItem>(`/admin/tickets/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
export const replyTicket = (id: string, body: { body: string; internal: boolean }) =>
  adminFetch<TicketItem>(`/admin/tickets/${encodeURIComponent(id)}/messages`, { method: 'POST', body: JSON.stringify(body) });

// ---- Announcements -------------------------------------------------------------------------------------------------

export interface AnnouncementItem {
  id: string;
  title: string;
  body: string;
  level: string;
  status: string;
  plans: string[];
  business_ids: string[];
  starts_at: string | null;
  ends_at: string | null;
  published_at: string | null;
  created_at: string | null;
  live?: boolean;
}

export interface AnnouncementBody {
  title: string;
  body: string;
  level: string;
  status: string;
  plans: string[];
  business_ids: string[];
  starts_at: string | null;
  ends_at: string | null;
}

export const fetchAnnouncements = () => adminFetch<{ items: AnnouncementItem[]; levels: string[]; statuses: string[] }>('/admin/announcements');
export const createAnnouncement = (body: AnnouncementBody) => adminFetch<AnnouncementItem>('/admin/announcements', { method: 'POST', body: JSON.stringify(body) });
export const updateAnnouncement = (id: string, body: AnnouncementBody) =>
  adminFetch<AnnouncementItem>(`/admin/announcements/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(body) });
export const deleteAnnouncement = (id: string) => adminFetch<void>(`/admin/announcements/${encodeURIComponent(id)}`, { method: 'DELETE' });

// ---- Verticals -----------------------------------------------------------------------------------------------------

export interface VerticalItem {
  name: string;
  description: string;
  languages: Record<string, { display_name: string; version: string; intents: number }>;
  tools: string[];
  intents: string[];
  terminology: Record<string, string>;
  businesses: number;
  status: string;
}

export interface VerticalDetail {
  name: string;
  language: string;
  version: string;
  display_name: string;
  description: string;
  terminology: Record<string, string>;
  greeting_template: string;
  system_prompt_template: string;
  default_tools: string[];
  intents: { name: string; description: string; tool: string | null; confirmation_required: boolean; slots: { name: string; type: string; required: boolean }[] }[];
  escalation_rules: { keywords: string[]; action: string; target_role: string | null }[];
}

export const fetchVerticals = () => adminFetch<{ items: VerticalItem[]; unconfigured: { name: string; businesses: number }[]; editable: boolean; source: string }>('/admin/verticals');
export const fetchVertical = (name: string, language: string) => adminFetch<VerticalDetail>(`/admin/verticals/${encodeURIComponent(name)}${queryString({ language })}`);

// ---- Message templates ---------------------------------------------------------------------------------------------

export type TemplateChannel = 'email' | 'sms' | 'whatsapp' | 'push';

export interface TemplateEvent {
  key: string;
  label: string;
  group: string;
  owner: 'platform' | 'business';
  to: string;
  variables: string[];
  channels: TemplateChannel[];
}

export interface TemplateMeta {
  channels: TemplateChannel[];
  languages: string[];
  statuses: string[];
  events: TemplateEvent[];
}

export interface TemplateGridCell {
  status: 'active' | 'draft' | 'default' | 'missing';
  languages: string[];
  meta_status: string | null;
  live: boolean; // the app really sends this message through the template today
}

export interface TemplateGrid {
  items: { key: string; label: string; group: string; owner: string; to: string; cells: Partial<Record<TemplateChannel, TemplateGridCell>> }[];
}

export interface TemplateRow {
  id: string;
  language: string;
  subject: string | null;
  body: string;
  status: string;
  whatsapp_name: string | null;
  meta_status: string | null;
  sms_template_id: string | null;
  version: number;
  history: { version: number; subject: string | null; body: string; updated_by: string | null; updated_at: string | null }[];
  updated_at: string | null;
}

export interface TemplateCell {
  event_key: string;
  channel: TemplateChannel;
  label: string;
  to: string;
  variables: string[];
  languages: string[];
  own: Record<string, TemplateRow>;
  inherited: Record<string, TemplateRow>;
  default: { subject: string | null; body: string; language: string } | null;
  live: boolean;
  requires_approval: boolean;
}

export interface TemplateSave {
  language: string;
  subject?: string | null;
  body: string;
  status: 'draft' | 'active' | 'archived';
  whatsapp_name?: string | null;
  sms_template_id?: string | null;
}

export interface TemplatePreview {
  subject: string | null;
  body: string;
  unknown_variables: string[];
  sms?: { characters: number; segments: number; unicode: boolean };
}

export interface MessageLogRow {
  id: string;
  event: string;
  event_key: string;
  channel: string;
  recipient: string;
  status: string;
  provider: string | null;
  error: string | null;
  business_id: string | null;
  created_at: string | null;
}

const cellPath = (event: string, channel: string) => `/admin/message-templates/${encodeURIComponent(event)}/${encodeURIComponent(channel)}`;
export const fetchTemplateMeta = () => adminFetch<TemplateMeta>('/admin/message-templates/meta');
export const fetchTemplateGrid = () => adminFetch<TemplateGrid>('/admin/message-templates');
export const fetchTemplateCell = (event: string, channel: string) => adminFetch<TemplateCell>(cellPath(event, channel));
export const saveTemplate = (event: string, channel: string, body: TemplateSave) => adminFetch<TemplateRow>(cellPath(event, channel), { method: 'PUT', body: JSON.stringify(body) });
export const resetTemplate = (event: string, channel: string, language: string) => adminFetch<{ removed: number }>(`${cellPath(event, channel)}${queryString({ language })}`, { method: 'DELETE' });
export const previewTemplate = (event: string, channel: string, body: { subject?: string | null; body: string }) =>
  adminFetch<TemplatePreview>(`${cellPath(event, channel)}/preview`, { method: 'POST', body: JSON.stringify(body) });
export const restoreTemplate = (event: string, channel: string, body: { language: string; version: number }) =>
  adminFetch<TemplateRow>(`${cellPath(event, channel)}/restore`, { method: 'POST', body: JSON.stringify(body) });
export const fetchMessageLog = (params: { channel?: string; status?: string; event_key?: string; limit?: number; offset?: number }) =>
  adminFetch<{ items: MessageLogRow[]; limit: number; offset: number }>(`/admin/message-log${queryString({ ...params })}`);

// ---- Alerts (sign-ups, sign-ins, trials, plan changes, tickets, security) ------------------------------------------

export interface AlertItem {
  id: string;
  category: string;
  level: 'info' | 'success' | 'warning' | 'critical';
  title: string;
  message: string;
  at: string | null;
  unread: boolean;
  business_id: string | null;
  business_name: string | null;
  link: string | null;
}
export interface AlertFeed {
  items: AlertItem[];
  unread: number;
  counts: Record<string, number>;
  categories: Record<string, string>;
  muted: string[];
  attention: { id: string; title: string; message: string; level: string; link: string | null }[];
  window_days: number;
}
export const fetchAlerts = (category?: string) => adminFetch<AlertFeed>(`/admin/alerts${category ? `?category=${encodeURIComponent(category)}` : ''}`);
export const fetchAlertsUnread = () => adminFetch<{ unread: number }>('/admin/alerts/unread-count');
export const markAlertsRead = () => adminFetch<{ unread: number }>('/admin/alerts/mark-read', { method: 'POST' });
export const saveAlertPrefs = (muted: string[]) => adminFetch<{ muted: string[] }>('/admin/alerts/preferences', { method: 'PUT', body: JSON.stringify({ muted }) });
