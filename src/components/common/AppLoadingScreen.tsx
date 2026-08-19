import { Logo } from '../layout/Logo';

// Shown for the very first paint only, while the initial route's data loads in the background (see
// App's `initialLoading` gate) — full-bleed and branded rather than a bare spinner, since it's the
// first thing anyone sees on a cold load.
export function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 bg-brand-bg flex flex-col items-center justify-center gap-3" role="status" aria-label="Loading">
      <Logo className="w-16 h-16 animate-pulse" />
      <span className="text-lg font-black italic tracking-tighter text-white/80">URHEILU</span>
    </div>
  );
}
