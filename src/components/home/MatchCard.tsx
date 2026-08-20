import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Match } from '../../types';
import { useMarkNavigating } from '../../lib/navigation';
import { getStreamedFightPoster, getStreamedRacingPoster } from '../../api/streamed';
import { CARD_FALLBACK_BACKGROUNDS, hashString } from '../../lib/cardBackgrounds';
import { compactStatus, teamInitial } from '../../lib/matchFormatting';
import { CardBackdrop } from './CardBackdrop';
import { TeamLogo } from './TeamLogo';
import { MatchupDivider } from './MatchupDivider';

export function MatchCard({ match }: { match: Match }) {
  const markNavigating = useMarkNavigating();
  const fallback = CARD_FALLBACK_BACKGROUNDS[hashString(match.id) % CARD_FALLBACK_BACKGROUNDS.length];
  const [posterFailed, setPosterFailed] = useState(false);
  // Some fixtures (WWE shows, UFC contender series, etc.) have no home/away team at all — the API
  // gives them a single event name instead. Forcing those into a two-team "X vs Y" layout produced
  // nonsense (both sides showing the same sliced-title initials), so they get a plain event card.
  const isEvent = !match.homeTeam && !match.awayTeam;
  // Showing just one crest (or none) next to a lettered-initial placeholder for the other team read
  // as broken rather than "no poster yet" — so a two-team match only gets the crest-overlay
  // treatment when BOTH crests are actually available. Missing either one falls through to the same
  // branded urheilu poster CardBackdrop already shows for genuinely teamless events, instead of ever
  // rendering an initials fallback.
  const hasBothTeamLogos = Boolean(match.homeTeamLogo) && Boolean(match.awayTeamLogo);
  // The API supplies a real poster for most fixtures, not just single-event cards — prefer it as
  // the backdrop over the hand-picked gradients in cardBackgrounds.ts, which are only a fallback
  // for the (usually team-vs-team) matches that have no poster at all.
  const hasOwnPoster = Boolean(match.poster) && !posterFailed;

  // WatchFooty's poster asset 500s for most individual fight-card bouts and racing sessions — when
  // that happens (or it never had one), try streamed.pk's own listing for the sport as a second,
  // independent source before giving up and falling back to the plain gradient card. See
  // getStreamedFightPoster / getStreamedRacingPoster.
  const streamedPosterFetcher = match.sportId === 'fighting' ? getStreamedFightPoster : match.sportId === 'racing' ? getStreamedRacingPoster : null;
  const [streamedPoster, setStreamedPoster] = useState<string | undefined>();
  const [streamedPosterChecked, setStreamedPosterChecked] = useState(false);
  const [streamedPosterFailed, setStreamedPosterFailed] = useState(false);
  const needsStreamedPoster = Boolean(streamedPosterFetcher) && !hasOwnPoster && !streamedPosterChecked;

  useEffect(() => {
    if (!needsStreamedPoster || !streamedPosterFetcher) return;
    let cancelled = false;
    streamedPosterFetcher(match.title).then((poster) => {
      if (cancelled) return;
      setStreamedPoster(poster);
      setStreamedPosterChecked(true);
    });
    return () => {
      cancelled = true;
    };
  }, [needsStreamedPoster, streamedPosterFetcher, match.title]);

  const posterSrc = hasOwnPoster ? match.poster : !streamedPosterFailed ? streamedPoster : undefined;
  const showPoster = Boolean(posterSrc);

  return (
    // `w-*` (a definite width), not `min-w-*` — a min-width is only a floor, and with no ceiling a
    // flex item is free to grow past it to fit unwrappable content. The title bar's `truncate` sets
    // `white-space: nowrap`, and a nowrap text node's natural width counts toward this item's
    // content-driven auto sizing, so a long enough title (e.g. "New England Revolution vs New York
    // City FC") silently widened just that one card well past its neighbors' — which `truncate`
    // then had no overflow left to actually ellipsize. Every other card in the same horizontally-
    // scrolling row got stretched to match its height too (flex rows stretch cross-axis by default),
    // leaving visible empty space below their own (shorter, correctly-truncated) title bars. A
    // definite width is a hard ceiling as well as a floor, so every card in a row now renders at
    // the exact same width — restoring both the truncation and the uniform row height.
    <article className="w-55 sm:w-75 md:w-100 relative overflow-hidden border border-brand-border hover:border-white/40 transition-colors group shrink-0 bg-[#0d0d0e]">
      <Link
        href={`/match/${encodeURIComponent(match.id)}`}
        aria-label={`Watch ${match.title}`}
        className="w-full flex flex-col text-left cursor-pointer"
        onClick={markNavigating}
        draggable={false}
      >
        {/* Height tracks the card's own width (16:9) instead of a fixed pixel height — a fixed
            height paired with a width that shrinks/grows across breakpoints skews the effective
            aspect ratio the poster is cropped to, which is what was cutting portions of the image
            off on narrower cards. The title lives in its own row below instead of overlaid on top,
            so the backdrop/poster is never partially covered by it. */}
        <div className="relative aspect-video shrink-0 overflow-hidden">
          {showPoster ? (
            <div className="absolute inset-0 overflow-hidden">
              {/* Some posters resolve to an upstream error page mislabeled as an image — fall back cleanly if it fails to actually decode. */}
              <img
                src={posterSrc}
                alt=""
                draggable={false}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
                onError={() => (hasOwnPoster ? setPosterFailed(true) : setStreamedPosterFailed(true))}
              />
              <div className="absolute inset-0 bg-linear-to-b from-black/40 via-black/10 to-black/40" />
            </div>
          ) : (
            <CardBackdrop
              homeSrc={hasBothTeamLogos ? match.homeTeamLogo : undefined}
              awaySrc={hasBothTeamLogos ? match.awayTeamLogo : undefined}
              fallback={fallback}
            />
          )}

          <div className="absolute top-3 left-3 bg-brand-surface text-white px-2 py-1 rounded text-[10px] font-bold tracking-wide flex items-center gap-1.5 z-10 border border-brand-border">
            <span className={match.isLive ? 'w-1.5 h-1.5 rounded-full bg-brand-live animate-pulse' : 'w-1.5 h-1.5 rounded-full bg-gray-500'} />
            {match.isLive ? 'LIVE' : compactStatus(match)}
          </div>
          {!isEvent && !showPoster && hasBothTeamLogos && (
            <div className="absolute inset-0 flex items-center justify-center gap-6">
              <TeamLogo src={match.homeTeamLogo} name={match.homeTeam} fallback={teamInitial(match.homeTeam, match.title, 0)} />
              <MatchupDivider match={match} />
              <TeamLogo src={match.awayTeamLogo} name={match.awayTeam} fallback={teamInitial(match.awayTeam, match.title, 1)} />
            </div>
          )}
        </div>
        <div className="w-full bg-black py-2 px-4 text-center text-xs font-semibold text-gray-400 border-t border-white/10 truncate">
          {match.title}
        </div>
      </Link>
    </article>
  );
}
