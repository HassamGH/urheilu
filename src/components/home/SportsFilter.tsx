import { FILTER_SPORTS, SPORT_ICON } from '../../lib/sports';
import { sportFilterHref } from '../../lib/navigation';

export function SportsFilter({ sport, onChange }: { sport: string; onChange: (value: string) => void }) {
  return (
    <section aria-label="Sports" className="w-full mb-8">
      <div className="flex w-full gap-1">
        <a
          href={sportFilterHref('all')}
          className={
            sport === 'all'
              ? 'flex-1 min-w-0 px-1 py-2 border-[0.5px] border-white text-white text-[10px] font-bold tracking-wide truncate cursor-pointer text-center'
              : 'flex-1 min-w-0 px-1 py-2 border border-brand-border text-gray-400 hover:border-white hover:text-white text-[10px] font-bold tracking-wide truncate transition-colors cursor-pointer text-center'
          }
          onClick={(event) => {
            event.preventDefault();
            onChange('all');
          }}
        >
          ALL
        </a>
        {FILTER_SPORTS.map((item) => (
          <a
            key={item.slug}
            href={sportFilterHref(sport === item.slug ? 'all' : item.slug)}
            className={
              sport === item.slug
                ? 'flex-1 min-w-0 flex items-center justify-center gap-1 px-1 py-2 border-[0.5px] border-white text-white text-[10px] font-bold tracking-wide uppercase cursor-pointer'
                : 'flex-1 min-w-0 flex items-center justify-center gap-1 px-1 py-2 border border-brand-border text-gray-400 hover:border-white hover:text-white text-[10px] font-bold tracking-wide uppercase transition-colors cursor-pointer'
            }
            onClick={(event) => {
              event.preventDefault();
              onChange(sport === item.slug ? 'all' : item.slug);
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
