"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiService } from '../services/api.service';
import { StorageService } from '../services/storage.service';
import { API_ENDPOINTS } from '../utils/api_endpoints';
import { WHATSAPP_ENABLED } from '../utils/features';

const META_APP_ID = process.env.NEXT_PUBLIC_META_APP_ID || '2495665704244136';
const META_WA_CONFIG_ID = process.env.NEXT_PUBLIC_META_WA_CONFIG_ID || '1654545732766079';
const META_GRAPH_VERSION = 'v23.0';

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

type WaSession = { waba_id: string; phone_number_id: string; coexistence: boolean };
export type WhatsappStatus = 'loading' | 'idle' | 'connecting' | 'connected' | 'error';

export const getActiveBusinessId = () =>
  StorageService.getBusinessId() || (typeof window !== 'undefined' ? localStorage.getItem('onboarding_business_id') : null);

// localStorage is per-origin (http vs https), so fall back to asking the backend
export async function resolveBusinessId(): Promise<string | null> {
  const cached = getActiveBusinessId();
  if (cached) return cached;
  try {
    const list = await ApiService.get<{ id: string }[]>(API_ENDPOINTS.BUSINESS.CREATE);
    const id = list[0]?.id || null;
    if (id) StorageService.setBusinessId(id);
    return id;
  } catch {
    return null;
  }
}

/**
 * Meta WhatsApp Embedded Signup in coexistence mode: the business keeps using
 * its existing number in the WhatsApp Business app while we get API access.
 */
export function useWhatsappEmbeddedSignup() {
  const [sdkReady, setSdkReady] = useState(false);
  const [status, setStatus] = useState<WhatsappStatus>('loading');
  const [error, setError] = useState('');
  const [connectedNumber, setConnectedNumber] = useState('');
  const waSessionRef = useRef<WaSession | null>(null);

  // Load current connection state from the backend
  useEffect(() => {
    if (!WHATSAPP_ENABLED) { setStatus('idle'); return; }
    resolveBusinessId()
      .then((businessId) => (businessId ? ApiService.get<any[]>(API_ENDPOINTS.INTEGRATIONS.LIST(businessId)) : []))
      .then((list) => {
        const wa = list.find((i) => i.provider === 'whatsapp');
        if (wa?.status === 'connected' && wa.config?.phone_number_id) {
          setConnectedNumber(wa.config.display_phone_number || '');
          setStatus('connected');
        } else {
          setStatus('idle');
        }
      })
      .catch(() => setStatus('idle'));
  }, []);

  useEffect(() => {
    if (!WHATSAPP_ENABLED) return; // do not pull the Facebook SDK in while WhatsApp is hidden
    if (window.FB) {
      setSdkReady(true);
      return;
    }
    window.fbAsyncInit = () => {
      window.FB.init({ appId: META_APP_ID, autoLogAppEvents: true, xfbml: false, version: META_GRAPH_VERSION });
      setSdkReady(true);
    };
    if (!document.getElementById('facebook-jssdk')) {
      const script = document.createElement('script');
      script.id = 'facebook-jssdk';
      script.src = 'https://connect.facebook.net/en_US/sdk.js';
      script.async = true;
      script.defer = true;
      script.crossOrigin = 'anonymous';
      document.body.appendChild(script);
    }
  }, []);

  // The popup posts waba_id / phone_number_id back via window.postMessage
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (!event.origin.endsWith('facebook.com')) return;
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
        if (String(data.event).startsWith('FINISH')) {
          waSessionRef.current = {
            waba_id: data.data.waba_id,
            phone_number_id: data.data.phone_number_id,
            coexistence: data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING',
          };
        } else if (data.event === 'CANCEL') {
          setStatus('idle');
          setError(data.data?.error_message || 'Signup was cancelled before finishing.');
        }
      } catch {
        // non-JSON messages from the SDK are ignored
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  const finish = async (code: string) => {
    // postMessage can land slightly after the login callback
    for (let i = 0; i < 10 && !waSessionRef.current; i++) {
      await new Promise((r) => setTimeout(r, 300));
    }
    const session = waSessionRef.current;
    const businessId = await resolveBusinessId();
    if (!session || !businessId) {
      setStatus('error');
      setError(!businessId ? 'Business not found — complete the Business step first.' : 'Meta did not return your WhatsApp account details. Please try again.');
      return;
    }
    try {
      const integration: any = await ApiService.post(API_ENDPOINTS.INTEGRATIONS.WHATSAPP_EMBEDDED_SIGNUP(businessId), { code, ...session });
      setConnectedNumber(integration?.config?.display_phone_number || '');
      setStatus('connected');
      localStorage.setItem('onboarding_whatsapp_connected', 'true');
      localStorage.setItem('onboarding_whatsapp_mode', 'embedded_signup');
    } catch (err: any) {
      setStatus('error');
      setError(err?.message || 'Could not finish WhatsApp connection.');
    }
  };

  const connect = useCallback(() => {
    if (!window.FB) return;
    // Facebook refuses FB.login on http pages, even on localhost
    if (window.location.protocol !== 'https:') {
      setStatus('error');
      setError(`WhatsApp connect needs HTTPS — Facebook blocks its login popup on http pages. Restart the app with \`npm run dev\` and open https://${window.location.host}${window.location.pathname}.`);
      return;
    }
    setError('');
    setStatus('connecting');
    waSessionRef.current = null;
    // FB.login rejects async callbacks, so hand off to a separate async fn
    window.FB.login(
      (response: any) => {
        const code = response?.authResponse?.code;
        if (code) {
          finish(code);
        } else {
          setStatus('idle');
        }
      },
      {
        config_id: META_WA_CONFIG_ID,
        response_type: 'code',
        override_default_response_type: true,
        extras: {
          setup: {},
          featureType: 'whatsapp_business_app_onboarding',
          sessionInfoVersion: '3',
        },
      }
    );
  }, []);

  const sendTestMessage = useCallback(async (to: string) => {
    const businessId = await resolveBusinessId();
    if (!businessId) throw new Error('Business not found.');
    await ApiService.post(API_ENDPOINTS.INTEGRATIONS.WHATSAPP_TEST_MESSAGE(businessId), { to });
  }, []);

  return { sdkReady, status, error, connectedNumber, connect, sendTestMessage };
}
