'use client';

import dynamic from 'next/dynamic';
import type { Match, Stream } from '../../../../../types';

// hls.js (pulled in by PlayerPage) is the single heaviest dependency in the app but only ever
// needed once a viewer actually opens a stream — split out of the main bundle so every other route
// never has to download or parse it. `ssr: false` is only valid inside a Client Component in the
// App Router, which is the entire reason this wrapper exists instead of dynamic-importing directly
// from the (Server Component) page.
const PlayerPage = dynamic(() => import('../../../../../ui/PlayerPage').then((module) => module.PlayerPage), {
  ssr: false,
  loading: () => <div className="fixed inset-0 bg-black" />
});

export function PlayerPageClient(props: { matchId: string; streamId: string; initialMatch?: Match; initialStreams?: Stream[] }) {
  return <PlayerPage {...props} />;
}
