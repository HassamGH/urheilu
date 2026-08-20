'use client';

import { useEffect, useState } from 'react';
import { FILTER_SPORTS, SPORT_ICON } from '../../lib/sports';
import { sportFilterHref } from '../../lib/navigation';

// A tile, not a list row — icon stacked over label in a square-ish cell. A top sheet is wide and
// short, the opposite shape of the old left-edge drawer's tall vertical list, so a grid that uses
// that width is the natural fit rather than forcing the same row layout into a wider container.
// 3 columns, not 4 — "Motorsports"/"Basketball" are single words with nothing for `overflow-wrap`
// to break on, so at 4-per-row on a phone width there wasn't enough room left and the longest
// labels spilled past their own tile's border instead of wrapping. `px-1` gives the text a little
// breathing room from the tile edge on top of the wider column.
// No box/border on either state — a selected tile is just its icon and label turning white (same
// "highlighted = white, otherwise gray" language SportsNav already uses for the very same sport
// list at `lg:` and up), not a filled button. Keeps the tiles reading as part of the sheet's own
// translucent surface instead of a grid of solid opaque boxes sitting on top of it.
const TILE_BASE = 'flex flex-col items-center justify-center gap-2 py-4 px-1 transition-colors duration-200 cursor-pointer';
const TILE_SELECTED = 'text-white';
const TILE_UNSELECTED = 'text-gray-400 hover:text-white';

// The below-`lg:` counterpart to SportsNav — a hamburger button that opens a sheet with the same
// sport list, sliding down from under the header (a "top sheet") rather than in from an edge, so it
// reads as an extension of the header itself instead of a separate panel intruding from off-screen.
export function SportsDrawer({ sport, onChange }: { sport: string; onChange: (value: string) => void }) {
  const [open, setOpen] = useState(false);

  // Escape-to-close, same as the search modal — and a body scroll lock, since the backdrop covers
  // the full page even though the sheet itself only occupies the top of it.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const select = (slug: string) => {
    if (slug !== sport) onChange(slug);
    setOpen(false);
  };

  return (
    <>
      {/* No border/background box, matching the search icon's button next to it — see its comment
          in SearchModal.tsx. Sits to its right, and the sheet it opens slides down from the header
          above rather than in from an edge, so nothing about its own position matters much. */}
      <button
        aria-label="Open sports menu"
        onClick={() => setOpen(true)}
        className="lg:hidden w-10 h-10 flex items-center justify-center text-white/90 hover:text-white drop-shadow-[0_2px_6px_rgba(0,0,0,0.8)] transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-xl!">menu</span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Sports menu">
          {/* Deliberately light and un-blurred — this only needs to signal "the page behind is
              inactive," not obscure it. A dark, blurred full-page backdrop sitting UNDER the
              sheet's own translucent/blurred surface meant that surface was mostly showing blurred
              black back at itself: technically translucent, but with almost nothing colorful left
              behind it to actually see through to, so it read as solid. Leaving the real page
              visible here is what makes the sheet's own frosted-glass surface actually visible as
              frosted glass, against real colors instead of blurred-out black. */}
          <div className="absolute inset-0 bg-black/25 animate-fade-in" onClick={() => setOpen(false)} />
          {/* Same h-[50vh] md:h-[60vh] as FeaturedMatchBanner — sized to match it rather than to
              its own (much shorter) content, so the sheet reads as covering the same "zone" of the
              page the banner itself occupies underneath it. `overflow-y-auto` is the safety valve
              for a viewport short enough that the fixed height doesn't fit even the grid alone. */}
          {/* No header row — no "Sports" label, no close button. Tapping the (now un-obscured)
              backdrop or pressing Escape still closes it, same as before. */}
          <div className="absolute inset-x-0 top-0 h-[50vh] md:h-[60vh] flex flex-col bg-brand-bg/70 backdrop-blur-2xl border-b border-white/10 shadow-2xl animate-sheet-down overflow-y-auto">
            <nav aria-label="Sports" className="grid grid-cols-3 gap-2.5 p-4 content-center flex-1">
              <a
                href={sportFilterHref('all')}
                onClick={(event) => {
                  event.preventDefault();
                  select('all');
                }}
                className={`${TILE_BASE} ${sport === 'all' ? TILE_SELECTED : TILE_UNSELECTED}`}
              >
                <span className="material-symbols-outlined text-2xl!">trophy</span>
                <span className="text-[10px] font-bold uppercase text-center leading-tight">All Sports</span>
              </a>
              {FILTER_SPORTS.map((item) => (
                <a
                  key={item.slug}
                  href={sportFilterHref(item.slug)}
                  onClick={(event) => {
                    event.preventDefault();
                    select(item.slug);
                  }}
                  className={`${TILE_BASE} ${sport === item.slug ? TILE_SELECTED : TILE_UNSELECTED}`}
                >
                  <span className="material-symbols-outlined text-2xl!">{SPORT_ICON[item.slug] || 'sports'}</span>
                  <span className="text-[10px] font-bold uppercase text-center leading-tight">{item.name}</span>
                </a>
              ))}
            </nav>
          </div>
        </div>
      )}
    </>
  );
}
