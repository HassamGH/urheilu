'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '../components/layout/Logo';
import { useMarkNavigating, useMarkPageArrived } from '../lib/navigation';

// Shown in place of a page whose server-side data fetch failed outright — every WatchFooty origin
// unreachable, not just one slow/erroring source (a single bad source degrades gracefully via
// ErrorBlock/EmptyState instead, see HomePage/MatchPage). Shares UNAUTHORIZED_PAGE.ts's
// logo/wordmark/red-divider identity and Georgia-serif message — so a total outage reads as "the
// same site, temporarily down" rather than a generic framework crash page.
export function ApiOfflinePage({ onRetry }: { onRetry: () => void }) {
  const markNavigating = useMarkNavigating();
  // Tells app/loading.tsx the navigation that led here (if any) is over — see its comment.
  const markPageArrived = useMarkPageArrived();
  useEffect(markPageArrived, [markPageArrived]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-brand-bg text-white flex flex-col items-center justify-center px-4 text-center">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ backgroundImage: 'radial-gradient(circle at 50% 32%, rgba(255, 59, 48, 0.14), transparent 60%)' }}
      />

      <div className="relative flex flex-col items-center animate-pop-in">
        <Logo className="w-16 h-16 mb-6" />
        <p className="text-lg font-black italic tracking-tight mb-3">URHEILU</p>
        <hr className="w-8 h-0.5 mb-5 border-none bg-brand-live" />

        <span className="material-symbols-outlined text-4xl! text-brand-muted opacity-50 mb-5 inline-block">
          cloud_off
        </span>
        <h1 className="text-xl font-bold mb-2">Scores are offline</h1>
        <p className="text-brand-muted font-serif text-sm leading-relaxed mb-8 max-w-sm">
          We can't reach live match data right now — every source we check is down. It's usually back within a
          few minutes.
        </p>

        <div className="flex flex-col items-center gap-3">
          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 h-11 px-6 bg-white text-black font-bold text-xs uppercase tracking-wide hover:bg-gray-200 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]!">refresh</span>
            Try again
          </button>
          <Link
            href="/"
            onClick={() => {
              markNavigating();
              onRetry();
            }}
            className="text-xs text-brand-muted hover:text-white transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
