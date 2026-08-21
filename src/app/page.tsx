import { getMatches, getMatchesForSports, getFeaturedMatches } from '../api/watchfooty';
import { SHOWN_SPORT_SLUGS } from '../lib/sports';
import { HomePage } from '../ui/HomePage';

// No `export const revalidate` here — it would be a no-op. getMatchesForSports/getMatches always
// include at least one `cacheable: false` fetch (see requestJson's comment on why), and per Next's
// own caching rules, any `cache: 'no-store'` fetch inside a route forces that whole route to be
// server-rendered fresh on every request, silently ignoring its own `revalidate` export. Verified
// directly — back-to-back requests to this page showed no speedup at all. The fix for slow
// back/forward navigation lives in next.config.js's `experimental.staleTimes.dynamic` instead, which
// governs the browser's client-side Router Cache independently of server-side rendering mode.
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
