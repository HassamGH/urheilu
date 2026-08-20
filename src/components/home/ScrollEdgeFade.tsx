// Overlaid on a horizontally-scrolling row's container (which must itself be `relative`) so
// partially-visible cards at either edge read as fading out of view instead of being cut off with
// a hard edge. `pointer-events-none` keeps it from blocking drag/click on the content beneath.
//
// A plain color-wash gradient — opaque `from-brand-bg` right at the true cut edge, fading to
// transparent — rather than a `backdrop-blur` treatment (tried and reverted: blurring a bright card
// background, e.g. white MLB diamond posters or light kit art, still leaves it bright, just blurred,
// so it read as barely-there rather than a fade; masking the blur's own intensity to taper it looked
// better in theory but `mask-image` combined with `backdrop-filter` silently no-ops the whole element
// in Chromium instead of clipping it, so that version rendered as nothing at all). Solid-to-transparent
// is the plain, unglamorous version, but it's the one that actually reads as a fade and reliably
// renders regardless of what's under it.
//
// `subtle` is for surfaces that already carry their own dark gradient (the featured banner) — at
// full strength there, this stacks with that existing darkening and reads too heavy right at the
// top/bottom corners where both overlap.
//
// `top` overrides the default `inset-y-0` so the fade starts lower than the container's own top —
// used when a scrolling row has its own inline header (e.g. SegmentHeader's league name) stacked
// above the cards: that header is `sticky`, not part of what scrolls past this edge, so it has no
// need to fade the way the cards below it do.
//
// `sides` restricts which edge(s) render — defaults to both. A row whose cards all fit with nothing
// to scroll to (no arrows, `canScroll` false) still butts its first card straight up against the
// date column with a hard edge; the left fade stays purely as that visual edge treatment even
// though there's nothing left to hide, while the right one (which reads as "more content this way")
// only makes sense when there actually is more to scroll to.
export function ScrollEdgeFade({ subtle, top, sides = 'both' }: { subtle?: boolean; top?: string; sides?: 'both' | 'left' | 'right' } = {}) {
  const width = subtle ? 'w-10 md:w-14' : 'w-16 md:w-24';
  const tint = subtle ? 'from-brand-bg/80 via-brand-bg/40' : 'from-brand-bg via-brand-bg/70';
  const verticalSpan = top ? `${top} bottom-0` : 'inset-y-0';
  return (
    <>
      {sides !== 'right' && (
        <div className={`absolute ${verticalSpan} left-0 z-10 ${width} bg-linear-to-r ${tint} to-transparent pointer-events-none`} />
      )}
      {sides !== 'left' && (
        <div className={`absolute ${verticalSpan} right-0 z-10 ${width} bg-linear-to-l ${tint} to-transparent pointer-events-none`} />
      )}
    </>
  );
}
