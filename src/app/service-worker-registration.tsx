'use client';

import { useEffect } from 'react';

// Only register in production — in dev this would sit in front of Next's own module/HMR requests.
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js');
    });
  }, []);

  return null;
}
