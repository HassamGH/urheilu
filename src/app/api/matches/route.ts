import { NextResponse } from 'next/server';
import { getMatches, getMatchesForSports } from '../../../api/watchfooty';
import { SHOWN_SPORT_SLUGS } from '../../../lib/sports';

// WatchFooty has no server-side league filtering — asking for "football" returns every football
// match happening globally (measured: 300-1500+ raw matches for a single day's request) before our
// own allow-list narrows it down to the ~15 leagues actually shown. That fetch-and-filter pass is
// expensive (8 large parallel upstream requests per sport) and was previously redone from scratch,
// in the browser, on every single sport-filter click by every visitor. `revalidate` makes Next
// cache this route's response and share it across every request within the window, so the
// expensive part happens at most once per 30s, not once per click.
export const revalidate = 30;

export async function GET(request: Request) {
  const sport = new URL(request.url).searchParams.get('sport') || 'all';
  const matches = sport === 'all' ? await getMatchesForSports(SHOWN_SPORT_SLUGS) : await getMatches(sport);
  return NextResponse.json(matches);
}
