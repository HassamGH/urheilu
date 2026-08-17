export function ErrorBlock({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="relative overflow-hidden border border-brand-border bg-[#0d0d0e] px-5 py-6 md:px-7 md:py-6 mb-8" role="alert">
      <div className="absolute inset-y-0 left-0 w-1 bg-brand-live" />
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-5">
        <div className="flex items-center gap-4">
          <span className="material-symbols-outlined flex h-11 w-11 shrink-0 items-center justify-center border border-red-500/30 bg-red-500/10 text-brand-live">
            error
          </span>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-white">Unable to Load</p>
            <p className="mt-1 text-sm text-gray-400">{message}</p>
          </div>
        </div>
        <button
          className="inline-flex h-11 items-center justify-center gap-2 border border-white/10 bg-white px-5 text-sm font-bold text-black transition-colors hover:bg-gray-200 cursor-pointer"
          onClick={onRetry}
        >
          <span className="material-symbols-outlined text-base">refresh</span>
          Retry
        </button>
      </div>
    </div>
  );
}
