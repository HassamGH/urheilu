'use client';

import { createContext, useCallback, useContext, useState, useTransition, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { TopLoader } from '../components/common/TopLoader';

type NavigateFn = (path: string) => void;

// Shared across every useNavigate() call site so they all drive the SAME "is a navigation in
// flight" flag, letting the one TopLoader rendered below reflect it regardless of which component
// triggered it, instead of each caller needing its own pending state.
const NavigateContext = createContext<NavigateFn>(() => {});
const NavigatingContext = createContext(false);
// Not exported — only app/loading.tsx (see the comment there) needs to call this, and only from
// inside a page component's own mount effect, so it isn't a general-purpose API.
const MarkArrivedContext = createContext<() => void>(() => {});

// Wrapping router.push in a transition marks the update as non-urgent (React can keep the current
// page interactive a moment longer) but its `isPending` flips back to false as soon as React
// commits to SOMETHING for the new route — including the target route's loading.tsx fallback
// itself, which is exactly the moment we still need to keep showing our own "navigating" signal
// through. So `navigating` is tracked separately as plain state: true from the moment navigate()
// is called, and only cleared once the destination page has actually mounted and called
// markArrived() (see the pattern in HomePage/MatchPage/etc.) — not merely once Next has decided
// what to render in the meantime.
export function NavigationProgress({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [navigating, setNavigating] = useState(false);
  const navigate: NavigateFn = (path) => {
    setNavigating(true);
    startTransition(() => router.push(path));
  };
  const markArrived = useCallback(() => setNavigating(false), []);
  return (
    <NavigateContext.Provider value={navigate}>
      <NavigatingContext.Provider value={navigating}>
        <MarkArrivedContext.Provider value={markArrived}>
          <TopLoader loading={navigating} />
          {children}
        </MarkArrivedContext.Provider>
      </NavigatingContext.Provider>
    </NavigateContext.Provider>
  );
}

// Same call shape as the old bare `navigate(path)` function — every call site keeps
// `navigate(path)`, just via `const navigate = useNavigate()` inside the component body, since
// this needs to be the SHARED navigate from NavigationProgress above, not a bare `router.push`.
export function useNavigate() {
  return useContext(NavigateContext);
}

// A page component that can be reached via useNavigate() (i.e. every top-level page: HomePage,
// MatchPage, the player page, NotFoundPage) should call this once on mount:
//
//   useEffect(markPageArrived, [markPageArrived]);
//
// so app/loading.tsx knows the navigation that led here has actually finished, not just that Next
// has started rendering something for the route. Safe to call even when the page was reached by a
// fresh/cold navigation (no in-flight `navigate()` call) — it's just a no-op in that case, since
// `navigating` was already false.
export function useMarkPageArrived() {
  return useContext(MarkArrivedContext);
}

export function useNavigating() {
  return useContext(NavigatingContext);
}

// The sport filter lives in the URL (instead of plain component state) so that navigating away
// and pressing back lands on the same filtered view rather than resetting to the unfiltered home page.
export function sportFilterHref(slug: string) {
  return slug === 'all' ? '/' : `/?sport=${encodeURIComponent(slug)}`;
}
