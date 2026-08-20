import Link from 'next/link';
import type { Match } from '../../types';
import { useMarkNavigating } from '../../lib/navigation';
import { Logo } from './Logo';
import { SportsNav } from './SportsNav';
import { SportsDrawer } from './SportsDrawer';
import { SearchModal } from './SearchModal';

export function Header({ matches, sport, onSportChange }: { matches: Match[]; sport: string; onSportChange: (value: string) => void }) {
  const markNavigating = useMarkNavigating();

  return (
    <header className="absolute top-0 inset-x-0 z-30 flex items-center justify-between w-full px-4 md:px-12 py-4 md:py-6 gap-4">
      <Link href="/" className="flex items-center gap-1 shrink-0 cursor-pointer" onClick={markNavigating}>
        <Logo className="w-7 h-7" />
      </Link>

      {/* SportsNav (full text-link row) only fits from `lg:` up — below that SportsDrawer takes
          over, collapsing the same list behind a hamburger button instead. Both always render;
          which one is visible is pure CSS (`lg:hidden`/`hidden lg:flex`), not a JS breakpoint check,
          so there's nothing here that can mismatch between server and client render. */}
      <SportsNav sport={sport} onChange={onSportChange} className="hidden lg:flex flex-1 justify-center" />

      <div className="flex items-center gap-2 shrink-0">
        <SearchModal matches={matches} />
        {/* Right of search on mobile (its icon-button styling matches — see the comment there),
            not between logo and search — the sheet it opens still slides down from the top of the
            screen regardless of where the button that opens it sits. */}
        <SportsDrawer sport={sport} onChange={onSportChange} />
      </div>
    </header>
  );
}
