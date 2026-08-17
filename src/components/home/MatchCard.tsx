import { useState } from 'react';
import type { Match } from '../../types';
import { navigate } from '../../lib/navigation';
import { CARD_FALLBACK_BACKGROUNDS, hashString } from '../../lib/cardBackgrounds';
import { compactStatus, teamInitial } from '../../lib/matchFormatting';
import { CardBackdrop } from './CardBackdrop';
import { TeamLogo } from './TeamLogo';
import { VersusBadge } from './VersusBadge';

export function MatchCard({ match }: { match: Match }) {
  const fallback = CARD_FALLBACK_BACKGROUNDS[hashString(match.id) % CARD_FALLBACK_BACKGROUNDS.length];
  const [posterFailed, setPosterFailed] = useState(false);
  // Some fixtures (WWE shows, UFC contender series, etc.) have no home/away team at all — the API
  // gives them a single event name instead. Forcing those into a two-team "X vs Y" layout produced
  // nonsense (both sides showing the same sliced-title initials), so they get a plain event card.
  const isEvent = !match.homeTeam && !match.awayTeam;
  const showPoster = isEvent && match.poster && !posterFailed;

  return (
    <article className="min-w-75 md:min-w-100 h-55 relative overflow-hidden border border-brand-border hover:border-white transition-colors group shrink-0 bg-[#0d0d0e]">
      <button aria-label={`Watch ${match.title}`} className="w-full h-full block text-left cursor-pointer" onClick={() => navigate(`/match/${encodeURIComponent(match.id)}`)}>
        {showPoster ? (
          <div className="absolute inset-0 overflow-hidden">
            {/* Some posters resolve to an upstream error page mislabeled as an image — fall back cleanly if it fails to actually decode. */}
            <img src={match.poster} alt="" draggable={false} className="absolute inset-0 w-full h-full object-cover" onError={() => setPosterFailed(true)} />
            <div className="absolute inset-0 bg-linear-to-b from-black/40 via-black/10 to-black/75" />
          </div>
        ) : (
          <CardBackdrop homeSrc={match.homeTeamLogo} awaySrc={match.awayTeamLogo} fallback={fallback} />
        )}

        <div className="absolute top-3 left-3 bg-brand-surface text-white px-2 py-1 rounded text-[10px] font-bold tracking-wide flex items-center gap-1.5 z-10 border border-brand-border">
          <span className={match.isLive ? 'w-1.5 h-1.5 rounded-full bg-brand-live animate-pulse' : 'w-1.5 h-1.5 rounded-full bg-gray-500'} />
          {match.isLive ? 'LIVE' : compactStatus(match)}
        </div>
        {!isEvent && (
          <div className="absolute inset-0 flex items-center justify-center gap-6">
            <TeamLogo src={match.homeTeamLogo} name={match.homeTeam} fallback={teamInitial(match.homeTeam, match.title, 0)} />
            <VersusBadge />
            <TeamLogo src={match.awayTeamLogo} name={match.awayTeam} fallback={teamInitial(match.awayTeam, match.title, 1)} />
          </div>
        )}
        <div className="absolute bottom-0 left-0 w-full bg-black/70 backdrop-blur-md py-2 px-4 text-center text-xs font-semibold text-white border-t border-white/10 z-10 truncate">
          {match.title}
        </div>
      </button>
    </article>
  );
}
