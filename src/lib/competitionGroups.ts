import type { Match } from '../types';
import { sortMatches } from './sortMatches';

export type CompetitionSegment = { key: string; name: string; logo?: string; matches: Match[] };
// A row can carry more than one competition's matches (see MIN_ROW_SIZE below) — `segments` keeps
// each original competition's own slice (name, logo, matches) in order so the rail can label each
// one right at the point its cards start, while `matches`/`name`/`logo` stay the flattened view the
// row header and scroll container already expect.
export type CompetitionGroup = CompetitionSegment & { segments: CompetitionSegment[] };

// Matches with no competition name at all (single-event fixtures, mostly) still need a bucket —
// grouped together rather than dropped or each getting their own one-match section.
const UNGROUPED = 'Other';

// Below this many matches, a competition's own rail reads as sparse — one or two cards adrift in an
// otherwise-empty row. Rather than giving it a short row all to itself, its matches are folded into
// the next competition(s) (in the same kickoff-order sequence) until the combined row clears the
// threshold — same idea as the last, short line of justified text picking up the next word instead
// of standing alone.
const MIN_ROW_SIZE = 4;

// Splits one date's worth of matches into their competitions — football specifically can have
// dozens of matches on a single day across a dozen-plus leagues, which read as one indistinguishable
// wall of cards in a single rail. Grouped, each competition gets its own small heading and its own
// short rail instead.
export function buildCompetitionGroups(matches: Match[]): CompetitionGroup[] {
  const groups = new Map<string, { name: string; logo?: string; matches: Match[] }>();
  const order: string[] = [];
  matches.forEach((match) => {
    const name = match.competition || UNGROUPED;
    if (!groups.has(name)) {
      groups.set(name, { name, logo: match.competitionLogo, matches: [] });
      order.push(name);
    }
    const group = groups.get(name)!;
    group.matches.push(match);
    if (!group.logo && match.competitionLogo) group.logo = match.competitionLogo;
  });

  // `matches` arrives already sorted chronologically (see sortMatches/buildDateGroups), so a
  // competition's own matches come out sorted for free — sorting is still applied explicitly rather
  // than assumed, so this holds even if a future caller passes in unsorted matches. Competitions are
  // then ordered by their own earliest kickoff, so whichever league has a match starting soonest on
  // this date leads — the same "what's coming up next" ordering the date rail itself uses.
  const singles: CompetitionSegment[] = order
    .map((name) => {
      const group = groups.get(name)!;
      return { key: name, name: group.name, logo: group.logo, matches: sortMatches(group.matches) };
    })
    .sort((a, b) => {
      const timeA = a.matches[0]?.startTime ? new Date(a.matches[0].startTime).getTime() : Number.POSITIVE_INFINITY;
      const timeB = b.matches[0]?.startTime ? new Date(b.matches[0].startTime).getTime() : Number.POSITIVE_INFINITY;
      if (timeA !== timeB) return timeA - timeB;
      return a.name.localeCompare(b.name);
    });

  // Fold consecutive under-sized competitions together, in the order just established, until each
  // resulting row has enough matches to fill out — or, for whatever's left at the end of the day,
  // as many as there are.
  const rows: CompetitionGroup[] = [];
  let bucket: CompetitionSegment[] = [];
  let bucketSize = 0;
  const flushBucket = () => {
    if (bucket.length === 0) return;
    rows.push(
      bucket.length === 1
        ? { ...bucket[0], segments: bucket }
        : {
            key: bucket.map((g) => g.key).join('+'),
            name: bucket.map((g) => g.name).join(', '),
            // A merged row spans multiple competitions, so no single one's logo represents it —
            // CompetitionHeader falls back to its generic trophy glyph when logo is undefined. Each
            // segment keeps its own logo for its inline in-row label instead.
            logo: undefined,
            matches: bucket.flatMap((g) => g.matches),
            segments: bucket,
          }
    );
    bucket = [];
    bucketSize = 0;
  };
  singles.forEach((group) => {
    bucket.push(group);
    bucketSize += group.matches.length;
    if (bucketSize >= MIN_ROW_SIZE) flushBucket();
  });
  flushBucket();

  return rows;
}
