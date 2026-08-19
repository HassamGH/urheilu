'use client';

import { getMatchDetails, getStreams } from '../api/watchfooty';
import { useAsync } from '../api/useAsync';
import type { Match, Stream } from '../types';
import { formatMatchSchedule } from '../lib/matchFormatting';
import { groupStreamsByQuality } from '../lib/streamGroups';
import { ErrorBlock } from '../components/common/ErrorBlock';
import { EmptyState } from '../components/common/EmptyState';
import { TopLoader } from '../components/common/TopLoader';
import { StreamSourceList } from '../components/common/StreamSourceList';

export function MatchPage({ matchId, initialMatch, initialStreams }: { matchId: string; initialMatch?: Match; initialStreams?: Stream[] }) {
  const match = useAsync((signal) => getMatchDetails(matchId, signal), [matchId], initialMatch);
  const streams = useAsync((signal) => getStreams(matchId, match.data?.sportId, signal), [matchId, match.data?.sportId], initialStreams);
  const groups = groupStreamsByQuality(streams.data || []);

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <TopLoader loading={match.loading || streams.loading} />
      <main className="w-full max-w-6xl mx-auto px-4 md:px-12 py-8">
        {match.data && (
          <div className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold">{match.data.title} Stream Links</h1>
            <div className="flex items-center gap-3 mt-2">
              {match.data.isLive && (
                <span className="inline-flex items-center gap-1.5 text-brand-live text-xs font-bold uppercase tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-live animate-pulse" />
                  Live
                </span>
              )}
              <p className="text-gray-400 text-sm">{formatMatchSchedule(match.data.startTime)}</p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-8 items-start">
          <div className="order-2 lg:order-1 min-w-0">
            {streams.error && <ErrorBlock message="Unable to load available streams." onRetry={streams.retry} />}
            {!streams.loading && !streams.error && groups.length === 0 && <EmptyState text="No streams are currently available for this match." />}
            <StreamSourceList groups={groups} matchId={matchId} />
          </div>

          <aside className="order-1 lg:order-2 lg:sticky lg:top-24 border border-brand-border bg-brand-surface p-5">
            <h3 className="font-bold text-sm mb-2">Playback tips</h3>
            <p className="text-gray-400 text-sm mb-3">Smooth watching comes down to your network and the feed you pick — not every source will feel the same.</p>
            <ul className="list-disc list-inside text-gray-400 text-sm space-y-1.5">
              <li>Live streams depend on your connection — a weak or unstable Wi-Fi/mobile signal is the most common cause of buffering.</li>
              <li>Brief freezes or rebuffers are normal during peak traffic. Give the player a few seconds before switching sources.</li>
              <li>If a feed keeps stuttering, try another source. HD needs more bandwidth; SD is often steadier on slower connections.</li>
              <li>Close other tabs and apps using data, and avoid VPNs when possible — they can add lag and dropouts.</li>
            </ul>
          </aside>
        </div>
      </main>
    </div>
  );
}
