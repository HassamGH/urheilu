'use client';

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { TopLoader } from '../components/common/TopLoader';

// Every navigable element in the app (MatchCard, the featured banner's CTA, the header logo/search
// results, stream source buttons, etc.) is a real <Link>, not a button with an onClick handler —
// Next only prefetches a route's data ahead of time for <Link>, not for a programmatic
// router.push(), and since match cards and similar are already on screen (in viewport) well before
// anyone clicks one, that prefetch has almost always already finished by click time. That's what
// makes the transition instant with no loading state at all in the common case, rather than
// patching around loading.tsx after the fact.
//
// The flag below is a safety net for the cases prefetching doesn't cover — a click that lands
// before the prefetch resolves, a slow connection, browser back/forward past what Next's client
// router cache still holds — so navigation never LOOKS broken even when it isn't instant.
const NavigatingContext = createContext(false);
// Not exported directly — components call useMarkNavigating()/useMarkPageArrived() instead of
// touching the setter, so the only ways to flip this are "a <Link> was clicked" and "the
// destination page mounted".
const SetNavigatingContext = createContext<(value: boolean) => void>(() => {});

// Mounted once in the root layout so it covers every route.
export function NavigationProgress({ children }: { children: ReactNode }) {
  const [navigating, setNavigating] = useState(false);

  useEffect(() => {
    // Browser back/forward doesn't go through any <Link> click — it's the browser itself changing
    // the URL, which Next's router intercepts. Most of the time this resolves instantly from
    // Next's own client-side cache of recently-visited segments, but when that cache has expired
    // it triggers a real fetch same as any other navigation, so this needs the same "navigating"
    // treatment as a click does.
    const onPopState = () => setNavigating(true);
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  return (
    <SetNavigatingContext.Provider value={setNavigating}>
      <NavigatingContext.Provider value={navigating}>
        <TopLoader loading={navigating} />
        {children}
      </NavigatingContext.Provider>
    </SetNavigatingContext.Provider>
  );
}

// Attach to a <Link>'s onClick (alongside its href, not instead of it — this only flips the flag,
// it never calls preventDefault, so Link's own navigation still happens normally):
//
//   <Link href={path} onClick={markNavigating}>
//
export function useMarkNavigating() {
  const setNavigating = useContext(SetNavigatingContext);
  return useCallback(() => setNavigating(true), [setNavigating]);
}

// A page component reachable via a <Link> (i.e. every top-level page: HomePage, MatchPage, the
// player page, NotFoundPage) should call this once on mount:
//
//   useEffect(markPageArrived, [markPageArrived]);
//
// so app/loading.tsx knows the navigation that led here has actually finished, not just that Next
// has started rendering something for the route. Safe to call even when the page was reached by a
// fresh/cold navigation (no in-flight navigation at all) — it's just a no-op in that case, since
// `navigating` was already false.
export function useMarkPageArrived() {
  const setNavigating = useContext(SetNavigatingContext);
  return useCallback(() => setNavigating(false), [setNavigating]);
}

export function useNavigating() {
  return useContext(NavigatingContext);
}

// The sport filter lives in the URL (instead of plain component state) so that navigating away
// and pressing back lands on the same filtered view rather than resetting to the unfiltered home page.
export function sportFilterHref(slug: string) {
  return slug === 'all' ? '/' : `/?sport=${encodeURIComponent(slug)}`;
}
