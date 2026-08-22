import { NextResponse } from 'next/server';
import { UNAUTHORIZED_HTML } from './UNAUTHORIZED_PAGE';

// Everything requires valid credentials EXCEPT a small set of purely public, non-sensitive static
// assets — manifest.webmanifest, sw.js, favicon.svg, icons/* — that a browser fetches outside the
// normal page-load flow (the <link rel="manifest"> probe, service worker registration) and doesn't
// reliably attach its cached Basic Auth credentials to the way it does for ordinary subresource
// requests, which was surfacing as spurious 401s and could silently break service worker
// registration entirely. None of these leak anything: the actual app and every /api/* data
// endpoint (including /api/watchfooty/* and /api/matches) stay fully gated below.
export const config = {
  matcher: ['/((?!manifest\\.webmanifest$|favicon\\.svg$|sw\\.js$|icons/).*)']
};

const REALM = 'Urheilu';

// Only shown as the page behind the browser's native Basic Auth dialog (and again if the user
// cancels it or enters a wrong password) — the browser owns the credential prompt itself, this is
// just what's visible around/after it. Markup lives in UNAUTHORIZED_PAGE.ts, see there for why.
function unauthorized(): Response {
  return new Response(UNAUTHORIZED_HTML, {
    status: 401,
    headers: {
      'WWW-Authenticate': `Basic realm="${REALM}", charset="UTF-8"`,
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store'
    }
  });
}

// Fixed-length digest comparison in constant time, same rationale as any password check: comparing
// raw strings (even with a length check first) leaks how many leading bytes matched via response
// timing. Hashing first means both sides are always the same length regardless of the attempted
// password's length, so there's nothing for a timing attack to key off besides random noise.
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const [digestA, digestB] = await Promise.all([crypto.subtle.digest('SHA-256', enc.encode(a)), crypto.subtle.digest('SHA-256', enc.encode(b))]);
  const bytesA = new Uint8Array(digestA);
  const bytesB = new Uint8Array(digestB);
  let diff = 0;
  for (let i = 0; i < bytesA.length; i++) diff |= bytesA[i] ^ bytesB[i];
  return diff === 0;
}

// HTTP Basic Auth carries "username:password" as one base64 blob, split on the first colon.
function extractCredentials(decoded: string): { username: string; password: string } {
  const separatorIndex = decoded.indexOf(':');
  return separatorIndex === -1
    ? { username: decoded, password: '' }
    : { username: decoded.slice(0, separatorIndex), password: decoded.slice(separatorIndex + 1) };
}

// SITE_USERS holds one shared JSON object mapping username -> password, e.g.
// {"hassam":"PAKistan@1947","friend1":"correct-horse-battery"} — one login per person instead of
// one shared site password. Rejects anything that isn't a flat string-to-string object so a typo'd
// env var (stray array, nested object, non-string value) fails closed instead of silently admitting
// no one or crashing later on a bad lookup.
function parseSiteUsers(raw: string): Record<string, string> | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const entries = Object.entries(parsed as Record<string, unknown>);
  if (entries.length === 0 || !entries.every(([, value]) => typeof value === 'string')) return null;
  return parsed as Record<string, string>;
}

// Used in place of a real password when the attempted username isn't in SITE_USERS, so an unknown
// username still pays for a SHA-256 digest + compare instead of returning immediately — keeping
// "wrong password" and "no such user" from being trivially distinguishable by response timing.
const DUMMY_PASSWORD = 'dummy-password-for-unknown-username-timing';

export default async function proxy(request: Request): Promise<Response> {
  const siteUsersRaw = process.env.SITE_USERS;
  const siteUsers = siteUsersRaw ? parseSiteUsers(siteUsersRaw) : null;
  if (!siteUsers) {
    // Fail closed: a misconfigured deployment must never silently let everyone through. An "auth"
    // gate that quietly turns itself off under misconfiguration is worse than no gate at all,
    // since it looks protected but isn't.
    return new Response('Site is not configured for authentication. Set SITE_USERS to a JSON object mapping usernames to passwords.', {
      status: 500,
      headers: { 'content-type': 'text/plain', 'cache-control': 'no-store' }
    });
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Basic ')) {
    let decoded: string;
    try {
      decoded = atob(authHeader.slice('Basic '.length));
    } catch {
      return unauthorized();
    }
    const { username, password } = extractCredentials(decoded);
    const expectedPassword = Object.prototype.hasOwnProperty.call(siteUsers, username) ? siteUsers[username] : undefined;
    const passwordMatches = await timingSafeEqual(password, expectedPassword ?? DUMMY_PASSWORD);
    if (expectedPassword !== undefined && passwordMatches) {
      return NextResponse.next();
    }
  }

  return unauthorized();
}
