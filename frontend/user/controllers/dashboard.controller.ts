import { API_ENDPOINTS } from '../utils/api_endpoints';
import { ApiService } from '../services/api.service';
import { StorageService } from '../services/storage.service';

export interface LlmModelOption {
  value: string; // "groq:<id>" / "gemini:<id>": exactly what the agent config stores in `model`
  provider: 'groq' | 'gemini';
  id: string;
  label: string;
  context_window: number | null;
  in_chain: boolean;
  chain_position: number | null; // 1 = tried first; later ones are fallbacks
  tool_calling: 'no' | 'unknown'; // 'no' once the model has refused tool calls
}
export interface LlmModelCatalog {
  models: LlmModelOption[];
  default: string | null;
  chain: string[];
  errors: Record<string, string>;
}

export interface DashboardMetrics {
  total_calls: number;
  booked_appointments: number;
  transferred_calls: number;
  conversion_rate: string;
  avg_latency: string;
  ai_accuracy: string;
}

export interface RecentActivityItem {
  id: string;
  type: string;
  caller: string;
  intent: string;
  outcome: string;
  duration: string;
  time: string;
}

export interface DashboardStatsResponse {
  metrics: DashboardMetrics;
  recent_activity: RecentActivityItem[];
}

export interface AppointmentItem {
  id: string;
  business_id: string;
  call_id?: string;
  type: string;
  status: string;
  customer_name: string;
  phone_number: string;
  service_name: string;
  doctor_name: string;
  preferred_date: string;
  preferred_time: string;
  notes?: string;
  created_at?: string;
  details?: Record<string, any>;
}

export interface CallLogItem {
  id: string;
  business_id: string;
  caller_number: string;
  caller_name: string;
  intent: string;
  outcome: string;
  summary: string;
  duration_seconds: number;
  latency_ms: number;
  recording_url?: string | null;
  is_test?: boolean; // made from the dashboard playground, not a real caller
  channel?: 'phone' | 'whatsapp' | 'playground';
  started_at: string | null;
  ended_at: string | null;
  messages?: Array<{
    id: string;
    role: string;
    content: string;
    sequence: number;
    created_at: string;
  }>;
}

export interface ServiceItem {
  id: string;
  business_id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  price_amount: number | null;
  price_currency: string;
  created_at?: string;
}

export interface StaffItem {
  id: string;
  business_id: string;
  name: string;
  role: string;
  specialty: string | null;
  email: string | null;
  phone: string | null;
  service_ids: string[];
  created_at?: string;
}

export interface CustomerItem {
  id: string;
  name: string;
  phone_number: string;
  email?: string;
  notes?: string;
  total_bookings: number;
  last_visit: string;
  status: string;
}

export interface KnowledgeItem {
  id: string;
  business_id: string;
  doc_type: 'document' | 'website' | 'faq' | string;
  status: string;
  filename?: string | null;
  source_url?: string | null;
  question?: string | null;
  answer?: string | null;
  uploaded_at: string;
}

export interface AgentItem {
  id: string;
  business_id: string;
  name: string;
  status: string;
  voice_provider: string;
  voice_model: string;
  languages: string[];
  primary_language: string;
  greeting_message: string;
  config: {
    personality?: string;
    temperature?: number;
    capabilities?: Record<string, boolean>;
    toggles?: Record<string, boolean>;
    limits?: {
      max_duration_minutes?: number;
      silence_timeout_seconds?: number;
      buffer_minutes?: number;
      notice_hours?: number;
    };
    transfer_phone?: string;
    escalation_triggers?: Array<{ id: string; label: string; active: boolean }>;
    [key: string]: any;
  };
  created_at?: string;
}

export interface BusinessInfo {
  id: string;
  name: string;
  vertical: string;
  business_type?: string;
  business_subtype?: string;
  country?: string;
  city?: string;
  address?: string;
  postal_code?: string;
  business_email?: string;
  business_phone?: string;
  logo_url?: string;
  timezone: string;
  currency: string;
  plan: string;
  status: string;
  working_hours?: Record<string, any>;
}

