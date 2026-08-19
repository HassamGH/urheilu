import { useMemo } from 'react';
import type { Match } from '../../types';
import { buildDateGroups, type DateGroup } from '../../lib/dateGroups';
import { useDragScroll } from '../../lib/useDragScroll';
import { useHorizontalOverflow } from '../../lib/useHorizontalOverflow';
import { MatchCard } from './MatchCard';
import { DateBadge } from './DateBadge';
import { ScrollEdgeFade } from './ScrollEdgeFade';
import { ScrollArrows } from './ScrollArrows';

function DayRail({ group }: { group: DateGroup }) {
  const drag = useDragScroll<HTMLDivElement>();
  const canScroll = useHorizontalOverflow(drag.ref, [group.matches]);

  return (
    <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 md:gap-6 mb-8">
      <DateBadge dateKey={group.key} />
      <div className="flex-1 min-w-0 relative">
        <div
          ref={drag.ref}
          className={`flex gap-4 overflow-x-auto hide-scrollbar pb-1 select-none ${drag.isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
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

export function MatchesByDate({ matches }: { matches: Match[] }) {
  const groups = useMemo(() => buildDateGroups(matches), [matches]);
  if (groups.length === 0) return null;

  return (
    <div className="mb-8">
      {groups.map((group) => <DayRail key={group.key} group={group} />)}
    </div>
  );
}
