'use client';

import { AppLoadingScreen } from '../components/common/AppLoadingScreen';
import { useNavigating } from '../lib/navigation';

export default function Loading() {
  // Next always replaces the page content with this fallback while a route segment is loading. If
  // a viewer clicked something inside the app (`navigating` true — see navigation.tsx), the shared
  // TopLoader in the root layout is already visible, since it lives outside this swapped content;
  // showing the full branded splash on top of it too would be a heavier, more jarring interruption
  // than the app had before, not an improvement, so this just clears to blank background instead.
  // Only a genuine cold entry to this route — a hard refresh, a slow first connection with no
  // navigate() call behind it — has no in-flight navigation at all, and only that case gets the
  // full-screen treatment.
  const navigating = useNavigating();
  if (navigating) return <div className="min-h-screen bg-brand-bg" />;
  return <AppLoadingScreen />;
}
