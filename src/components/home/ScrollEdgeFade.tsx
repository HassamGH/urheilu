// Overlaid on a horizontally-scrolling row's container (which must itself be `relative`) so
// partially-visible cards at either edge read as fading out of view instead of being cut off with
// a hard edge. `pointer-events-none` keeps it from blocking drag/click on the content beneath.
//
// A frosted-glass treatment — backdrop-blur, masked so the blur intensity itself tapers rather than
// switching on/off at a hard line — instead of the flat color wash this used to be. A plain
// `from-brand-bg to-transparent` gradient reads as a visibly mismatched, muddy patch wherever it
// sits over a bright poster or a colorful team-logo backdrop, since a single flat color can't match
// everything under it. Blurring instead of overpainting works regardless of what's underneath —
// the same reasoning as the team-logo blur in CardBackdrop.
//
// `subtle` is for surfaces that already carry their own dark gradient (the featured banner) — at
// full strength there, this stacks with that existing darkening and reads too heavy right at the
// top/bottom corners where both overlap.
export function ScrollEdgeFade({ subtle }: { subtle?: boolean } = {}) {
  const width = subtle ? 'w-10 md:w-14' : 'w-16 md:w-24';
  const tint = subtle ? 'from-brand-bg/45 via-brand-bg/15' : 'from-brand-bg/80 via-brand-bg/30';
  return (
    <>
      <div
        className={`absolute inset-y-0 left-0 z-10 ${width} bg-linear-to-r ${tint} to-transparent backdrop-blur-md mask-[linear-gradient(to_right,black,transparent)] pointer-events-none`}
      />
      <div
        className={`absolute inset-y-0 right-0 z-10 ${width} bg-linear-to-l ${tint} to-transparent backdrop-blur-md mask-[linear-gradient(to_left,black,transparent)] pointer-events-none`}
      />
    </>
  );
}
