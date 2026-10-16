import { useEffect, useRef } from 'react';

/**
 * Keeps a page's data current without a manual reload. Calls `refresh` every `intervalMs` while the tab is visible, and again as
 * soon as the tab is focused or becomes visible. The AI changes appointments from WhatsApp and phone calls while the dashboard is
 * open, so a page that loads once on mount shows stale bookings.
 *
 * `refresh` should be silent (no loading spinner): it runs in the background.
 */
export function useAutoRefresh(refresh: () => void, intervalMs: number = 20000): void {
  const latest = useRef(refresh);
  useEffect(() => {
    latest.current = refresh;
  }, [refresh]);

  useEffect(() => {
    const run = () => {
      if (document.visibilityState === 'visible') latest.current();
    };
    const timer = window.setInterval(run, intervalMs);
    window.addEventListener('focus', run);
    document.addEventListener('visibilitychange', run);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', run);
      document.removeEventListener('visibilitychange', run);
    };
  }, [intervalMs]);
}
