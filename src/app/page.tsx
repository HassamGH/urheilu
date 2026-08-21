import { getMatches, getMatchesForSports, getFeaturedMatches } from '../api/watchfooty';
import { SHOWN_SPORT_SLUGS } from '../lib/sports';
import { HomePage } from '../ui/HomePage';

// Without this, the page has no ISR entry at all — fully dynamic — which means Next's client-side
// Router Cache won't hold onto it either (staleTimes.dynamic defaults to 0), so pressing back from a
// match page always re-runs the full getMatchesForSports/getFeaturedMatches fetch from scratch,
// including the multi-origin fallback chain if the primary is slow that day. Same 20s window as the
// match page's own revalidate (see its comment) — back/forward now reuses that instead of paying for
// a fresh multi-second fetch every time.
export const revalidate = 20;

export default async function Page({ searchParams }: { searchParams: Promise<{ sport?: string }> }) {
  const sport = (await searchParams).sport || 'all';
  // Fetched together (not left to HomePage's own client effect) so the SSR'd HTML has both the
  // match list and the featured banner already in it — matching the old preloadRoute's behavior of
  // gating on both before ever swapping the page in.
  const [matches, featured] = await Promise.all([
    sport === 'all' ? getMatchesForSports(SHOWN_SPORT_SLUGS) : getMatches(sport),
    getFeaturedMatches()
  ]);

  return <HomePage sport={sport} initialMatches={matches} initialFeatured={featured} />;
}
