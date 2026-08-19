'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';

// Same call shape as the old bare `navigate(path)` function (dispatch-event + pushState under
// Vite), just backed by Next's router now — every call site keeps `navigate(path)`, only the
// import changes to `const navigate = useNavigate()` inside the component body, since Next's
// router is hook-only.
export function useNavigate() {
  const router = useRouter();
  return useCallback((path: string) => router.push(path), [router]);
}

// The sport filter lives in the URL (instead of plain component state) so that navigating away
// and pressing back lands on the same filtered view rather than resetting to the unfiltered home page.
export function sportFilterHref(slug: string) {
  return slug === 'all' ? '/' : `/?sport=${encodeURIComponent(slug)}`;
}
