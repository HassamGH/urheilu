'use client';

import { useEffect, useRef, useState } from 'react';

// A small header inline above one competition's own cluster of cards within a merged rail (see
// buildCompetitionGroups' MIN_ROW_SIZE) — a scaled-down CompetitionHeader that scrolls with its
// cards instead of sitting fixed above the whole row, so the label "restarts" at the start of every
// competition packed into that row instead of appearing once for the whole thing.
export function SegmentHeader({ name, logo, count }: { name: string; logo?: string; count: number }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [logo]);

  return (
    <div className="flex items-center gap-2">
      {logo && !failed ? (
        <img
          ref={imgRef}
          src={logo}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          className="w-4 h-4 object-contain shrink-0"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="material-symbols-outlined text-gray-500 text-base! shrink-0">emoji_events</span>
      )}
      <h4 className="text-xs font-bold text-white truncate min-w-0">{name}</h4>
      <span className="shrink-0 text-[10px] text-gray-500">{count}</span>
    </div>
  );
}
