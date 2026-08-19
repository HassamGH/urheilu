import { useRef, useState } from 'react';

// Shared pointer-drag-to-scroll behavior for horizontal rails/carousels — used by both the match
// rail and the featured banner carousel.
//
// `onDragEnd` is optional — when given, it takes over everything that happens once a drag that
// actually moved the rail is released: whether to loop around (see `overscroll`, set when the drag
// was pulled more than `OVERSCROLL_THRESHOLD` past either end — the element itself clamps
// `scrollLeft` there, so this is tracked separately from the un-clamped drag distance) and
// restoring `scrollSnapType`. Without it, the hook just restores snap itself and leaves the
// browser's native snap-back to run (fine for rails with no snap in the first place). The featured
// banner uses it to animate the post-release settle itself instead — native snap-back has no
// duration/easing control and reads as an instant jump, not a felt slide.
export function useDragScroll<T extends HTMLElement>(options?: { onDragEnd?: (overscroll: -1 | 0 | 1, el: T) => void }) {
  const ref = useRef<T>(null);
  const dragState = useRef({ dragging: false, moved: false, startX: 0, startScroll: 0, overscroll: 0 as -1 | 0 | 1 });
  const [isDragging, setIsDragging] = useState(false);
  const OVERSCROLL_THRESHOLD = 60;

  const onPointerDown = (event: React.PointerEvent<T>) => {
    const el = ref.current;
    if (!el || event.pointerType === 'touch') return; // touch already scrolls natively
    dragState.current = { dragging: true, moved: false, startX: event.clientX, startScroll: el.scrollLeft, overscroll: 0 };
  };

  const onPointerMove = (event: React.PointerEvent<T>) => {
    const el = ref.current;
    const state = dragState.current;
    if (!el || !state.dragging) return;
    const delta = event.clientX - state.startX;
    // Only claim pointer capture once this is confirmed to be a drag, not a plain click — capturing
    // on every pointerdown redirects the eventual click's target to the rail itself, which silently
    // breaks a card's onClick for ordinary clicks.
    if (!state.moved && Math.abs(delta) > 3) {
      state.moved = true;
      setIsDragging(true);
      el.setPointerCapture(event.pointerId);
      // CSS scroll-snap (used by the featured banner carousel) fights a manually-driven
      // `scrollLeft` the same way it fights the auto-advance animation — it snaps back toward the
      // nearest snap point after each update, so the drag doesn't visibly track the cursor until
      // release. Switching it off for the drag's duration lets it track smoothly; harmless on
      // rails that don't use snap in the first place.
      el.style.scrollSnapType = 'none';
    }
    if (state.moved) {
      const desired = state.startScroll - delta;
      const maxScroll = el.scrollWidth - el.clientWidth;
      state.overscroll = desired < -OVERSCROLL_THRESHOLD ? -1 : desired > maxScroll + OVERSCROLL_THRESHOLD ? 1 : 0;
      el.scrollLeft = desired;
    }
  };

  const endDrag = (event: React.PointerEvent<T>) => {
    const el = ref.current;
    const state = dragState.current;
    const overscroll = state.overscroll;
    const wasMoved = state.moved;
    if (wasMoved && el?.hasPointerCapture(event.pointerId)) el.releasePointerCapture(event.pointerId);
    state.dragging = false;
    state.overscroll = 0;
    setIsDragging(false);
    if (!el) return;
    if (wasMoved && options?.onDragEnd) {
      options.onDragEnd(overscroll, el);
    } else {
      el.style.scrollSnapType = '';
    }
  };

  // A drag that actually moved the rail shouldn't also fire a child's onClick navigation once the
  // pointer lifts — this runs in the capture phase so it can stop that click before it reaches the child.
  const onClickCapture = (event: React.MouseEvent<T>) => {
    if (dragState.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      dragState.current.moved = false;
    }
  };

  const scrollBy = (direction: number, amount: number) => ref.current?.scrollBy({ left: direction * amount, behavior: 'smooth' });

  return { ref, isDragging, onPointerDown, onPointerMove, onPointerUp: endDrag, onPointerCancel: endDrag, onClickCapture, scrollBy };
}
