export const SPORT_ICON: Record<string, string> = {
  football: 'sports_soccer',
  soccer: 'sports_soccer',
  basketball: 'sports_basketball',
  hockey: 'sports_hockey',
  'ice-hockey': 'sports_hockey',
  mma: 'sports_mma',
  fighting: 'sports_mma',
  boxing: 'sports_mma',
  f1: 'sports_motorsports',
  motorsport: 'sports_motorsports',
  'motor-sports': 'sports_motorsports',
  racing: 'sports_motorsports',
  baseball: 'sports_baseball',
  cricket: 'sports_cricket',
  volleyball: 'sports_volleyball',
  golf: 'sports_golf'
};

// Fixed filter list (alphabetical) — hardcoded so it always renders regardless of what the API returns.
export const FILTER_SPORTS = [
  { slug: 'baseball', name: 'Baseball' },
  { slug: 'basketball', name: 'Basketball' },
  { slug: 'cricket', name: 'Cricket' },
  { slug: 'fighting', name: 'Fighting' },
  { slug: 'football', name: 'Football' },
  { slug: 'hockey', name: 'Hockey' },
  { slug: 'racing', name: 'Motorsports' }
];

export const SHOWN_SPORT_SLUGS = FILTER_SPORTS.map((item) => item.slug);
