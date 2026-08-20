'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import type { Match } from '../../types';
import { useMarkNavigating } from '../../lib/navigation';

const MAX_RESULTS = 5;

// Self-contained: its own query state and its own filtered results, entirely separate from
// whatever sport/date listing is showing on the page — it's a quick-jump popup, not a page filter.
//
// A centered overlay rather than a dropdown anchored under the trigger button — the button lives in
// the header's corner, but that's an awkward place to actually read and scan a results list against
// the busy featured-banner poster behind it. Centering the panel puts it over the calmer, more
// consistently dark area of the page regardless of where the button that opened it sits.
export function SearchModal({ matches }: { matches: Match[] }) {
  const markNavigating = useMarkNavigating();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const panelRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return matches
      .filter((match) => [match.title, match.homeTeam, match.awayTeam, match.competition].some((value) => value?.toLowerCase().includes(term)))
      .slice(0, MAX_RESULTS);
  }, [matches, query]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const closeAndClear = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <>
      {/* No border/background box — a bare icon reads lighter over the featured banner's poster
          underneath it. The drop-shadow (rather than a backdrop box) is what keeps it legible
          against whatever's behind it, bright poster or plain dark background alike. */}
      <button
        aria-label="Search matches"
        onClick={() => setOpen(true)}
        className="w-10 h-10 flex items-center justify-center text-white/90 hover:text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-xl!">search</span>
      </button>

      {open && (
        // Flexbox centering, not `left-1/2 -translate-x-1/2` — that combination has a real timing
        // quirk here: `-translate-x-1/2` shifts the panel by 50% of its OWN rendered width, and on
        // first paint that could be read before the width classes (`w-[calc(100%-2rem)] max-w-lg`)
        // had settled to their final value, computing the shift against a stale width and then
        // visibly correcting a moment later once layout caught up — exactly the "not centered
        // initially, snaps into place" symptom. A flex container centers its child directly, with
        // no separate position-then-transform step for a stale measurement to sneak into.
        <div className="fixed inset-0 z-50 flex justify-center pt-20 md:pt-28" role="dialog" aria-modal="true" aria-label="Search matches">
          {/* Deliberately light and un-blurred — see the matching comment in SportsDrawer.tsx. The
              panel below has its own translucency/blur; a dark, blurred full-page backdrop
              underneath it left almost nothing colorful for that to actually show through to. */}
          <div className="absolute inset-0 bg-black/25 animate-fade-in" onClick={closeAndClear} />
          <div
            ref={panelRef}
            className="relative w-[calc(100%-2rem)] max-w-lg h-fit bg-brand-surface/70 backdrop-blur-2xl border border-white/10 shadow-2xl animate-modal-in"
          >
            <div className="flex items-center gap-2 px-4 py-3.5 border-b border-white/10">
              <span className="material-symbols-outlined text-gray-400 text-lg!">search</span>
              <input
                autoFocus
                aria-label="Search matches"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search teams, competitions..."
                className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
              />
              <button aria-label="Close search" onClick={closeAndClear} className="shrink-0 text-gray-400 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-lg!">close</span>
              </button>
            </div>

            {query.trim() && (
              <div className="max-h-[60vh] overflow-y-auto">
                {results.length === 0 ? (
                  <p className="px-4 py-8 text-sm text-gray-400 text-center">No matches found.</p>
                ) : (
                  results.map((match) => (
                    <Link
                      key={match.id}
                      href={`/match/${encodeURIComponent(match.id)}`}
                      onClick={() => {
                        markNavigating();
                        closeAndClear();
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors cursor-pointer border-b border-white/10 last:border-b-0"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${match.isLive ? 'bg-brand-live' : 'bg-gray-600'}`} />
                      <span className="min-w-0">
                        <span className="block text-sm text-white truncate">{match.title}</span>
                        {match.competition && <span className="block text-xs text-gray-500 truncate">{match.competition}</span>}
                      </span>
                    </Link>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
