import type { Stream } from '../types';

const QUALITY_ORDER = ['HD', 'SD'];

export function groupStreamsByQuality(streams: Stream[]) {
  const groups = new Map<string, Stream[]>();
  streams.forEach((stream) => {
    const key = (stream.quality || 'OTHER').toUpperCase();
    groups.set(key, [...(groups.get(key) || []), stream]);
  });

  const keys = [...groups.keys()].sort((a, b) => {
    const indexA = QUALITY_ORDER.indexOf(a);
    const indexB = QUALITY_ORDER.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  return keys.map((quality) => ({ quality, streams: groups.get(quality)! }));
}

export function languageTag(language?: string) {
  if (!language) return 'INT';
  return language.toLowerCase() === 'english' ? 'ENG' : 'INT';
}
