import { relativeDayLabel } from '../../lib/dateGroups';
import { DISPLAY_TIME_ZONE } from '../../lib/timeZone';

export function DateBadge({ dateKey }: { dateKey: string }) {
  if (dateKey === 'TBD') {
    return (
      <div className="sm:w-14 shrink-0 flex items-baseline sm:flex-col sm:items-start gap-1.5 sm:gap-0 sm:pt-2 pb-2 sm:pb-0 border-b sm:border-b-0 border-brand-border">
        <span className="text-[11px] font-bold uppercase text-gray-500">TBD</span>
      </div>
    );
  }
  // `dateKey` is a PKT-pinned "YYYY-MM-DD" string (see buildDateGroups), which the Date
  // constructor parses as UTC midnight of that calendar date — a well-defined instant that reads
  // back as the same PKT calendar day regardless of which timezone the runtime (server or browser)
  // happens to be in. The day number is read straight off the string rather than via `.getDate()`,
  // which would go through the runtime's own local timezone instead of PKT.
  const date = new Date(`${dateKey}T00:00:00Z`);
  const label = relativeDayLabel(date);
  const day = Number(dateKey.split('-')[2]);
  return (
    <div className="sm:w-14 shrink-0 flex items-baseline sm:flex-col sm:items-start gap-1.5 sm:gap-0 sm:pt-2 pb-2 sm:pb-0 border-b sm:border-b-0 border-brand-border">
      <span className={label === 'Today' ? 'text-[11px] font-bold uppercase text-brand-live' : 'text-[11px] font-bold uppercase text-gray-400'}>{label}</span>
      <span className="text-lg sm:text-3xl font-black text-white leading-none sm:mt-1">{day}</span>
      <span className="text-[11px] uppercase text-gray-400 sm:mt-1 tracking-wide">
        {new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: DISPLAY_TIME_ZONE }).format(date)}
      </span>
    </div>
  );
}
