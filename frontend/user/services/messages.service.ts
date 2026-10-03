import { ApiService } from './api.service';
import { BASE_URL } from '../utils/api_endpoints';
import { StorageService } from './storage.service';

export type Channel = 'whatsapp' | 'sms' | 'email' | 'push';

export interface MessageChannelInfo {
  channel: Channel;
  source: 'business' | 'platform' | 'default';
  customized: boolean;
  status: string;
  languages: string[];
  meta_status: string | null;
  live: boolean;
}

export interface MessageEventItem {
  key: string;
  label: string;
  group: string;
  to: string;
  variables: string[];
  enabled: boolean;
  order: Channel[];
  customized: boolean;
  live: boolean; // at least one channel of this message is sent through the template system today
  channels: MessageChannelInfo[];
}

export interface MessageList {
  items: MessageEventItem[];
  quiet_hours: { enabled: boolean; from: string; to: string };
  languages: string[];
}

export interface TemplateRowDto {
  id: string;
  language: string;
  subject: string | null;
  body: string;
  status: string;
  meta_status: string | null;
  sms_template_id: string | null;
  version: number;
  history: { version: number; subject: string | null; body: string; updated_at: string | null }[];
}

export interface TemplateCellDto {
  event_key: string;
  channel: Channel;
  variables: string[];
  languages: string[];
  own: Record<string, TemplateRowDto>;
  inherited: Record<string, TemplateRowDto>;
  default: { subject: string | null; body: string } | null;
  live: boolean;
}

export interface PreviewDto {
  subject: string | null;
  body: string;
  unknown_variables: string[];
  sms?: { characters: number; segments: number; unicode: boolean };
}

export interface MessageLogDto {
  id: string;
  event: string;
  channel: string;
  recipient: string;
  status: string;
  error: string | null;
  created_at: string | null;
}

const base = () => `${BASE_URL}/businesses/${encodeURIComponent(StorageService.getBusinessId() ?? '')}`;
const cell = (event: string, channel: string) => `${base()}/message-templates/${encodeURIComponent(event)}/${encodeURIComponent(channel)}`;

export const MessagesService = {
  list: () => ApiService.get<MessageList>(`${base()}/message-templates`),
  cell: (event: string, channel: string) => ApiService.get<TemplateCellDto>(cell(event, channel)),
  save: (event: string, channel: string, body: { language: string; subject?: string | null; body: string; status: 'draft' | 'active' }) =>
    ApiService.put<TemplateRowDto>(cell(event, channel), body),
  reset: (event: string, channel: string, language: string) => ApiService.delete<{ removed: number }>(`${cell(event, channel)}?language=${encodeURIComponent(language)}`),
  restore: (event: string, channel: string, body: { language: string; version: number }) => ApiService.post<TemplateRowDto>(`${cell(event, channel)}/restore`, body),
  preview: (event: string, channel: string, body: { subject?: string | null; body: string }) => ApiService.post<PreviewDto>(`${cell(event, channel)}/preview`, body),
  savePreferences: (body: { events?: Record<string, { enabled?: boolean; order?: Channel[] }>; quiet_hours?: { enabled?: boolean; from?: string; to?: string } }) =>
    ApiService.put<unknown>(`${base()}/message-preferences`, body),
  log: () => ApiService.get<{ items: MessageLogDto[] }>(`${base()}/message-log?limit=20`),
};
