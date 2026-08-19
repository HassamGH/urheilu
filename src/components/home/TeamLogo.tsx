export function TeamLogo({ src, name, fallback, priority }: { src?: string; name?: string; fallback: string; priority?: boolean }) {
  if (src) {
    return (
      <img
        className="w-16 h-16 md:w-20 md:h-20 object-contain drop-shadow-[0_10px_18px_rgba(0,0,0,0.65)] z-10 shrink-0"
        src={src}
        alt={name || ''}
        draggable={false}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : undefined}
      />
    );
  }
  return (
    <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center z-10 shrink-0" aria-label={name || fallback}>
      <span
        className="text-2xl font-black text-white drop-shadow-[0_6px_14px_rgba(0,0,0,0.85)]"
        style={{ WebkitTextStroke: '1.5px black', paintOrder: 'stroke fill' }}
      >
        {fallback}
      </span>
    </div>
  );
}
