import { getMatches, getMatchesForSports, getFeaturedMatches } from '../api/watchfooty';
import { SHOWN_SPORT_SLUGS } from '../lib/sports';
import { HomePage } from '../ui/HomePage';

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
