import type { Match } from '../types';
import { DISPLAY_TIME_ZONE } from './timeZone';

// Locale is pinned to 'en-US' (not left as `undefined`, i.e. "whatever the runtime's default is")
// and the timezone is pinned to DISPLAY_TIME_ZONE (PKT) rather than each viewer's own — both
// because the site always shows PKT regardless of who's viewing, and because either being left
// unpinned means Node's server runtime and the browser can format the exact same Date differently,
// which reads to React as a hydration mismatch even though the underlying timestamp is identical.

export function teamInitial(team: string | undefined, title: string, index: number) {
  const value = team || title.split(/\s+v(?:s)?\.?\s+/i)[index] || title;
  return value.trim().slice(0, 2).toUpperCase();
}

export function compactStatus(match: Match) {
  if (match.startTime) {
    const date = new Date(match.startTime);
    const datePart = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', timeZone: DISPLAY_TIME_ZONE }).format(date);
    const timePart = new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', timeZone: DISPLAY_TIME_ZONE }).format(date);
    return `${datePart} ${timePart}`;
  }
  return match.status || 'OPEN';
}

export function formatTime(value?: string) {
  if (!value) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short', timeZone: DISPLAY_TIME_ZONE }).format(new Date(value));
}

export function formatMatchSchedule(value?: string) {
  if (!value) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: DISPLAY_TIME_ZONE }).format(new Date(value));
}
