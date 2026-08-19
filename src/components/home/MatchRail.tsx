import type { Match } from '../../types';
import { useDragScroll } from '../../lib/useDragScroll';
import { useHorizontalOverflow } from '../../lib/useHorizontalOverflow';
import { MatchCard } from './MatchCard';
import { ScrollEdgeFade } from './ScrollEdgeFade';
import { ScrollArrows } from './ScrollArrows';

export function MatchRail({ title, matches }: { title: string; matches: Match[] }) {
  const drag = useDragScroll<HTMLDivElement>();
  const canScroll = useHorizontalOverflow(drag.ref, [matches]);
  if (matches.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center gap-3 mb-3">
        <h2 className="text-xl font-bold m-0 text-white capitalize">{title}</h2>
        <span className="bg-[#1C1C1E] text-gray-400 text-xs px-2 py-0.5 border border-brand-border">{matches.length}</span>
      </div>
      <div className="relative">
        <div
          className={`flex gap-4 overflow-x-auto hide-scrollbar pb-4 select-none ${drag.isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          ref={drag.ref}
          onPointerDown={drag.onPointerDown}
          onPointerMove={drag.onPointerMove}
          onPointerUp={drag.onPointerUp}
          onPointerCancel={drag.onPointerCancel}
          onClickCapture={drag.onClickCapture}
        >
          {matches.map((match) => <MatchCard key={match.id} match={match} />)}
        </div>
        {canScroll && <ScrollEdgeFade />}
        {canScroll && <ScrollArrows onLeft={() => drag.scrollBy(-1, 420)} onRight={() => drag.scrollBy(1, 420)} />}
      </div>
    </section>
  );
}
