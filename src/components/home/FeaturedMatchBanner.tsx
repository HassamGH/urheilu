import { useEffect, useRef, useState } from 'react';
import type { Match } from '../../types';
import { navigate } from '../../lib/navigation';
import { formatMatchSchedule, teamInitial } from '../../lib/matchFormatting';
import { useDragScroll } from '../../lib/useDragScroll';
import { TeamLogo } from './TeamLogo';
import { MatchupDivider } from './MatchupDivider';
import { ScrollEdgeFade } from './ScrollEdgeFade';

const AUTO_ADVANCE_MS = 6000;
const SLIDE_DURATION_MS = 900;

// A hand-rolled scroll animation rather than `scrollTo({behavior:'smooth'})` — native smooth-scroll
// duration/easing isn't controllable and reads as an abrupt jump at this width, not a felt slide.
// CSS scroll-snap has to be switched off for the duration too: with it left on, the browser snaps
// `el.scrollLeft` straight to the target the moment it drifts near a snap point, cutting the tween
// short — it's handed back once the animation finishes, so drag-release snapping still works.
function animateScrollTo(el: HTMLElement, target: number, duration = SLIDE_DURATION_MS) {
  const start = el.scrollLeft;
  const change = target - start;
  if (change === 0) return;
  el.style.scrollSnapType = 'none';
  const startTime = performance.now();
  function step(now: number) {
    const progress = Math.min(1, (now - startTime) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    el.scrollLeft = start + change * eased;
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      el.style.scrollSnapType = '';
    }
  }
  requestAnimationFrame(step);
}

function FeaturedSlide({ match, priority }: { match: Match; priority: boolean }) {
  const label = match.isLive ? 'Live Now' : 'Featured';
  // `status` is a raw API code ("in", "live") rather than display text, so it's only worth showing
  // when the feed gives us something more descriptive than that.
  const isGenericStatus = !match.status || ['in', 'live'].includes(match.status.toLowerCase());
  const schedule = match.isLive ? (isGenericStatus ? 'In progress' : match.status) : formatMatchSchedule(match.startTime);

  return (
    <div className="relative w-full h-full shrink-0 snap-center overflow-hidden bg-black">
      {match.poster && (
        <img
          src={match.poster}
          alt=""
          aria-hidden="true"
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : undefined}
          className="absolute inset-0 w-full h-full object-cover opacity-45"
        />
      )}
      <div className="absolute inset-0 bg-linear-to-t from-black via-black/80 to-black/30" />
      <div className="absolute inset-0 bg-linear-to-r from-black via-black/40 to-transparent" />

      <button
        aria-label={`Watch ${match.title}`}
        className="relative z-10 w-full h-full px-5 md:px-12 py-8 md:py-10 text-left flex flex-col justify-end cursor-pointer group"
        onClick={() => navigate(`/match/${encodeURIComponent(match.id)}`)}
      >
        <div className="flex shrink-0 items-center gap-4 md:gap-6 mb-6">
          <TeamLogo src={match.homeTeamLogo} name={match.homeTeam} fallback={teamInitial(match.homeTeam, match.title, 0)} priority={priority} />
          <MatchupDivider match={match} size="lg" priority={priority} />
          <TeamLogo src={match.awayTeamLogo} name={match.awayTeam} fallback={teamInitial(match.awayTeam, match.title, 1)} priority={priority} />
        </div>

        <div className="flex shrink-0 flex-nowrap overflow-hidden items-center gap-2 text-[11px] font-black uppercase tracking-[0.18em] text-gray-300">
          <span className={`inline-flex items-center gap-1.5 shrink-0 ${match.isLive ? 'text-brand-live' : 'text-white'}`}>
            {match.isLive && <span className="w-1.5 h-1.5 rounded-full bg-brand-live animate-pulse" />}
            {label}
          </span>
          {match.competition && (
            <>
              <span className="text-gray-500 shrink-0">/</span>
              <span className="truncate">{match.competition}</span>
            </>
          )}
          <span className="text-gray-500 shrink-0">/</span>
          <span className="normal-case tracking-normal text-gray-400 shrink-0">{schedule}</span>
        </div>

        <h2 className="mt-2 shrink-0 text-3xl md:text-5xl font-black text-white max-w-3xl leading-tight">{match.title}</h2>

        <div className="mt-5 shrink-0 inline-flex w-fit items-center gap-2 bg-white group-hover:bg-gray-200 group-hover:-translate-y-px text-black font-bold px-5 py-3 rounded-sm transition-all duration-200">
          <span className="material-symbols-outlined text-base">play_arrow</span>
          Watch Now
        </div>
      </button>
    </div>
  );
}

export function FeaturedMatchBanner({ matches }: { matches: Match[] }) {
  // Every release gets its own eased animation to the nearest slide (or, past the overscroll
  // threshold, a wraparound to the first/last one) instead of leaving the browser's native
  // snap-back to jump there instantly — that's what made a manual drag feel "snappy" no matter
  // where mid-drag it was released.
  const drag = useDragScroll<HTMLDivElement>({
    onDragEnd: (overscroll, el) => {
      if (overscroll !== 0) {
        const nextIndex = overscroll === 1 ? 0 : matches.length - 1;
        animateScrollTo(el, nextIndex * el.clientWidth);
        return;
      }
      const nearest = Math.round(el.scrollLeft / el.clientWidth);
      animateScrollTo(el, nearest * el.clientWidth);
    }
  });
  const [activeIndex, setActiveIndex] = useState(0);
  const isDraggingRef = useRef(false);
  isDraggingRef.current = drag.isDragging;

  // Auto-advance through the slides on a timer, pausing while the viewer is actively dragging so
  // it doesn't fight their gesture.
  useEffect(() => {
    if (matches.length <= 1) return;
    const timer = window.setInterval(() => {
      if (isDraggingRef.current) return;
      const el = drag.ref.current;
      if (!el || el.clientWidth === 0) return;
      const current = Math.round(el.scrollLeft / el.clientWidth);
      const next = (current + 1) % matches.length;
      animateScrollTo(el, next * el.clientWidth);
    }, AUTO_ADVANCE_MS);
    return () => window.clearInterval(timer);
  }, [matches.length, drag.ref]);

  if (matches.length === 0) return null;

  const onScroll = () => {
    const el = drag.ref.current;
    if (!el || el.clientWidth === 0) return;
    setActiveIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  return (
    <section className="relative">
      <div
        ref={drag.ref}
        className={`flex w-full h-[50vh] md:h-[60vh] overflow-x-auto snap-x snap-mandatory hide-scrollbar select-none ${drag.isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        onPointerDown={drag.onPointerDown}
        onPointerMove={drag.onPointerMove}
        onPointerUp={drag.onPointerUp}
        onPointerCancel={drag.onPointerCancel}
        onClickCapture={drag.onClickCapture}
        onScroll={onScroll}
      >
        {matches.map((match, index) => (
          <FeaturedSlide key={match.id} match={match} priority={index === 0} />
        ))}
      </div>
      {matches.length > 1 && <ScrollEdgeFade subtle />}

      {matches.length > 1 && (
        <div className="absolute z-20 bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {matches.map((match, index) => (
            <button
              key={match.id}
              aria-label={`Go to featured match ${index + 1}`}
              onClick={() => {
                const el = drag.ref.current;
                if (el) animateScrollTo(el, index * el.clientWidth);
              }}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${index === activeIndex ? 'w-6 bg-brand-live' : 'w-1.5 bg-white/30'}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
