import { useEffect, useMemo, useRef, useState } from 'react';
import type { Match } from '../../types';
import { navigate } from '../../lib/navigation';
import { Logo } from './Logo';

const MAX_RESULTS = 5;

// Self-contained: its own query state and its own filtered results, entirely separate from
// whatever sport/date listing is showing on the page — it's a quick-jump popup, not a page filter.
export function Header({ matches }: { matches: Match[] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return [];
    return matches
      .filter((match) => [match.title, match.homeTeam, match.awayTeam, match.competition].some((value) => value?.toLowerCase().includes(term)))
      .slice(0, MAX_RESULTS);
  }, [matches, query]);

  // Closing on an outside click/Escape, rather than just on blur, so clicking a result inside the
  // dropdown doesn't get raced by the input's own blur handler closing the panel first.
  useEffect(() => {
    if (!open) return;
    const onOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('mousedown', onOutside);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousedown', onOutside);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const closeAndClear = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between w-full px-4 md:px-12 py-4 md:py-6 gap-4">
      <button className="flex items-center gap-1 shrink-0 cursor-pointer" onClick={() => navigate('/')}>
        <Logo className="w-7 h-7" />
        <span className="text-base font-black italic tracking-tighter text-white">URHEILU</span>
      </button>

      <div ref={containerRef} className="relative shrink-0">
        {open ? (
          <div className="flex items-center gap-2 bg-brand-surface border border-white/15 px-3 py-2 w-64 md:w-80">
            <span className="material-symbols-outlined text-gray-400 text-lg!">search</span>
            <input
              autoFocus
              aria-label="Search matches"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search teams, competitions..."
              className="w-full bg-transparent text-sm text-white placeholder:text-gray-500 focus:outline-none"
            />
            {query && (
              <button aria-label="Clear search" onClick={closeAndClear} className="shrink-0 text-gray-400 hover:text-white cursor-pointer">
                <span className="material-symbols-outlined text-lg!">close</span>
              </button>
            )}
          </div>
        ) : (
          <button
            aria-label="Search matches"
            onClick={() => setOpen(true)}
            className="w-10 h-10 flex items-center justify-center border border-white/15 bg-black/40 backdrop-blur-sm text-white hover:border-white/40 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-lg!">search</span>
          </button>
        )}

        {open && query.trim() && (
          <div className="absolute right-0 -mt-px w-64 md:w-80 bg-brand-surface border border-t-0 border-brand-border shadow-2xl">
            {results.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-400 text-center">No matches found.</p>
            ) : (
              results.map((match) => (
                <button
                  key={match.id}
                  onClick={() => {
                    navigate(`/match/${encodeURIComponent(match.id)}`);
                    closeAndClear();
                  }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-white/5 transition-colors cursor-pointer border-b border-brand-border last:border-b-0"
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${match.isLive ? 'bg-brand-live' : 'bg-gray-600'}`} />
                  <span className="min-w-0">
                    <span className="block text-sm text-white truncate">{match.title}</span>
                    {match.competition && <span className="block text-xs text-gray-500 truncate">{match.competition}</span>}
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>
    </header>
  );
}
