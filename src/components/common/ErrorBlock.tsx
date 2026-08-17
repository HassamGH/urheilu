export function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="relative overflow-hidden border border-brand-border bg-brand-surface px-5 py-7 md:px-8 md:py-8 mb-8 animate-pop-in"
      role="alert"
    >
      <div
        className="absolute inset-0 opacity-[0.05] pointer-events-none"
        style={{
          backgroundImage:
            'repeating-linear-gradient(135deg, var(--color-brand-live) 0px, var(--color-brand-live) 1px, transparent 1px, transparent 14px)'
        }}
      />
      <div className="absolute inset-x-0 top-0 h-0.5 bg-brand-live" />

      <div className="relative flex flex-col items-center text-center gap-5 md:gap-6">
        <span className="material-symbols-outlined flex h-14 w-14 shrink-0 items-center justify-center rounded-full border border-brand-live/30 bg-brand-live/10 text-3xl! text-brand-live">
          signal_disconnected
        </span>

        <div>
          <p className="text-base font-black uppercase tracking-[0.16em] text-white">Unable to Load</p>
          <p className="mt-2 text-sm text-brand-muted max-w-sm">{message}</p>
        </div>

        <button
          className="inline-flex h-11 items-center justify-center gap-2 border border-white/10 bg-white px-6 text-sm font-bold text-black transition-colors hover:bg-gray-200 cursor-pointer"
          onClick={onRetry}
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          Try Again
        </button>
      </div>
    </div>
  );
}
