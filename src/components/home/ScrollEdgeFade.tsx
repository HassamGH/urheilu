// Overlaid on a horizontally-scrolling row's container (which must itself be `relative`) so
// partially-visible cards at either edge fade into the page background instead of being cut off
// with a hard edge. `pointer-events-none` keeps it from blocking drag/click on the content beneath.
//
// A plain two-stop `from-X to-transparent` gradient reads as if it "finishes" almost immediately —
// linear alpha ramps fall off faster than the eye expects. The middle `via` stop holds it near-full
// strength through the first half before fading out, which is what actually looks gradual.
//
// `subtle` is for surfaces that already carry their own dark gradient (the featured banner) — at
// full width/opacity there, this stacks with that existing darkening and reads too heavy right at
// the top/bottom corners where both overlap.
export function ScrollEdgeFade({ subtle }: { subtle?: boolean } = {}) {
  const width = subtle ? 'w-10 md:w-14' : 'w-16 md:w-24';
  const opacity = subtle ? 'opacity-60' : '';
  return (
    <>
      <div className={`absolute inset-y-0 left-0 z-10 ${width} ${opacity} bg-linear-to-r from-brand-bg via-brand-bg/70 to-transparent pointer-events-none`} />
      <div className={`absolute inset-y-0 right-0 z-10 ${width} ${opacity} bg-linear-to-l from-brand-bg via-brand-bg/70 to-transparent pointer-events-none`} />
    </>
  );
}
