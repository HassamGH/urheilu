import { getMatchDetails, getStreams } from '../../../api/watchfooty';
import { MatchPage } from '../../../ui/MatchPage';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const matchId = decodeURIComponent(id);
  const match = await getMatchDetails(matchId);
  const streams = await getStreams(matchId, match.sportId);

  return <MatchPage matchId={matchId} initialMatch={match} initialStreams={streams} />;
}
