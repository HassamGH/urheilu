'use client';

import { useEffect } from 'react';
import { getMatchDetails, getStreams } from '../api/watchfooty';
import { useAsync } from '../api/useAsync';
import type { Match, Stream } from '../types';
import { formatMatchSchedule, teamInitial } from '../lib/matchFormatting';
import { groupStreamsByQuality } from '../lib/streamGroups';
import { useMarkPageArrived } from '../lib/navigation';
import { CARD_FALLBACK_BACKGROUNDS, hashString } from '../lib/cardBackgrounds';
import { ErrorBlock } from '../components/common/ErrorBlock';
import { EmptyState } from '../components/common/EmptyState';
import { TopLoader } from '../components/common/TopLoader';
import { StreamSourceList } from '../components/common/StreamSourceList';
import { CardBackdrop } from '../components/home/CardBackdrop';
import { TeamLogo } from '../components/home/TeamLogo';
import { MatchupDivider } from '../components/home/MatchupDivider';

function MatchHeader({ match }: { match: Match }) {
  const isEvent = !match.homeTeam && !match.awayTeam;
  const fallback = CARD_FALLBACK_BACKGROUNDS[hashString(match.id) % CARD_FALLBACK_BACKGROUNDS.length];

  return (
    <div className="relative h-56 md:h-72 overflow-hidden border-b border-brand-border bg-black">
      {match.poster ? (
        <>
          <img src={match.poster} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover opacity-45" />
          <div className="absolute inset-0 bg-linear-to-t from-black via-black/70 to-black/30" />
        </>
      ) : (
        <CardBackdrop homeSrc={match.homeTeamLogo} awaySrc={match.awayTeamLogo} fallback={fallback} />
      )}

      <div className="relative z-10 w-full h-full max-w-6xl mx-auto px-4 md:px-12 py-6 flex flex-col justify-end">
        {!isEvent && (
          <div className="flex items-center gap-4 md:gap-6 mb-4">
            <TeamLogo src={match.homeTeamLogo} name={match.homeTeam} fallback={teamInitial(match.homeTeam, match.title, 0)} priority />
            <MatchupDivider match={match} priority />
            <TeamLogo src={match.awayTeamLogo} name={match.awayTeam} fallback={teamInitial(match.awayTeam, match.title, 1)} priority />
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-black uppercase tracking-[0.18em] text-gray-300">
          {match.isLive ? (
            <span className="inline-flex items-center gap-1.5 text-brand-live shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-live animate-pulse" />
              Live
            </span>
          ) : (
            <span className="text-white shrink-0">Stream Links</span>
          )}
          {match.competition && (
            <>
              <span className="text-gray-500 shrink-0">/</span>
              <span className="truncate">{match.competition}</span>
            </>
          )}
          <span className="text-gray-500 shrink-0">/</span>
          <span className="normal-case tracking-normal text-gray-400 shrink-0">{formatMatchSchedule(match.startTime)}</span>
        </div>

        <h1 className="mt-2 text-xl md:text-3xl font-black text-white max-w-3xl leading-tight">{match.title}</h1>
      </div>
    </div>
  );
}

export function MatchPage({ matchId, initialMatch, initialStreams }: { matchId: string; initialMatch?: Match; initialStreams?: Stream[] }) {
  // Tells app/loading.tsx the navigation that led here (if any) is over — see its comment.
  const markPageArrived = useMarkPageArrived();
  useEffect(markPageArrived, [markPageArrived]);

  const match = useAsync((signal) => getMatchDetails(matchId, signal), [matchId], initialMatch);
  const streams = useAsync((signal) => getStreams(matchId, match.data?.sportId, signal), [matchId, match.data?.sportId], initialStreams);
  const groups = groupStreamsByQuality(streams.data || []);

  return (
    <div className="min-h-screen bg-brand-bg text-white">
      <TopLoader loading={match.loading || streams.loading} />

      {match.data && <MatchHeader match={match.data} />}

      <main className="w-full max-w-6xl mx-auto px-4 md:px-12 py-8">
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
