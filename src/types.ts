export type Sport = {
  id: string;
  name: string;
  slug: string;
};

export type Match = {
  id: string;
  sportId: string;
  title: string;
  poster?: string;
  homeTeam?: string;
  awayTeam?: string;
  homeTeamLogo?: string;
  awayTeamLogo?: string;
  competition?: string;
  competitionLogo?: string;
  startTime?: string;
  status?: string;
  isLive: boolean;
  streamsCount: number;
};

export type Stream = {
  id: string;
  matchId: string;
  name: string;
  url: string;
  type: 'embed' | 'hls' | 'dash' | 'video' | 'unknown';
  quality?: string;
  language?: string;
  isAvailable: boolean;
  hasAds?: boolean;
  isNsfw?: boolean;
  // Set only when this stream comes from an unconfirmed cross-source match (see
  // getStreamedFallbackStreams) — the source's own title, shown so it's clear this wasn't
  // matched by team name and might be a differently-branded feed of the same game.
  sourceLabel?: string;
};

export type MatchDetails = Match & {
  venue?: string;
  note?: string;
  homeScore?: number;
  awayScore?: number;
  minute?: string;
};
