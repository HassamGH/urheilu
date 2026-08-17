import { useMemo } from 'react';
import type { Match } from '../../types';
import { buildDateGroups } from '../../lib/dateGroups';
import { MatchCard } from './MatchCard';
import { DateBadge } from './DateBadge';

export function MatchesByDate({ matches }: { matches: Match[] }) {
  const groups = useMemo(() => buildDateGroups(matches), [matches]);
  if (groups.length === 0) return null;

  return (
    <div className="mb-8">
      {groups.map((group) => (
        <div key={group.key} className="flex flex-col sm:flex-row gap-2 sm:gap-4 md:gap-6 mb-8">
          <DateBadge dateKey={group.key} />
          <div className="flex-1 flex flex-wrap gap-4 [&>article]:w-full sm:[&>article]:w-auto">
            {group.matches.map((match) => <MatchCard key={match.id} match={match} />)}
          </div>
        </div>
      ))}
    </div>
  );
}