export const DashboardController = {
  getEffectiveBusinessId(explicitBusinessId?: string): string {
    const id = explicitBusinessId || StorageService.getBusinessId();
    if (!id) {
      throw new Error('No active business ID found. Please log in or complete onboarding.');
    }
    return id;
  },

  async getBusinessInfo(businessId?: string): Promise<BusinessInfo> {
    const bId = this.getEffectiveBusinessId(businessId);
    const data = await ApiService.get<BusinessInfo>(API_ENDPOINTS.BUSINESS.GET(bId));
    if (data) {
      StorageService.setBusiness(data);
    }
    return data;
  },

  async getStats(businessId?: string): Promise<DashboardStatsResponse> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.get<DashboardStatsResponse>(API_ENDPOINTS.DASHBOARD.GET_STATS(bId));
  },

  async getAppointments(
    businessId?: string,
    params?: { date?: string; status?: string; doctor_name?: string }
  ): Promise<AppointmentItem[]> {
    const bId = this.getEffectiveBusinessId(businessId);
    let url = API_ENDPOINTS.APPOINTMENTS.LIST(bId);
    const query = new URLSearchParams();
    if (params?.date) query.set('date', params.date);
    if (params?.status) query.set('status', params.status);
    if (params?.doctor_name) query.set('doctor_name', params.doctor_name);
    const qs = query.toString();
    if (qs) url += `?${qs}`;
    return ApiService.get<AppointmentItem[]>(url);
  },

  async createAppointment(
    payload: {
      customer_name: string;
      phone_number: string;
      service_name?: string;
      doctor_name?: string;
      preferred_date: string;
      preferred_time: string;
      status?: string;
      notes?: string;
    },
    businessId?: string
  ): Promise<AppointmentItem> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.post<AppointmentItem>(API_ENDPOINTS.APPOINTMENTS.CREATE(bId), payload);
  },

  async updateAppointment(
    appointmentId: string,
    payload: Partial<AppointmentItem>,
    businessId?: string
  ): Promise<AppointmentItem> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.patch<AppointmentItem>(API_ENDPOINTS.APPOINTMENTS.UPDATE(bId, appointmentId), payload);
  },

  async deleteAppointment(appointmentId: string, businessId?: string): Promise<void> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.delete<void>(API_ENDPOINTS.APPOINTMENTS.DELETE(bId, appointmentId));
  },

  async getCalls(
    businessId?: string,
    params?: { outcome?: string; limit?: number }
  ): Promise<CallLogItem[]> {
    const bId = this.getEffectiveBusinessId(businessId);
    let url = API_ENDPOINTS.CALLS.LIST(bId);
    const query = new URLSearchParams();
    if (params?.outcome) query.set('outcome', params.outcome);
    if (params?.limit) query.set('limit', String(params.limit));
    const qs = query.toString();
    if (qs) url += `?${qs}`;
    return ApiService.get<CallLogItem[]>(url);
  },

  async getCallDetail(callId: string, businessId?: string): Promise<CallLogItem> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.get<CallLogItem>(API_ENDPOINTS.CALLS.GET(bId, callId));
  },

  async getServices(businessId?: string): Promise<ServiceItem[]> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.get<ServiceItem[]>(API_ENDPOINTS.SERVICES.LIST(bId));
  },

  async createService(
    payload: {
      title: string;
      description?: string;
      duration_minutes?: number;
      price_amount?: number;
      price_currency?: string;
    },
    businessId?: string
  ): Promise<ServiceItem> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.post<ServiceItem>(API_ENDPOINTS.SERVICES.CREATE(bId), payload);
  },

  async updateService(
    serviceId: string,
    payload: Partial<ServiceItem>,
    businessId?: string
  ): Promise<ServiceItem> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.patch<ServiceItem>(API_ENDPOINTS.SERVICES.UPDATE(bId, serviceId), payload);
  },

  async deleteService(serviceId: string, businessId?: string): Promise<void> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.delete<void>(API_ENDPOINTS.SERVICES.DELETE(bId, serviceId));
  },

  async getStaff(businessId?: string): Promise<StaffItem[]> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.get<StaffItem[]>(API_ENDPOINTS.STAFF.LIST(bId));
  },

  async createStaff(
    payload: {
      name: string;
      role?: string;
      specialty?: string;
      email?: string;
      phone?: string;
      service_ids?: string[];
    },
    businessId?: string
  ): Promise<StaffItem> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.post<StaffItem>(API_ENDPOINTS.STAFF.CREATE(bId), payload);
  },

  async updateStaff(
    staffId: string,
    payload: Partial<StaffItem>,
    businessId?: string
  ): Promise<StaffItem> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.patch<StaffItem>(API_ENDPOINTS.STAFF.UPDATE(bId, staffId), payload);
  },

  async deleteStaff(staffId: string, businessId?: string): Promise<void> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.delete<void>(API_ENDPOINTS.STAFF.DELETE(bId, staffId));
  },

  async getCustomers(businessId?: string): Promise<CustomerItem[]> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.get<CustomerItem[]>(API_ENDPOINTS.CUSTOMERS.LIST(bId));
  },

  async createCustomer(
    payload: {
      name: string;
      phone_number: string;
      email?: string;
      notes?: string;
    },
    businessId?: string
  ): Promise<CustomerItem> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.post<CustomerItem>(API_ENDPOINTS.CUSTOMERS.CREATE(bId), payload);
  },

  async getKnowledge(businessId?: string): Promise<KnowledgeItem[]> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.get<KnowledgeItem[]>(API_ENDPOINTS.KNOWLEDGE.LIST(bId));
  },

  async createKnowledge(
    payload: {
      doc_type: 'document' | 'website' | 'faq';
      filename?: string;
      source_url?: string;
      question?: string;
      answer?: string;
    },
    businessId?: string
  ): Promise<KnowledgeItem> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.post<KnowledgeItem>(API_ENDPOINTS.KNOWLEDGE.CREATE(bId), payload);
  },

  async uploadKnowledgeFile(file: File, businessId?: string): Promise<KnowledgeItem> {
    const bId = this.getEffectiveBusinessId(businessId);
    const formData = new FormData();
    formData.append('file', file);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    const response = await fetch(API_ENDPOINTS.KNOWLEDGE.UPLOAD_FILE(bId), {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || 'Failed to upload document to knowledge base');
    }
    return response.json();
  },

  async syncKnowledgeUrl(sourceUrl: string, businessId?: string): Promise<KnowledgeItem> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.post<KnowledgeItem>(API_ENDPOINTS.KNOWLEDGE.SYNC_URL(bId), {
      source_url: sourceUrl,
    });
  },

  async deleteKnowledge(entryId: string, businessId?: string): Promise<void> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.delete<void>(API_ENDPOINTS.KNOWLEDGE.DELETE(bId, entryId));
  },

  async queryKnowledge(query: string, topK: number = 4, businessId?: string): Promise<any> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.post<any>(API_ENDPOINTS.KNOWLEDGE.QUERY(bId), {
      query,
      top_k: topK,
    });
  },

  async getAgent(businessId?: string): Promise<AgentItem> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.get<AgentItem>(API_ENDPOINTS.AGENTS.GET(bId));
  },

  async updateAgent(payload: Partial<AgentItem>, businessId?: string): Promise<AgentItem> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.patch<AgentItem>(API_ENDPOINTS.AGENTS.UPDATE(bId), payload);
  },

  async getVoices(): Promise<{ voices: any[] }> {
    return ApiService.get<{ voices: any[] }>(API_ENDPOINTS.VOICE.GET_VOICES);
  },

  async simulateVoice(
    payload: { user_transcript: string; call_id?: string; caller_number?: string; language?: string; accent?: string; voice_id?: string },
    businessId?: string
  ): Promise<any> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.post<any>(API_ENDPOINTS.VOICE.SIMULATE, {
      business_id: bId,
      caller_number: payload.caller_number ?? '',
      user_transcript: payload.user_transcript,
      call_id: payload.call_id,
      language: payload.language,
      accent: payload.accent,
      voice_id: payload.voice_id,
    });
  },

  /** Chat models available right now from Groq and Gemini (fetched live by the server, nothing hard-coded). */
  async getLlmModels(refresh = false): Promise<LlmModelCatalog> {
    return ApiService.get<LlmModelCatalog>(`${API_ENDPOINTS.VOICE.LLM_MODELS}${refresh ? '?refresh=true' : ''}`, { requireAuth: false });
  },

  /**
   * Streaming version of simulateVoice: `onSentence` fires the moment the server has each sentence (its audio is already
   * being synthesised), so the caller can start speaking before the model has finished. Resolves with the final payload
   * (same shape as simulateVoice). Uses newline-delimited JSON over a plain fetch.
   */
  async simulateVoiceStream(
    payload: { user_transcript: string; call_id?: string; caller_number?: string; language?: string; accent?: string; voice_id?: string },
    onSentence: (text: string, meta: { emotion?: string; ttsText?: string }) => void,
    businessId?: string
  ): Promise<any> {
    const bId = this.getEffectiveBusinessId(businessId);
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    const token = StorageService.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    const res = await fetch(`${API_ENDPOINTS.VOICE.SIMULATE}/stream`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        business_id: bId,
        caller_number: payload.caller_number ?? '',
        user_transcript: payload.user_transcript,
        call_id: payload.call_id,
        language: payload.language,
        accent: payload.accent,
        voice_id: payload.voice_id,
      }),
    });
    if (!res.ok || !res.body) throw new Error(`Streaming turn failed (${res.status})`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let final: any = null;
    const handleLine = (line: string) => {
      if (!line.trim()) return;
      const event = JSON.parse(line);
      if (event.type === 'sentence') onSentence(event.text, { emotion: event.emotion, ttsText: event.tts_text });
      else if (event.type === 'done') final = event;
    };
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let newline: number;
      while ((newline = buffer.indexOf('\n')) >= 0) {
        handleLine(buffer.slice(0, newline));
        buffer = buffer.slice(newline + 1);
      }
    }
    handleLine(buffer);
    return final;
  },

  async triggerTestCall(phoneNumber: string, businessId?: string): Promise<any> {
    const bId = this.getEffectiveBusinessId(businessId);
    return ApiService.post<any>(API_ENDPOINTS.VOICE.CALL_ME, {
      phone_number: phoneNumber,
      business_id: bId,
    });
  },

  /** Attach the recording of a browser test call (caller mic + AI voice) so it can be played back in /calls. */
  async uploadCallRecording(callId: string, blob: Blob, businessId?: string): Promise<{ stored: boolean; recording_url?: string; reason?: string }> {
    const bId = this.getEffectiveBusinessId(businessId);
    const ext = blob.type.includes('ogg') ? 'ogg' : blob.type.includes('mp4') ? 'mp4' : 'webm';
    const form = new FormData();
    form.append('file', blob, `call.${ext}`);
    const token = StorageService.getToken();
    const res = await fetch(API_ENDPOINTS.CALLS.RECORDING(bId, callId), {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    });
    if (!res.ok) throw new Error(`Recording upload failed (${res.status})`);
    return res.json();
  },

  /** Tell the server the tester hung up, so the call stops showing as live and gets its real duration. */
  async endSimulatedCall(callId: string, businessId?: string): Promise<void> {
    const bId = this.getEffectiveBusinessId(businessId);
    await ApiService.post<any>(API_ENDPOINTS.CALLS.END(bId, callId), {});
  },

  async transcribeAudio(audioBlob: Blob): Promise<{ transcript: string }> {
    const formData = new FormData();
    formData.append('file', audioBlob, 'mic_recording.webm');
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
    const res = await fetch(API_ENDPOINTS.VOICE.TRANSCRIBE, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });
    if (!res.ok) {
      throw new Error(`Transcription failed: ${res.statusText}`);
    }
    return res.json();
  },
};
