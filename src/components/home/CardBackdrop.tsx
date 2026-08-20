import { Logo } from '../layout/Logo';

export function CardBackdrop({
  homeSrc,
  awaySrc,
  fallback,
  brand = true
}: {
  homeSrc?: string;
  awaySrc?: string;
  fallback: string;
  // Lets a caller that doesn't want the branded placeholder at all (see MatchPage's MatchHeader)
  // opt out and fall through to the bare color gradient instead — on by default since most callers
  // (MatchCard) do want a real poster substituted for one.
  brand?: boolean;
}) {
  // Neither side has a crest to blur into the backdrop (single-event fixtures, or a match whose
  // teams have no logo asset) — rather than leave the card as a bare color gradient, brand it like
  // a real poster: our own mark over the same blurred-gradient backdrop other cards use.
  const showBrandedPoster = brand && !homeSrc && !awaySrc;

  return (
    <div className="absolute inset-0 overflow-hidden" style={{ backgroundImage: fallback, backgroundColor: '#0d0d0e' }}>
      {showBrandedPoster && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
          <Logo className="w-20 h-20 drop-shadow-[0_10px_18px_rgba(0,0,0,0.65)]" />
          <span className="text-3xl font-black italic tracking-tighter text-white drop-shadow-[0_4px_10px_rgba(0,0,0,0.65)]">URHEILU</span>
        </div>
      )}
      {homeSrc && (
        <img
          src={homeSrc}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className="absolute inset-y-0 left-0 w-3/5 h-full object-cover blur-lg scale-110 opacity-90 mask-[linear-gradient(to_right,black_45%,transparent_100%)]"
        />
      )}
      {awaySrc && (
        <img
          src={awaySrc}
          alt=""
          draggable={false}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          className="absolute inset-y-0 right-0 w-3/5 h-full object-cover blur-lg scale-110 opacity-90 mask-[linear-gradient(to_left,black_45%,transparent_100%)]"
        />
      )}
      <div className="absolute inset-0 bg-linear-to-b from-black/55 via-black/15 to-black/70" />
    </div>
  );
}
