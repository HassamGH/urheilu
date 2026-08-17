import { useEffect, useState } from 'react';
import { getMatchDetails, getStreams, getMatches, getMatchesForSports } from '../api/watchfooty';
import type { Match, Stream } from '../types';
import { MatchPage } from './MatchPage';
import { PlayerPage } from './PlayerPage';
import { HomePage } from './HomePage';
import { NotFoundPage } from './NotFoundPage';
import { TopLoader } from '../components/common/TopLoader';
import { SHOWN_SPORT_SLUGS } from '../lib/sports';
import { getSportFromLocation } from '../lib/navigation';

type RouteData = { match?: Match; streams?: Stream[]; matches?: Match[] };

async function preloadRoute(path: string, signal: AbortSignal): Promise<RouteData> {
  const [pathname, search] = path.split('?');
  const streamMatch = pathname.match(/^\/match\/([^/]+)\/stream\/([^/]+)$/);
  const matchMatch = pathname.match(/^\/match\/([^/]+)$/);
  const matchId = streamMatch?.[1] || matchMatch?.[1];

  if (matchId) {
    const match = await getMatchDetails(decodeURIComponent(matchId), signal);
    const streams = await getStreams(decodeURIComponent(matchId), match.sportId, signal);
    return { match, streams };
  }

  if (pathname === '/') {
    const sport = new URLSearchParams(search || '').get('sport') || 'all';
    const matches = sport === 'all' ? await getMatchesForSports(SHOWN_SPORT_SLUGS, signal) : await getMatches(sport, signal);
    return { matches };
  }

  return {};
}

export function App() {
  const [path, setPath] = useState(window.location.pathname);
  const [routeData, setRouteData] = useState<RouteData>({});
  const [routeLoading, setRouteLoading] = useState(false);

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

  return (
    <>
      <TopLoader loading={routeLoading} />
      {path === '/' && <HomePage sport={getSportFromLocation()} initialMatches={routeData.matches} />}
      {streamMatch && <PlayerPage matchId={decodeURIComponent(streamMatch[1])} streamId={decodeURIComponent(streamMatch[2])} initialMatch={routeData.match} initialStreams={routeData.streams} />}
      {matchMatch && <MatchPage matchId={decodeURIComponent(matchMatch[1])} initialMatch={routeData.match} initialStreams={routeData.streams} />}
      {path !== '/' && !streamMatch && !matchMatch && <NotFoundPage />}
    </>
  );
}

export { navigate } from '../lib/navigation';
