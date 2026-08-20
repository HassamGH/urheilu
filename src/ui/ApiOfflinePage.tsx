'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Logo } from '../components/layout/Logo';
import { useMarkNavigating, useMarkPageArrived } from '../lib/navigation';

// Shown in place of a page whose server-side data fetch failed outright — every WatchFooty origin
// unreachable, not just one slow/erroring source (a single bad source degrades gracefully via
// ErrorBlock/EmptyState instead, see HomePage/MatchPage). Styled off UNAUTHORIZED_PAGE.ts's
// card — same logo/wordmark/red-divider identity and Georgia-serif message — so a total outage
// reads as "the same site, temporarily down" rather than a generic framework crash page.
export function ApiOfflinePage({ onRetry }: { onRetry: () => void }) {
  const markNavigating = useMarkNavigating();
  // Tells app/loading.tsx the navigation that led here (if any) is over — see its comment.
  const markPageArrived = useMarkPageArrived();
  useEffect(markPageArrived, [markPageArrived]);

  return (
    <div className="min-h-screen bg-brand-bg text-white flex items-center justify-center px-4">
      <div className="w-full max-w-sm text-center animate-pop-in rounded-2xl border border-brand-border bg-brand-surface px-8 py-10">
        <Logo className="w-14 h-14 mx-auto mb-5" />
        <p className="text-lg font-black italic tracking-tight mb-3">URHEILU</p>
        <hr className="w-8 h-0.5 mx-auto mb-5 border-none bg-brand-live" />

        <span className="material-symbols-outlined text-4xl! text-brand-muted mb-4 inline-block">cloud_off</span>
        <h1 className="text-xl font-bold mb-2">Scores are offline</h1>
        <p className="text-brand-muted font-serif text-sm leading-relaxed mb-8">
          We can't reach live match data right now — every source we check is down. It's usually back within a
          few minutes.
        </p>

        <div className="flex flex-col gap-3">
          <button
            onClick={onRetry}
            className="inline-flex items-center justify-center gap-2 h-11 bg-white text-black font-bold text-xs uppercase tracking-wide hover:bg-gray-200 transition-colors cursor-pointer"
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
