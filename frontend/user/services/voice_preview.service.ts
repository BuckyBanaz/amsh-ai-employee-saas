import { API_ENDPOINTS } from '../utils/api_endpoints';
import { StorageService } from './storage.service';

/**
 * `<audio src>` / `new Audio(url)` cannot send an Authorization header, so voice previews use a short-lived token in the URL
 * (the server mints it from the login, valid 10 minutes, good only for voice previews). `warmPreviewToken()` fetches and caches it;
 * `withPreviewToken(url)` is synchronous and refreshes the token in the background when it is about to expire.
 */
const LIFETIME_MS = 10 * 60 * 1000;
const REFRESH_BEFORE_MS = 60 * 1000;

let cached: { token: string; expiresAt: number } | null = null;
let inFlight: Promise<void> | null = null;

export function warmPreviewToken(): Promise<void> {
  if (cached && cached.expiresAt - Date.now() > REFRESH_BEFORE_MS) return Promise.resolve();
  if (inFlight) return inFlight;
  const login = StorageService.getToken();
  if (!login) return Promise.resolve();
  inFlight = fetch(API_ENDPOINTS.VOICE.MEDIA_TOKEN, { method: 'POST', headers: { Authorization: `Bearer ${login}` } })
    .then((res) => (res.ok ? res.json() : null))
    .then((data: { token?: string } | null) => {
      if (data?.token) cached = { token: data.token, expiresAt: Date.now() + LIFETIME_MS };
    })
    .catch(() => undefined)
    .finally(() => {
      inFlight = null;
    });
  return inFlight;
}

export async function getPreviewAudioUrl(url: string): Promise<string> {
  await warmPreviewToken();
  if (!cached) return url;
  return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(cached.token)}`;
}

export function withPreviewToken(url: string): string {
  void warmPreviewToken();
  if (!cached) return url;
  return `${url}${url.includes('?') ? '&' : '?'}token=${encodeURIComponent(cached.token)}`;
}
