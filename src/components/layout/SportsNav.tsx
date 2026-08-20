import { FILTER_SPORTS, SPORT_ICON } from '../../lib/sports';
import { sportFilterHref } from '../../lib/navigation';

const LINK = 'flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide transition-colors cursor-pointer whitespace-nowrap';

// Plain text links (icon + label, no button chrome) rather than SportsFilter's old pill treatment —
// this sits directly over the featured banner's poster, in the gap between the logo and the search
// button, so it needs to read as a nav bar rather than a second row of filter controls. Only shown
// at `lg:` and up (see Header.tsx) — 8 items (All Sports + FILTER_SPORTS) each with an icon and a
// full label doesn't fit in the logo-to-search gap below that, which is what SportsDrawer covers.
export function SportsNav({ sport, onChange, className = '' }: { sport: string; onChange: (value: string) => void; className?: string }) {
  return (
    <nav aria-label="Sports" className={`items-center gap-5 xl:gap-7 ${className}`}>
      <a
        href={sportFilterHref('all')}
        className={`${LINK} ${sport === 'all' ? 'text-white' : 'text-gray-400 hover:text-white'}`}
        onClick={(event) => {
          event.preventDefault();
          if (sport !== 'all') onChange('all');
        }}
      >
        <span className="material-symbols-outlined text-sm!">trophy</span>
        All Sports
      </a>
      {FILTER_SPORTS.map((item) => (
        <a
          key={item.slug}
          href={sportFilterHref(item.slug)}
          className={`${LINK} ${sport === item.slug ? 'text-white' : 'text-gray-400 hover:text-white'}`}
          onClick={(event) => {
            event.preventDefault();
            if (sport !== item.slug) onChange(item.slug);
          }}
        >
          <span className="material-symbols-outlined text-sm!">{SPORT_ICON[item.slug] || 'sports'}</span>
          {item.name}
        </a>
      ))}
    </nav>
  );
}
