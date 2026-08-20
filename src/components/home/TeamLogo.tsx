'use client';

import { useEffect, useRef, useState } from 'react';

// Crest assets from WatchFooty fail to load (403/503, or resolve to a non-image error page) often
// enough elsewhere in this app that MatchCard already treats it as expected and falls back cleanly
// (see its `onError`/`posterFailed` handling) — this component didn't, so a failed load fell through
// to the browser's own broken-image glyph with the `alt` text rendered beside it. That text isn't
// clipped to the image's box (nothing about object-fit constrains alt text), so it visually spilled
// out of the intended 64px square — worst on a narrow mobile viewport, where there's little room
// for uninvited overflow to begin with.
//
// A plain `onError` prop isn't enough on its own for the `priority` case (`loading="eager"`,
// `fetchPriority="high"`): the server-rendered `<img>` is in the HTML the instant it's parsed, so
// the browser can start — and finish failing — that fetch before React finishes hydrating and
// attaches its synthetic event listener. An error that fires before anything is listening never
// reaches `onError` at all. The `useEffect` below closes that gap by checking, right on mount,
// whether the browser already knows the load failed (`complete && naturalWidth === 0`) — the same
// signal a real error event carries, just read directly instead of waited for.
export function TeamLogo({ src, name, fallback, priority }: { src?: string; name?: string; fallback: string; priority?: boolean }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [src]);

  if (src && !failed) {
    return (
      <img
        ref={imgRef}
        className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.65)] z-10 shrink-0"
        src={src}
        alt={name || ''}
        draggable={false}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center z-10 shrink-0" aria-label={name || fallback}>
      <span
        className="text-2xl font-black text-white drop-shadow-[0_6px_14px_rgba(0,0,0,0.85)]"
        style={{ WebkitTextStroke: '1.5px black', paintOrder: 'stroke fill' }}
      >
        {fallback}
      </span>
    </div>
  );
}
