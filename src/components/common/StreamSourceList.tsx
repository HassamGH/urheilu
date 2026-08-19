import Link from 'next/link';
import type { Stream } from '../../types';
import { languageTag } from '../../lib/streamGroups';
import { useMarkNavigating } from '../../lib/navigation';

const QUALITY_BADGE_STYLE: Record<string, string> = {
  HD: 'bg-green-500 text-black',
  SD: 'bg-gray-500 text-black'
};

export function StreamSourceList({
  groups,
  matchId,
  selectedStreamId
}: {
  groups: { quality: string; streams: Stream[] }[];
  matchId: string;
  selectedStreamId?: string;
}) {
  const markNavigating = useMarkNavigating();
  return (
    <div className="grid gap-1">
      {groups.map((group) => (
        <section key={group.quality} className="border border-brand-border bg-brand-surface">
          <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border">
            <h2 className="text-xs font-bold tracking-wider text-gray-300 uppercase">{group.quality} Sources</h2>
            <span className="text-xs text-gray-500">{group.streams.length} source{group.streams.length === 1 ? '' : 's'}</span>
          </div>
          <div>
            {group.streams.map((stream, index) => {
              const isSelected = stream.id === selectedStreamId;
              return (
                <Link
                  key={stream.id}
                  href={`/match/${encodeURIComponent(matchId)}/stream/${encodeURIComponent(stream.id)}`}
                  onClick={markNavigating}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-3 border-t border-brand-border first:border-t-0 transition-colors cursor-pointer text-left ${isSelected ? 'bg-white/10' : 'hover:bg-white/5'}`}
                >
                  <span className="flex items-center gap-3 min-w-0">
                    <span className={`shrink-0 px-1.5 py-0.5 rounded text-[10px] font-bold ${QUALITY_BADGE_STYLE[group.quality] || 'bg-gray-600 text-white'}`}>
                      {group.quality}
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-2">
                        <span className="font-semibold text-sm">SERVER [{index + 1}]</span>
                        {isSelected && <span className="text-[10px] text-brand-live font-bold uppercase tracking-wide shrink-0">Playing</span>}
                      </span>
                      {stream.sourceLabel && (
                        <span className="block text-xs text-gray-500 truncate" title={`Unconfirmed match — labeled "${stream.sourceLabel}" at the source`}>
                          {stream.sourceLabel}
                        </span>
                      )}
                    </span>
                  </span>
                  <span className="text-xs text-gray-500 font-medium">{languageTag(stream.language)}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
