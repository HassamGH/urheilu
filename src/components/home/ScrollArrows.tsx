// Overlay chevrons on the left/right edges of a horizontally-scrolling row — shared by the home
// page rails and the selected-sport page's per-day rails so both scroll the same way.
export function ScrollArrows({ onLeft, onRight }: { onLeft: () => void; onRight: () => void }) {
  return (
    <>
      <button
        aria-label="Scroll left"
        onClick={onLeft}
        className="absolute z-20 left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 hidden sm:flex items-center justify-center bg-brand-surface border border-brand-border text-gray-400 hover:text-white hover:border-white/40 transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-sm">chevron_left</span>
      </button>
      <button
        aria-label="Scroll right"
        onClick={onRight}
        className="absolute z-20 right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-8 h-8 hidden sm:flex items-center justify-center bg-brand-surface border border-brand-border text-gray-400 hover:text-white hover:border-white/40 transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-sm">chevron_right</span>
      </button>
    </>
  );
}
