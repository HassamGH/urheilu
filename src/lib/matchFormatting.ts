import type { Match } from '../types';

export function teamInitial(team: string | undefined, title: string, index: number) {
  const value = team || title.split(/\s+v(?:s)?\.?\s+/i)[index] || title;
  return value.trim().slice(0, 2).toUpperCase();
}

export function compactStatus(match: Match) {
  if (match.startTime) {
    const date = new Date(match.startTime);
    const datePart = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(date);
    const timePart = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(date);
    return `${datePart} ${timePart}`;
  }
  return match.status || 'OPEN';
}

export function formatTime(value?: string) {
  if (!value) return 'Time unavailable';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function formatMatchSchedule(value?: string) {
  if (!value) return 'Time unavailable';
  return new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(value));
}
