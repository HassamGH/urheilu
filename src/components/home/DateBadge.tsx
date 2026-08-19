import { relativeDayLabel } from '../../lib/dateGroups';

export function DateBadge({ dateKey }: { dateKey: string }) {
  if (dateKey === 'TBD') {
    return (
      <div className="sm:w-14 shrink-0 flex items-baseline sm:flex-col sm:items-start gap-1.5 sm:gap-0 sm:pt-2 pb-2 sm:pb-0 border-b sm:border-b-0 border-brand-border">
        <span className="text-[11px] font-bold uppercase text-gray-500">TBD</span>
      </div>
    );
  }
  const date = new Date(dateKey);
  const label = relativeDayLabel(date);
  return (
    <div className="sm:w-14 shrink-0 flex items-baseline sm:flex-col sm:items-start gap-1.5 sm:gap-0 sm:pt-2 pb-2 sm:pb-0 border-b sm:border-b-0 border-brand-border">
      <span className={label === 'Today' ? 'text-[11px] font-bold uppercase text-brand-live' : 'text-[11px] font-bold uppercase text-gray-400'}>{label}</span>
      <span className="text-lg sm:text-3xl font-black text-white leading-none sm:mt-1">{date.getDate()}</span>
      <span className="text-[11px] uppercase text-gray-400 sm:mt-1 tracking-wide">{new Intl.DateTimeFormat(undefined, { month: 'short' }).format(date)}</span>
    </div>
  );
}
