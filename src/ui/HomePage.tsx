'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { getMatchesForHomePage, getFeaturedMatches } from '../api/watchfooty';
import { useAsync } from '../api/useAsync';
import type { Match } from '../types';
import { Header } from '../components/layout/Header';
import { SportsFilter } from '../components/home/SportsFilter';
import { FeaturedMatchBanner } from '../components/home/FeaturedMatchBanner';
import { MatchRail } from '../components/home/MatchRail';
import { MatchesByDate } from '../components/home/MatchesByDate';
import { ErrorBlock } from '../components/common/ErrorBlock';
import { EmptyState } from '../components/common/EmptyState';
import { TopLoader } from '../components/common/TopLoader';
import { sportFilterHref, useMarkPageArrived } from '../lib/navigation';
import { orderFeaturedMatches } from '../lib/featuredMatch';
import { sortMatches } from '../lib/sortMatches';

const REFRESH_INTERVAL_MS = 90000;

type SportMatches = { sport: string; matches: Match[] };

// `initialSport` seeds local state rather than staying a controlled prop from the URL: switching
// the sport filter deliberately does NOT go through Next's router (that would trigger a server
// round-trip to re-run the page's Server Component just to change which client-fetched rail is
// shown) — it's handled entirely client-side, exactly like the 90s poll/retry already is, with the
// URL updated cosmetically via `history.pushState` for shareability/back-button support. The
// popstate listener below is what makes back/forward still work correctly for that cosmetic change.
export function HomePage({ sport: initialSport, initialMatches, initialFeatured }: { sport: string; initialMatches?: Match[]; initialFeatured?: Match[] }) {
  // Tells app/loading.tsx the navigation that led here (if any) is over — see its comment.
  const markPageArrived = useMarkPageArrived();
  useEffect(markPageArrived, [markPageArrived]);

  const [sport, setSport] = useState(initialSport);
  // Flips permanently on the first sport change (by click or by popstate) so `initialMatches` —
  // a snapshot from the original server render — is only ever handed to useAsync once, even if the
  // viewer later cycles back to `initialSport`. Without this, useAsync's `refreshIndex` (which only
  // advances on an explicit retry, never on a sport change) would treat every return trip to the
  // original sport as "still the initial load" and reuse that now-stale snapshot instead of
  // fetching fresh data.
  const sportEverChangedRef = useRef(false);

  useEffect(() => {
    const onPopState = () => {
      sportEverChangedRef.current = true;
      setSport(new URLSearchParams(window.location.search).get('sport') || 'all');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // The fetched matches are tagged with the sport they were fetched FOR, not read from the `sport`
  // state directly — `sport` updates the instant a filter pill is clicked, but the underlying
  // fetch takes a moment. Deriving the layout choice (rails-by-sport vs. one date-grouped rail,
  // below) from bare `sport` let the OLD sport's matches render under the NEW sport's layout for
  // that gap — e.g. clicking "All Sports" while viewing Football briefly showed a single
  // "football"-titled rail (the all-sports layout, football's stale data) before the real
  // multi-sport data replaced it. Tagging ties data and layout together atomically: they can only
  // ever change in the same setState call, so that mismatched combination can't render.
  // Memoized rather than a fresh literal per render — useAsync's effect depends on this value's
  // identity, and a new object reference on every render (even one with identical contents) sent it
  // into an infinite render loop: the effect would fire, its setState would trigger a re-render,
  // which recreated the literal, which the effect saw as "changed" again.
  const matchesInitialData = useMemo(
    () => (!sportEverChangedRef.current && sport === initialSport && initialMatches !== undefined ? { sport: initialSport, matches: initialMatches } : undefined),
    [sport, initialSport, initialMatches]
  );
  const matches = useAsync<SportMatches>(
    (signal) => getMatchesForHomePage(sport, signal).then((fetched) => ({ sport, matches: fetched })),
    [sport],
    matchesInitialData
  );

  // Independent of the sport filter — the banner always surfaces the same cross-sport popular/live
  // picks regardless of which rail is currently shown, via the dedicated popular endpoints rather
  // than picking whatever happens to sort first in the filtered listing.
  const featured = useAsync((signal) => getFeaturedMatches(signal), [], initialFeatured);

  useEffect(() => {
    const timer = window.setInterval(() => {
      matches.retry();
      featured.retry();
    }, REFRESH_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [matches.retry, featured.retry]);

  const handleSportChange = (slug: string) => {
    sportEverChangedRef.current = true;
    window.history.pushState({}, '', sportFilterHref(slug));
    setSport(slug);
  };

  // Falls back to `sport` only before anything has ever loaded (matches.data is still null) — once
  // there's data, its own tag is what layout decisions below key off, not the (possibly
  // further-ahead) `sport` state.
  const displayedSport = matches.data?.sport ?? sport;
  const visibleMatches = matches.data?.matches || [];
  const liveMatches = useMemo(() => sortMatches(visibleMatches.filter((match) => match.isLive)), [visibleMatches]);
  const featuredMatches = useMemo(() => orderFeaturedMatches(featured.data || []), [featured.data]);
  // Live matches are excluded here since they already have their own "Live Now" rail above —
  // without this, a live match (e.g. a Premier League fixture kicking off) would render a second
  // time in its sport's section too, reading as the same game shown twice.
  const sectionedMatches = useMemo(() => {
    const groups = new Map<string, Match[]>();
    visibleMatches.forEach((match) => {
      if (match.isLive) return;
      const key = match.sportId || 'Other';
      groups.set(key, [...(groups.get(key) || []), match]);
    });
    return [...groups.entries()].map(([title, items]) => ({ title: title.replaceAll('-', ' '), matches: sortMatches(items) }));
  }, [visibleMatches]);

  // Only the very first load (no data yet, for either the banner or the sport being viewed) shows
  // a loading/error/empty state — a background refresh keeps the previous content mounted instead
  // of tearing it down and rebuilding it, which is what caused the banner/filter to visibly jump.
  const showFeaturedSkeleton = featured.loading && featuredMatches.length === 0;
  const showListError = matches.error && !matches.data;
  const showEmptyState = !matches.loading && !matches.error && visibleMatches.length === 0;

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <div className="relative">
        <Header matches={visibleMatches} />
        {showFeaturedSkeleton && <div className="h-[50vh] md:h-[60vh] bg-[#0d0d0e] animate-pulse" />}
        {featuredMatches.length > 0 && <FeaturedMatchBanner matches={featuredMatches} />}
      </div>
      <main className="w-full px-4 md:px-12 py-6">
        <SportsFilter sport={sport} onChange={handleSportChange} />

        <TopLoader loading={matches.loading} />
        {showListError && <ErrorBlock message="Unable to load matches." onRetry={matches.retry} />}
        {showEmptyState && <EmptyState text={displayedSport === 'all' ? 'No matches are currently available.' : 'No matches available for this sport right now.'} />}
        {displayedSport === 'all' && liveMatches.length > 0 && <MatchRail title="Live Now" matches={liveMatches} />}
        {displayedSport === 'all' && sectionedMatches.map((section) => (
          <MatchRail key={section.title} title={section.title} matches={section.matches} />
        ))}
        {displayedSport !== 'all' && visibleMatches.length > 0 && <MatchesByDate matches={visibleMatches} />}
      </main>
    </div>
  );
}
