"use client";
import { useEffect, useState } from 'react';
import { VerticalController } from '../controllers/vertical.controller';
import { StorageService } from '../services/storage.service';
import { CLINIC_TERMS, type Terminology, type VerticalConfig } from './types';

// One request per business per page load, shared by every component (memory only: the server is the source of truth).
const cache = new Map<string, Promise<VerticalConfig>>();

export function invalidateVerticalConfig(): void {
  cache.clear();
}

function load(id: string): Promise<VerticalConfig> {
  if (!cache.has(id)) {
    const p = VerticalController.config(id).catch((err) => {
      cache.delete(id); // a failed load is retried next time, never cached
      throw err;
    });
    cache.set(id, p);
  }
  return cache.get(id)!;
}

export function useVerticalConfig(): { config: VerticalConfig | null; terms: Terminology; loading: boolean; error: string | null } {
  const [config, setConfig] = useState<VerticalConfig | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const run = () => {
      const id = StorageService.getBusinessId();
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      load(id)
        .then((c) => { if (alive) { setConfig(c); setError(null); } })
        .catch((e: unknown) => { if (alive) setError(e instanceof Error ? e.message : 'Could not load the business type'); })
        .finally(() => { if (alive) setLoading(false); });
    };
    const refresh = () => { invalidateVerticalConfig(); run(); };
    run();
    window.addEventListener('business_updated', refresh);
    return () => { alive = false; window.removeEventListener('business_updated', refresh); };
  }, []);

  return { config, terms: config?.terminology || CLINIC_TERMS, loading, error };
}

/** True when the business runs a vertical other than healthcare (clinic UI stays exactly as it was). */
export function isNonClinic(config: VerticalConfig | null): boolean {
  return !!config && config.supported && config.vertical !== 'clinic';
}
