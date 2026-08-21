import { notFound } from 'next/navigation';
import { getMatchDetails, getStreams } from '../../../api/watchfooty';
import { MatchPage } from '../../../ui/MatchPage';

// Caches this route's rendered output per matchId — many concurrent visitors opening the same
// popular fixture (a live match especially) were each triggering their own full getMatchDetails +
// getStreams round trip to WatchFooty; ISR now lets them share one render per 20s window instead.
// 20s matches the Data Cache TTL on the underlying fetches (see watchfooty.ts's requestJson), so
// this never serves anything staler than those already would on their own.
export const revalidate = 20;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = decodeURIComponent(id);

  // getMatchDetails throwing means "this specific match is gone" (rolled off the listing, bad id),
  // not an API outage — routing it to notFound() instead of letting it reach app/error.tsx keeps a
  // single missing fixture from rendering the site-wide "Scores are offline" page.
  let match;
  try {
    match = await getMatchDetails(matchId);
  } catch {
    notFound();
  }
  const streams = await getStreams(matchId, match.sportId);

  return <MatchPage matchId={matchId} initialMatch={match} initialStreams={streams} />;
}
