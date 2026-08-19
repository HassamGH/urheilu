import { FILTER_SPORTS, SPORT_ICON } from '../../lib/sports';
import { sportFilterHref } from '../../lib/navigation';

const BASE = 'flex-1 min-w-0 flex items-center justify-center gap-1.5 px-2 py-2.5 text-xs font-bold tracking-wide transition-all duration-200 cursor-pointer';
const SELECTED = 'bg-white border border-white text-black shadow-[0_4px_16px_rgba(255,255,255,0.12)]';
const UNSELECTED = 'bg-white/[0.03] border border-brand-border text-gray-400 hover:bg-white/[0.07] hover:border-white/25 hover:text-white hover:-translate-y-px';

export function SportsFilter({ sport, onChange }: { sport: string; onChange: (value: string) => void }) {
  return (
    <section aria-label="Sports" className="w-full mb-8">
      <div className="flex w-full gap-1.5">
        <a
          href={sportFilterHref('all')}
          className={`${BASE} truncate ${sport === 'all' ? SELECTED : UNSELECTED}`}
          onClick={(event) => {
            event.preventDefault();
            if (sport === 'all') return;
            onChange('all');
          }}
        >
          <span className="material-symbols-outlined text-xs shrink-0">trophy</span>
          <span className="hidden sm:inline truncate">ALL SPORTS</span>
        </a>
        {FILTER_SPORTS.map((item) => (
          <a
            key={item.slug}
            href={sportFilterHref(item.slug)}
            className={`${BASE} uppercase ${sport === item.slug ? SELECTED : UNSELECTED}`}
            onClick={(event) => {
              event.preventDefault();
              if (sport === item.slug) return;
              onChange(item.slug);
            }}
          >
            <span className="material-symbols-outlined text-xs shrink-0">{SPORT_ICON[item.slug] || 'sports'}</span>
            <span className="hidden sm:inline truncate">{item.name}</span>
          </a>
        ))}
      </div>
    </section>
  );
}
