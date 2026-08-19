import { useEffect, useMemo } from 'react';
import { getMatches, getMatchesForSports, getFeaturedMatches } from '../api/watchfooty';
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
import { SHOWN_SPORT_SLUGS } from '../lib/sports';
import { navigate, sportFilterHref } from '../lib/navigation';
import { orderFeaturedMatches } from '../lib/featuredMatch';
import { sortMatches } from '../lib/sortMatches';

const REFRESH_INTERVAL_MS = 90000;

// `sport` is a controlled prop (App derives it from the URL) rather than state HomePage tracks
// itself — App's navigate preload swaps the URL and the matching data together without firing a
// popstate event, so a self-managed popstate listener here would go stale the moment that happens.
export function HomePage({ sport, initialMatches, initialFeatured }: { sport: string; initialMatches?: Match[]; initialFeatured?: Match[] }) {
  const matches = useAsync(
    (signal) => (sport === 'all' ? getMatchesForSports(SHOWN_SPORT_SLUGS, signal) : getMatches(sport, signal)),
    [sport],
    initialMatches
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

  const handleSportChange = (slug: string) => navigate(sportFilterHref(slug));

  const visibleMatches = matches.data || [];
  const liveMatches = useMemo(() => sortMatches(visibleMatches.filter((match) => match.isLive)), [visibleMatches]);
  const featuredMatches = useMemo(() => orderFeaturedMatches(featured.data || []), [featured.data]);
  const sectionedMatches = useMemo(() => {
    const groups = new Map<string, Match[]>();
    visibleMatches.forEach((match) => {
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
        {showEmptyState && <EmptyState text={sport === 'all' ? 'No matches are currently available.' : 'No matches available for this sport right now.'} />}
        {sport === 'all' && liveMatches.length > 0 && <MatchRail title="Live Now" matches={liveMatches} />}
        {sport === 'all' && sectionedMatches.map((section) => (
          <MatchRail key={section.title} title={section.title} matches={section.matches} />
        ))}
        {sport !== 'all' && visibleMatches.length > 0 && <MatchesByDate matches={visibleMatches} />}
      </main>
    </div>
  );
}
