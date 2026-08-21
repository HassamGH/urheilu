import { notFound } from 'next/navigation';
import { getMatchDetails, getStreams } from '../../../../../api/watchfooty';
import { PlayerPageClient } from './player-page-client';

// See the matching comment on the match page's revalidate — same reasoning, same TTL.
export const revalidate = 20;

export default async function Page({ params }: { params: Promise<{ id: string; streamId: string }> }) {
  const { id, streamId } = await params;
  const matchId = decodeURIComponent(id);

  // See the matching comment on the match page — a missing match isn't a total-outage.
  let match;
  try {
    match = await getMatchDetails(matchId);
  } catch {
    notFound();
  }
  const streams = await getStreams(matchId, match.sportId);

  return <PlayerPageClient matchId={matchId} streamId={decodeURIComponent(streamId)} initialMatch={match} initialStreams={streams} />;
}
