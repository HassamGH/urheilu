import type { Match } from '../../types';

// Sits between the two team logos — uses the match's own competition logo (a real asset from the
// API, same as the team crests) rather than a hand-drawn "VS" icon. Falls back to plain muted text
// when a fixture has no competition logo, which still isn't a drawn graphic.
export function MatchupDivider({ match, size = 'md', priority }: { match: Match; size?: 'md' | 'lg'; priority?: boolean }) {
  if (match.competitionLogo) {
    // TeamLogo is a fixed 64px/80px in every context it's used, so this is sized relative to
    // that (~50%) rather than varying by `size` — big enough to read, clearly secondary to the
    // team crests either side of it.
    return (
      <img
        src={match.competitionLogo}
        alt=""
        draggable={false}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
        className="z-10 shrink-0 w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.7)]"
      />
    );
  }
  const textSize = size === 'lg' ? 'text-sm md:text-base' : 'text-xs';
  return <span className={`z-10 shrink-0 ${textSize} font-bold uppercase tracking-widest text-gray-400`}>vs</span>;
}
