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
  const match = await getMatchDetails(matchId);
  const streams = await getStreams(matchId, match.sportId);

  return <MatchPage matchId={matchId} initialMatch={match} initialStreams={streams} />;
}
