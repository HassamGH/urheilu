'use client';

import { useEffect, useState } from 'react';
import { Logo } from '../layout/Logo';

// Mounted once in the root layout, outside any route segment — a Client Component still renders on
// the server, so this is part of the very first HTML response (covering the real page underneath
// while it's not yet interactive) and then hides itself the instant its own effect runs, i.e. the
// moment this component has hydrated. Since it lives in the persistent layout rather than inside a
// page, it never remounts on a client-side <Link> navigation — it can only ever show once, for a
// genuine cold load (hard refresh, first visit, typed URL), never flash on later in-app navigation.
export function AppLoadingScreen() {
  const [hidden, setHidden] = useState(false);
  useEffect(() => setHidden(true), []);
  if (hidden) return null;

  return (
    <div className="fixed inset-0 z-50 bg-brand-bg flex flex-col items-center justify-center gap-3" role="status" aria-label="Loading">
      <Logo className="w-16 h-16 animate-pulse" />
      <span className="text-lg font-black italic tracking-tighter text-white/80">URHEILU</span>
    </div>
  );
}
