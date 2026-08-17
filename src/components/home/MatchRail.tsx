import { useRef, useState } from 'react';
import type { Match } from '../../types';
import { MatchCard } from './MatchCard';

export function MatchRail({ title, matches }: { title: string; matches: Match[] }) {
  const railRef = useRef<HTMLDivElement>(null);
  const dragState = useRef({ dragging: false, moved: false, startX: 0, startScroll: 0 });
  const [isDragging, setIsDragging] = useState(false);
  if (matches.length === 0) return null;
  const scroll = (direction: number) => railRef.current?.scrollBy({ left: direction * 420, behavior: 'smooth' });

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    if (!rail || event.pointerType === 'touch') return; // touch already scrolls natively
    dragState.current = { dragging: true, moved: false, startX: event.clientX, startScroll: rail.scrollLeft };
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    const state = dragState.current;
    if (!rail || !state.dragging) return;
    const delta = event.clientX - state.startX;
    // Only claim pointer capture once this is confirmed to be a drag, not a plain click — capturing
    // on every pointerdown redirects the eventual click's target to the rail itself, which silently
    // breaks the card's onClick for ordinary clicks.
    if (!state.moved && Math.abs(delta) > 3) {
      state.moved = true;
      setIsDragging(true);
      rail.setPointerCapture(event.pointerId);
    }
    if (state.moved) rail.scrollLeft = state.startScroll - delta;
  };

  const endDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    const rail = railRef.current;
    if (dragState.current.moved && rail?.hasPointerCapture(event.pointerId)) rail.releasePointerCapture(event.pointerId);
    dragState.current.dragging = false;
    setIsDragging(false);
  };

  // A drag that actually moved the rail shouldn't also fire the card's onClick navigation once the
  // pointer lifts — this runs in the capture phase so it can stop that click before it reaches the card.
  const onClickCapture = (event: React.MouseEvent<HTMLDivElement>) => {
    if (dragState.current.moved) {
      event.preventDefault();
      event.stopPropagation();
      dragState.current.moved = false;
    }
  };

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h2 className="text-xl font-bold m-0 text-white capitalize">{title}</h2>
          <span className="bg-[#1C1C1E] text-gray-400 text-xs px-2 py-0.5 border border-brand-border">{matches.length}</span>
        </div>
        <div className="flex gap-2">
          <button aria-label={`Scroll ${title} left`} onClick={() => scroll(-1)} className="w-8 h-8 flex items-center justify-center border border-brand-border text-gray-400 hover:text-white hover:border-white transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-sm">chevron_left</span>
          </button>
          <button aria-label={`Scroll ${title} right`} onClick={() => scroll(1)} className="w-8 h-8 flex items-center justify-center border border-brand-border text-gray-400 hover:text-white hover:border-white transition-colors cursor-pointer">
            <span className="material-symbols-outlined text-sm">chevron_right</span>
          </button>
        </div>
      </div>
      <div
        className={`flex gap-4 overflow-x-auto hide-scrollbar pb-4 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        ref={railRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
      >
        {matches.map((match) => <MatchCard key={match.id} match={match} />)}
      </div>
    </section>
  );
}
