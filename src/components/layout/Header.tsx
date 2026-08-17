import { navigate } from '../../lib/navigation';
import { Logo } from './Logo';

export function Header({ query, onQuery }: { query: string; onQuery: (value: string) => void }) {
  return (
    <header className="bg-brand-bg/95 backdrop-blur-md sticky top-0 border-b border-brand-border flex justify-between items-center w-full px-4 md:px-12 py-2 z-50 h-16 gap-4">
      <button className="hidden md:flex items-center gap-1 shrink-0 cursor-pointer" onClick={() => navigate('/')}>
        <Logo className="w-7 h-7" />
        <span className="text-base font-black italic tracking-tighter text-white">URHEILU</span>
      </button>
      <input
        aria-label="Search matches"
        value={query}
        onChange={(event) => onQuery(event.target.value)}
        placeholder="Search teams, competitions..."
        className="w-full md:max-w-90 border border-brand-border px-3 py-2 text-sm text-white bg-brand-surface placeholder:text-gray-500 focus:outline-none focus:border-white"
      />
    </header>
  );
}
