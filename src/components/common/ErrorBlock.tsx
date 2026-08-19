export function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div
      className="relative mb-8 overflow-hidden border border-brand-border border-l-4 border-l-brand-live bg-brand-surface px-5 py-5 md:px-6"
      role="alert"
    >
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-4">
          <span className="material-symbols-outlined mt-0.5 shrink-0 text-[22px]! text-brand-live">cloud_off</span>

          <div className="min-w-0">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-brand-live">Connection error</p>
            <p className="mt-1.5 text-sm leading-6 text-gray-300">{message}</p>
          </div>
        </div>

        <button
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 border border-white/15 bg-white px-5 text-xs font-bold uppercase tracking-wide text-black transition-colors hover:bg-gray-200 cursor-pointer"
          onClick={onRetry}
        >
          <span className="material-symbols-outlined text-[18px]!">refresh</span>
          Try again
        </button>
      </div>
    </div>
  );
}
