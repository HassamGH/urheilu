import { notFound } from 'next/navigation';
import { getMatchDetails, getStreams } from '../../../api/watchfooty';
import { MatchPage } from '../../../ui/MatchPage';

// No `export const revalidate` here (a prior version of this comment claimed it deduped concurrent
// visitors via ISR — that was never actually true). getStreams always includes a `cacheable: false`
// fetch, and per Next's own rules, any `cache: 'no-store'` fetch inside a route forces that whole
// route to render fresh on every request, silently ignoring its own `revalidate` export. Verified
// directly: three back-to-back requests to this page all took ~6.8s, no speedup between them. The
// only cache that actually helps repeat visits here is next.config.js's `experimental.staleTimes`,
// which governs the browser's client-side Router Cache independently of server rendering mode.
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
