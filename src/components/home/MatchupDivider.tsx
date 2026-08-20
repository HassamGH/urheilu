'use client';

import { useEffect, useRef, useState } from 'react';
import type { Match } from '../../types';

// Sits between the two team logos — uses the match's own competition logo (a real asset from the
// API, same as the team crests) rather than a hand-drawn "VS" icon. Falls back to plain muted text
// when a fixture has no competition logo, which still isn't a drawn graphic — and to that same text
// if the asset exists but fails to actually load. See the matching comment on TeamLogo's `useEffect`
// for why a plain `onError` prop alone isn't enough for the `priority` case.
export function MatchupDivider({ match, size = 'md', priority }: { match: Match; size?: 'md' | 'lg'; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const textSize = size === 'lg' ? 'text-sm md:text-base' : 'text-xs';

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [match.competitionLogo]);

  if (match.competitionLogo && !failed) {
    // TeamLogo is a fixed 64px/80px in every context it's used, so this is sized relative to
    // that (~50%) rather than varying by `size` — big enough to read, clearly secondary to the
    // team crests either side of it.
    return (
      <img
        ref={imgRef}
        src={match.competitionLogo}
        alt=""
        draggable={false}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
        className="z-10 shrink-0 w-8 h-8 md:w-10 md:h-10 object-contain drop-shadow-[0_6px_14px_rgba(0,0,0,0.7)]"
        onError={() => setFailed(true)}
      />
    );
  }
  return <span className={`z-10 shrink-0 ${textSize} font-bold uppercase tracking-widest text-gray-400`}>vs</span>;
}
