import { useEffect, useState } from 'react';

// Whether a horizontally-scrolling element currently has anything to scroll to — used to hide
// left/right nav arrows when the row's content already fits without overflowing. Re-checks on
// every dep change (new match list swapped in) and on container resize (viewport width change);
// neither alone covers both cases, since the container's own box doesn't change when only its
// children's total width does.
export function useHorizontalOverflow<T extends HTMLElement>(ref: React.RefObject<T | null>, deps: unknown[]) {
  const [canScroll, setCanScroll] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const check = () => setCanScroll(el.scrollWidth > el.clientWidth + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return canScroll;
}
