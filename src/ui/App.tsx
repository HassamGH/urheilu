import { Suspense, lazy, useEffect, useState } from 'react';
import { getMatchDetails, getStreams, getMatches, getMatchesForSports, getFeaturedMatches } from '../api/watchfooty';
import type { Match, Stream } from '../types';
import { MatchPage } from './MatchPage';
import { HomePage } from './HomePage';
import { NotFoundPage } from './NotFoundPage';
import { TopLoader } from '../components/common/TopLoader';
import { AppLoadingScreen } from '../components/common/AppLoadingScreen';
import { SHOWN_SPORT_SLUGS } from '../lib/sports';
import { getSportFromLocation } from '../lib/navigation';

// hls.js (pulled in by PlayerPage) is the single heaviest dependency in the app but only ever
// needed once a viewer actually opens a stream — split out of the main bundle so every other page
// (home, match list, browsing) never has to download or parse it. The import is kicked off
// alongside the data preload below (not only at render time) so the chunk and the match/stream
// data arrive together instead of the chunk load being a second, later waterfall step.
const PlayerPage = lazy(() => import('./PlayerPage').then((module) => ({ default: module.PlayerPage })));

type RouteData = { match?: Match; streams?: Stream[]; matches?: Match[]; featured?: Match[] };

async function preloadRoute(path: string, signal: AbortSignal): Promise<RouteData> {
  const [pathname, search] = path.split('?');
  const streamMatch = pathname.match(/^\/match\/([^/]+)\/stream\/([^/]+)$/);
  const matchMatch = pathname.match(/^\/match\/([^/]+)$/);
  const matchId = streamMatch?.[1] || matchMatch?.[1];

  if (matchId) {
    if (streamMatch) void import('./PlayerPage');
    const match = await getMatchDetails(decodeURIComponent(matchId), signal);
    const streams = await getStreams(decodeURIComponent(matchId), match.sportId, signal);
    return { match, streams };
  }

  if (pathname === '/') {
    const sport = new URLSearchParams(search || '').get('sport') || 'all';
    // Featured banner data is fetched alongside the match list here (not left to HomePage's own
    // effect) so the preload gate below — and the same gate on every later sport-filter switch —
    // waits for both together, instead of the banner popping in a beat after the rest of the page.
    const [matches, featured] = await Promise.all([
      sport === 'all' ? getMatchesForSports(SHOWN_SPORT_SLUGS, signal) : getMatches(sport, signal),
      getFeaturedMatches(signal)
    ]);
    return { matches, featured };
  }

  return {};
}

export function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [routeData, setRouteData] = useState<RouteData>({});
  const [routeLoading, setRouteLoading] = useState(false);
  // Gates the very first paint: nothing renders until the initial route's data has fully loaded in
  // the background, same as every later navigation already waits on `preloadRoute` before swapping
  // — a hard refresh (or the very first visit) shouldn't behave any differently and show a
  // half-loaded page while the rest streams in behind it.
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    preloadRoute(`${window.location.pathname}${window.location.search}`, controller.signal)
      .then((data) => {
        if (controller.signal.aborted) return;
        setRouteData(data);
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setRouteData({});
      })
      .finally(() => {
        if (!controller.signal.aborted) setInitialLoading(false);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    let controller: AbortController | null = null;

    // Real browser back/forward already changed the URL by the time this fires, so unlike
    // onNavigate below there's nothing to preventDefault — but we still keep the CURRENT page
    // mounted and preload the target route's data first, only swapping `path`/`routeData` once it
    // resolves, instead of immediately clearing routeData and rendering the new page half-loaded.
    const onPop = () => {
      const nextPath = `${window.location.pathname}${window.location.search}`;
      controller?.abort();
      controller = new AbortController();
      setRouteLoading(true);

      preloadRoute(nextPath, controller.signal)
        .then((data) => {
          if (controller?.signal.aborted) return;
          setRouteData(data);
          setPath(window.location.pathname);
        })
        .catch(() => {
          if (controller?.signal.aborted) return;
          setRouteData({});
          setPath(window.location.pathname);
        })
        .finally(() => {
          if (!controller?.signal.aborted) setRouteLoading(false);
        });
    };
    window.addEventListener('popstate', onPop);
    return () => {
      controller?.abort();
      window.removeEventListener('popstate', onPop);
    };
  }, []);

  useEffect(() => {
    let controller: AbortController | null = null;

    const onNavigate = (event: Event) => {
      const nextPath = (event as CustomEvent<string>).detail;
      if (!nextPath || nextPath === `${window.location.pathname}${window.location.search}`) return;

      event.preventDefault();
      const nextPathname = nextPath.split('?')[0];
      const isMatchRoute = nextPath.match(/^\/match\/([^/]+)(?:\/stream\/[^/]+)?$/);
      // Home always goes through the preload gate too — including switching the sport filter pill
      // while already on the home page — so the visible content (and featured banner) only ever
      // swaps once the new sport's data has actually arrived, instead of blanking/flickering first.
      const isHomeRoute = nextPathname === '/';
      if (!isMatchRoute && !isHomeRoute) {
        controller?.abort();
        setRouteLoading(false);
        window.history.pushState({}, '', nextPath);
        window.dispatchEvent(new PopStateEvent('popstate'));
        return;
      }

      controller?.abort();
      controller = new AbortController();
      setRouteLoading(true);

      preloadRoute(nextPath, controller.signal)
        .then((data) => {
          if (controller?.signal.aborted) return;
          window.history.pushState({}, '', nextPath);
          setRouteData(data);
          setPath(window.location.pathname);
        })
        .catch(() => {
          if (controller?.signal.aborted) return;
          window.history.pushState({}, '', nextPath);
          setRouteData({});
          setPath(window.location.pathname);
        })
        .finally(() => {
          if (!controller?.signal.aborted) setRouteLoading(false);
        });
    };

    window.addEventListener('app:navigate', onNavigate);
    return () => {
      controller?.abort();
      window.removeEventListener('app:navigate', onNavigate);
    };
  }, []);

  const streamMatch = path.match(/^\/match\/([^/]+)\/stream\/([^/]+)$/);
  const matchMatch = path.match(/^\/match\/([^/]+)$/);

  if (initialLoading) return <AppLoadingScreen />;

  return (
    <>
      <TopLoader loading={routeLoading} />
      {path === '/' && <HomePage sport={getSportFromLocation()} initialMatches={routeData.matches} initialFeatured={routeData.featured} />}
      {streamMatch && (
        // Same fallback PlayerPage itself shows while its own data is still resolving (see
        // `if (!selected) return <div className="fixed inset-0 bg-black" />` there) — so on the
        // rare cold-cache load where the chunk isn't already fetched, there's no visible change.
        <Suspense fallback={<div className="fixed inset-0 bg-black" />}>
          <PlayerPage matchId={decodeURIComponent(streamMatch[1])} streamId={decodeURIComponent(streamMatch[2])} initialMatch={routeData.match} initialStreams={routeData.streams} />
        </Suspense>
      )}
      {matchMatch && <MatchPage matchId={decodeURIComponent(matchMatch[1])} initialMatch={routeData.match} initialStreams={routeData.streams} />}
      {path !== '/' && !streamMatch && !matchMatch && <NotFoundPage />}
    </>
  );
}

export { navigate } from '../lib/navigation';
