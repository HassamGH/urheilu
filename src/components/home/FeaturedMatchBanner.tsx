import type { Match } from '../../types';
import { navigate } from '../../lib/navigation';
import { formatMatchSchedule, teamInitial } from '../../lib/matchFormatting';
import { TeamLogo } from './TeamLogo';
import { VersusBadge } from './VersusBadge';

export function FeaturedMatchBanner({ match }: { match?: Match }) {
  if (!match) return null;

  const label = match.isLive ? 'Live Now' : 'Featured';
  // `status` is a raw API code ("in", "live") rather than display text, so it's only worth showing
  // when the feed gives us something more descriptive than that.
  const isGenericStatus = !match.status || ['in', 'live'].includes(match.status.toLowerCase());
  const schedule = match.isLive ? (isGenericStatus ? 'In progress' : match.status) : formatMatchSchedule(match.startTime);

  return (
    <section className="relative overflow-hidden border border-brand-border bg-black h-72 md:h-80 mb-8">
      {match.poster && (
        <img src={match.poster} alt="" aria-hidden="true" className="absolute inset-0 w-full h-full object-cover opacity-45" />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black via-black/80 to-black/30" />
      <div className="absolute inset-0 bg-linear-to-r from-black via-black/40 to-transparent" />

      <button
        aria-label={`Watch ${match.title}`}
        className="relative z-10 w-full h-full px-5 md:px-12 py-8 md:py-10 text-left flex flex-col justify-end cursor-pointer group"
        onClick={() => navigate(`/match/${encodeURIComponent(match.id)}`)}
      >
        <div className="flex shrink-0 items-center gap-4 md:gap-6 mb-6">
          <TeamLogo src={match.homeTeamLogo} name={match.homeTeam} fallback={teamInitial(match.homeTeam, match.title, 0)} />
          <VersusBadge />
          <TeamLogo src={match.awayTeamLogo} name={match.awayTeam} fallback={teamInitial(match.awayTeam, match.title, 1)} />
        </div>

        <div className="flex shrink-0 flex-nowrap overflow-hidden items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-300">
          <span className={`inline-flex items-center gap-1.5 shrink-0 ${match.isLive ? 'text-brand-live' : 'text-white'}`}>
            {match.isLive && <span className="w-1.5 h-1.5 rounded-full bg-brand-live animate-pulse" />}
            {label}
          </span>
          {match.competition && (
            <>
              <span className="text-gray-500 shrink-0">/</span>
              <span className="truncate">{match.competition}</span>
            </>
          )}
          <span className="text-gray-500 shrink-0">/</span>
          <span className="normal-case tracking-normal text-gray-400 shrink-0">{schedule}</span>
        </div>

        <h2 className="mt-2 shrink-0 text-3xl md:text-5xl font-black text-white max-w-3xl leading-tight truncate">{match.title}</h2>

        <div className="mt-5 shrink-0 inline-flex w-fit items-center gap-2 bg-white group-hover:bg-gray-200 text-black font-bold px-5 py-3 rounded-sm transition-colors">
          <span className="material-symbols-outlined text-base">play_arrow</span>
          Watch Now
        </div>
      </button>
    </section>
  );
}
