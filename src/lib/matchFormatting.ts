import type { Match } from '../types';

// Locale is pinned to 'en-US' (not left as `undefined`, i.e. "whatever the runtime's default
// is") because these functions run on both the server (during SSR, in Node's default locale) and
// the client (hydrating in the browser's own locale) — an unpinned locale can format the exact
// same Date differently in each environment (e.g. 24h vs 12h, comma placement), which reads to
// React as a hydration mismatch even though the underlying timestamp is identical. The actual
// wall-clock VALUE still legitimately differs between server and client here (the server has no
// way to know the viewer's timezone), which is what the `suppressHydrationWarning` at each call
// site is for — this only fixes the formatting-style half of the mismatch.

export function teamInitial(team: string | undefined, title: string, index: number) {
  const value = team || title.split(/\s+v(?:s)?\.?\s+/i)[index] || title;
  return value.trim().slice(0, 2).toUpperCase();
}

export function compactStatus(match: Match) {
  if (match.startTime) {
    const date = new Date(match.startTime);
    const datePart = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
    const timePart = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit' }).format(date);
    return `${datePart} ${timePart}`;
  }
  return match.status || 'OPEN';
}

export function formatTime(value?: string) {
  if (!value) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function formatMatchSchedule(value?: string) {
  if (!value) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
