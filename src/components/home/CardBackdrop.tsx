export function CardBackdrop({ homeSrc, awaySrc, fallback }: { homeSrc?: string; awaySrc?: string; fallback: string }) {
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ backgroundImage: fallback, backgroundColor: '#0d0d0e' }}>
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
