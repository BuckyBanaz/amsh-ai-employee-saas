import { ApiService } from './api.service';
import { BASE_URL } from '../utils/api_endpoints';
import { StorageService } from './storage.service';

export interface TicketMessageDto {
  id: string;
  author: string;
  from_staff: boolean;
  body: string;
  created_at: string | null;
}

export interface TicketDto {
  id: string;
  number: number;
  subject: string;
  category: string;
  priority: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  message_count: number;
  last_message: string;
  messages?: TicketMessageDto[];
}

export const TOPICS = ['technical', 'telephony', 'ai_quality', 'billing', 'account', 'other'] as const;
export const PRIORITIES = ['low', 'normal', 'high', 'urgent'] as const;

const base = () => `${BASE_URL}/businesses/${encodeURIComponent(StorageService.getBusinessId() ?? '')}/tickets`;

export const SupportService = {
  list: () => ApiService.get<{ items: TicketDto[] }>(base()),
  get: (id: string) => ApiService.get<TicketDto>(`${base()}/${encodeURIComponent(id)}`),
  open: (body: { subject: string; body: string; category: string; priority: string }) => ApiService.post<TicketDto>(base(), body),
  reply: (id: string, body: string) => ApiService.post<TicketDto>(`${base()}/${encodeURIComponent(id)}/messages`, { body }),
};
