import { useMemo } from 'react';
import type { Match } from '../../types';
import { buildDateGroups, type DateGroup } from '../../lib/dateGroups';
import { buildCompetitionGroups, type CompetitionGroup } from '../../lib/competitionGroups';
import { useDragScroll } from '../../lib/useDragScroll';
import { useHorizontalOverflow } from '../../lib/useHorizontalOverflow';
import { MatchCard } from './MatchCard';
import { DateBadge } from './DateBadge';
import { CompetitionHeader } from './CompetitionHeader';
import { ScrollEdgeFade } from './ScrollEdgeFade';
import { ScrollArrows } from './ScrollArrows';

// One competition's own short rail within a date — its own drag/overflow state, same as the old
// single per-day rail had, just one per competition now instead of one per day.
function CompetitionRail({ group }: { group: CompetitionGroup }) {
  const drag = useDragScroll<HTMLDivElement>();
  const canScroll = useHorizontalOverflow(drag.ref, [group.matches]);

  return (
    <div>
      <CompetitionHeader name={group.name} logo={group.logo} count={group.matches.length} />
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
          {group.matches.map((match) => <MatchCard key={match.id} match={match} />)}
        </div>
        {canScroll && <ScrollEdgeFade />}
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
