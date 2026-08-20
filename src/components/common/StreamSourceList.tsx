import Link from 'next/link';
import type { Stream } from '../../types';
import { languageTag } from '../../lib/streamGroups';
import { useMarkNavigating } from '../../lib/navigation';

const QUALITY_BADGE_STYLE: Record<string, string> = {
  HD: 'bg-green-500 text-black',
  SD: 'bg-gray-500 text-black'
};

const STREAM_TYPE_ICON: Record<Stream['type'], string> = {
  hls: 'live_tv',
  dash: 'live_tv',
  video: 'smart_display',
  embed: 'open_in_new',
  unknown: 'play_circle'
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
    <div className="grid gap-6">
      {groups.map((group) => (
        <section key={group.quality}>
          <div className="flex items-center gap-3 mb-3">
            <span className={`shrink-0 px-2 py-0.5 text-[11px] font-black tracking-wide ${QUALITY_BADGE_STYLE[group.quality] || 'bg-gray-600 text-white'}`}>
              {group.quality}
            </span>
            <h2 className="shrink-0 text-xs font-bold tracking-wider text-gray-400 uppercase">Sources</h2>
            <span className="shrink-0 text-xs text-gray-500">
              {group.streams.length} available
            </span>
            <div className="h-px flex-1 bg-brand-border" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {group.streams.map((stream, index) => {
              const isSelected = stream.id === selectedStreamId;
              return (
                <Link
                  key={stream.id}
                  href={`/match/${encodeURIComponent(matchId)}/stream/${encodeURIComponent(stream.id)}`}
                  onClick={markNavigating}
                  className={`group relative flex flex-col gap-2.5 border p-4 transition-colors cursor-pointer ${
                    isSelected ? 'border-white bg-white/10' : 'border-brand-border bg-brand-surface hover:border-white/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-2 min-w-0">
                      <span className="material-symbols-outlined text-lg! text-gray-500 group-hover:text-white transition-colors shrink-0">
                        {STREAM_TYPE_ICON[stream.type]}
                      </span>
                      <span className="font-bold text-sm truncate">Server {index + 1}</span>
                    </span>
                    <span className="shrink-0 text-[10px] font-bold text-gray-500 uppercase tracking-wide">{languageTag(stream.language)}</span>
                  </div>

                  {stream.sourceLabel && (
                    <span
                      className="block text-xs text-gray-500 truncate"
                      title={`Unconfirmed match — labeled "${stream.sourceLabel}" at the source`}
                    >
                      {stream.sourceLabel}
                    </span>
                  )}

                  <div className="mt-auto pt-0.5">
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-brand-live">
                        <span className="w-1.5 h-1.5 rounded-full bg-brand-live animate-pulse" />
                        Playing
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-gray-500 group-hover:text-white transition-colors">
                        <span className="material-symbols-outlined text-sm!">play_arrow</span>
                        Watch
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
