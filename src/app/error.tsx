'use client';

import { useEffect } from 'react';
import { ApiOfflinePage } from '../ui/ApiOfflinePage';

// Next's error boundary for everything under this segment — with no nested layout.tsx on
// match/[id] or its stream route, this one file catches a thrown data fetch from any of the
// three server-rendered pages (home, match, stream), most notably every WatchFooty origin being
// down at once (getFeaturedMatches/getMatchDetails throw in that case — see watchfooty.ts).
// Without it, that exception fell through to Next's default framework error page instead of this
// site's own look.
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ApiOfflinePage onRetry={reset} />;
}
