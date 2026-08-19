import { getMatchDetails, getStreams } from '../../../../../api/watchfooty';
import { PlayerPageClient } from './player-page-client';

export default async function Page({ params }: { params: Promise<{ id: string; streamId: string }> }) {
  const { id, streamId } = await params;
  const matchId = decodeURIComponent(id);
  const match = await getMatchDetails(matchId);
  const streams = await getStreams(matchId, match.sportId);

  return <PlayerPageClient matchId={matchId} streamId={decodeURIComponent(streamId)} initialMatch={match} initialStreams={streams} />;
}
