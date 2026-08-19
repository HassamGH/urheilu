import { Logo } from '../layout/Logo';

// Rendered via app/loading.tsx — Next's automatic Suspense boundary for a route segment, shown
// while its Server Component is fetching data (including the very first cold load). Full-bleed and
// branded rather than a bare spinner, since it's often the first thing anyone sees.
export function AppLoadingScreen() {
  return (
    <div className="fixed inset-0 bg-brand-bg flex flex-col items-center justify-center gap-3" role="status" aria-label="Loading">
      <Logo className="w-16 h-16 animate-pulse" />
      <span className="text-lg font-black italic tracking-tighter text-white/80">URHEILU</span>
    </div>
  );
}
