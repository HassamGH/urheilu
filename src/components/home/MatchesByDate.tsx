import { useMemo } from 'react';
import type { Match } from '../../types';
import { buildDateGroups, type DateGroup } from '../../lib/dateGroups';
import { buildCompetitionGroups, type CompetitionGroup } from '../../lib/competitionGroups';
import { useDragScroll } from '../../lib/useDragScroll';
import { useHorizontalOverflow } from '../../lib/useHorizontalOverflow';
import { MatchCard } from './MatchCard';
import { DateBadge } from './DateBadge';
import { CompetitionHeader } from './CompetitionHeader';
import { SegmentHeader } from './SegmentHeader';
import { ScrollEdgeFade } from './ScrollEdgeFade';
import { ScrollArrows } from './ScrollArrows';

// One competition's own short rail within a date — its own drag/overflow state, same as the old
// single per-day rail had, just one per competition now instead of one per day. A row folded
// together from several under-sized competitions (see buildCompetitionGroups) has no single
// competition to head it, so it skips the fixed top header in favor of a small SegmentHeader
// scrolling inline above each competition's own cluster of cards instead.
function CompetitionRail({ group }: { group: CompetitionGroup }) {
  const drag = useDragScroll<HTMLDivElement>();
  const canScroll = useHorizontalOverflow(drag.ref, [group.matches]);
  const isMerged = group.segments.length > 1;

  return (
    <div>
      {!isMerged && <CompetitionHeader name={group.name} logo={group.logo} count={group.matches.length} />}
      <div className="relative">
        <div
          ref={drag.ref}
          className={`flex gap-4 overflow-x-auto hide-scrollbar pb-1 select-none ${canScroll ? (drag.isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''}`}
          onPointerDown={drag.onPointerDown}
          onPointerMove={drag.onPointerMove}
          onPointerUp={drag.onPointerUp}
          onPointerCancel={drag.onPointerCancel}
          onClickCapture={drag.onClickCapture}
        >
          {isMerged
            ? group.segments.map((segment) => (
                <div key={segment.key} className="flex flex-col gap-3 shrink-0">
                  {/* `sticky left-0` instead of scrolling off with its cards — the label stays put at the
                      row's left edge for as long as any of its own cards are still in view, then gets
                      pushed along once the next segment's cards arrive, the same way a sticky table header
                      behaves. A backdrop is needed since it now sits stacked over whatever card scrolls
                      underneath it rather than the plain row background. */}
                  <div className="sticky left-0 z-10 w-fit bg-brand-bg/90 backdrop-blur-sm pr-3 rounded-sm">
                    <SegmentHeader name={segment.name} logo={segment.logo} count={segment.matches.length} />
                  </div>
                  <div className="flex gap-4">
                    {segment.matches.map((match) => <MatchCard key={match.id} match={match} />)}
                  </div>
                </div>
              ))
            : group.matches.map((match) => <MatchCard key={match.id} match={match} />)}
        </div>
        {/* Left fade always shows, even when the row's cards all fit and there's nothing to scroll to
            — see the `sides` comment on ScrollEdgeFade. Right fade shows either when there's actually
            more to scroll to (`canScroll`) or once a row has enough cards (3+) that it reads as a
            "row", not a couple of cards sitting alone — at that count the right edge is expected to
            hint at more, the same way it does on rows that do overflow, even on a wide-enough viewport
            where these particular 3 happen to still fit. */}
        <ScrollEdgeFade sides={canScroll || group.matches.length >= 3 ? 'both' : 'left'} top={isMerged ? 'top-7' : undefined} />
        {canScroll && <ScrollArrows onLeft={() => drag.scrollBy(-1, 420)} onRight={() => drag.scrollBy(1, 420)} />}
      </div>
    </div>
  );
}

// One calendar day — split into its own competitions (see buildCompetitionGroups) rather than one
// flat rail of every match on that date. A quiet sport/day might only ever produce one competition
// group, in which case this looks exactly like the old single-rail layout; a busy football day
// with matches across a dozen leagues gets a dozen short, labeled rails instead of one indistinct
// wall of cards a viewer would have to scroll through blind to find the league they wanted.
function DayRail({ group }: { group: DateGroup }) {
  const competitionGroups = useMemo(() => buildCompetitionGroups(group.matches), [group.matches]);

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:gap-6 mb-10">
      <DateBadge dateKey={group.key} />
      <div className="flex-1 min-w-0 flex flex-col gap-6">
        {competitionGroups.map((competitionGroup) => (
          <CompetitionRail key={competitionGroup.key} group={competitionGroup} />
        ))}
      </div>
    </div>
  );
}

export function MatchesByDate({ matches }: { matches: Match[] }) {
  const groups = useMemo(() => buildDateGroups(matches), [matches]);
  if (groups.length === 0) return null;

  return (
    <div className="mb-8">
      {groups.map((group) => <DayRail key={group.key} group={group} />)}
    </div>
  );
}
