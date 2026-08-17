import { useEffect, useMemo, useState } from 'react';
import { getMatches, getMatchesForSports } from '../api/watchfooty';
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
import { pickFeaturedMatch } from '../lib/featuredMatch';
import { sortMatches } from '../lib/sortMatches';

// `sport` is a controlled prop (App derives it from the URL) rather than state HomePage tracks
// itself — App's navigate preload swaps the URL and the matching data together without firing a
// popstate event, so a self-managed popstate listener here would go stale the moment that happens.
export function HomePage({ sport, initialMatches }: { sport: string; initialMatches?: Match[] }) {
  const [query, setQuery] = useState('');
  const matches = useAsync(
    (signal) => (sport === 'all' ? getMatchesForSports(SHOWN_SPORT_SLUGS, signal) : getMatches(sport, signal)),
    [sport],
    initialMatches
  );

  useEffect(() => {
    const timer = window.setInterval(matches.retry, 90000);
    return () => window.clearInterval(timer);
  }, [matches.retry]);

  const handleSportChange = (slug: string) => navigate(sportFilterHref(slug));

  const visibleMatches = useMemo(() => {
    const term = query.trim().toLowerCase();
    const base = matches.data || [];
    if (!term) return base;
    return base.filter((match) => [match.title, match.homeTeam, match.awayTeam, match.competition].some((value) => value?.toLowerCase().includes(term)));
  }, [matches.data, query]);

  const liveMatches = useMemo(() => sortMatches(visibleMatches.filter((match) => match.isLive)), [visibleMatches]);
  const primaryFeatured = useMemo(() => pickFeaturedMatch(visibleMatches), [visibleMatches]);

  // If the currently filtered sport has nothing live/upcoming to feature, fall back to the best
  // match across every shown sport rather than leaving the banner slot empty. Only fires the extra
  // request when it's actually needed, since it pulls in sports outside the current filter.
  const needsFallbackFeatured = sport !== 'all' && !matches.loading && !matches.error && !primaryFeatured;
  const fallbackFeatured = useAsync(
    async (signal) => {
      if (!needsFallbackFeatured) return undefined;
      const all = await getMatchesForSports(SHOWN_SPORT_SLUGS, signal);
      return pickFeaturedMatch(all);
    },
    [needsFallbackFeatured]
  );
  const featuredMatch = primaryFeatured || fallbackFeatured.data || undefined;
  const sectionedMatches = useMemo(() => {
    const groups = new Map<string, Match[]>();
    visibleMatches.forEach((match) => {
      const key = match.sportId || 'Other';
      groups.set(key, [...(groups.get(key) || []), match]);
    });
    return [...groups.entries()].map(([title, items]) => ({ title: title.replaceAll('-', ' '), matches: sortMatches(items) }));
  }, [visibleMatches]);

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <Header query={query} onQuery={setQuery} />
      <main className="w-full px-4 md:px-12 py-6">
        {!matches.loading && !matches.error && <FeaturedMatchBanner match={featuredMatch} />}
        <SportsFilter sport={sport} onChange={handleSportChange} />

        <TopLoader loading={matches.loading} />
        {matches.error && <ErrorBlock message="Unable to load matches." onRetry={matches.retry} />}
        {!matches.loading && !matches.error && visibleMatches.length === 0 && <EmptyState text={sport === 'all' ? 'No matches are currently available.' : 'No matches available for this sport right now.'} />}
        {!matches.loading && !matches.error && sport === 'all' && liveMatches.length > 0 && <MatchRail title="Live Now" matches={liveMatches} />}
        {!matches.loading && !matches.error && sport === 'all' && sectionedMatches.map((section) => (
          <MatchRail key={section.title} title={section.title} matches={section.matches} />
        ))}
        {!matches.loading && !matches.error && sport !== 'all' && <MatchesByDate matches={visibleMatches} />}
      </main>
    </div>
  );
}
