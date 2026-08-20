'use client';

import { useEffect, useRef, useState } from 'react';

// The small heading above one competition's rail within a date — logo (if the API has one and it
// actually loads; see the matching onError/mount-check pattern on TeamLogo) or a generic trophy
// glyph, the competition name, and a match count.
export function CompetitionHeader({ name, logo, count }: { name: string; logo?: string; count: number }) {
  const [failed, setFailed] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (img && img.complete && img.naturalWidth === 0) setFailed(true);
  }, [logo]);

  return (
    <div className="flex items-center gap-2.5 mb-3">
      {logo && !failed ? (
        <img
          ref={imgRef}
          src={logo}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          className="w-5 h-5 object-contain shrink-0"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="material-symbols-outlined text-gray-500 text-lg! shrink-0">emoji_events</span>
      )}
      <h3 className="text-sm font-bold text-white truncate">{name}</h3>
      <span className="shrink-0 text-[11px] text-gray-500">{count}</span>
    </div>
  );
}
