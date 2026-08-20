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

// HTTP Basic Auth carries "username:password" — there's no concept of a distinct user here (one
// shared site password, same model as before), so the username portion is accepted as anything
// (including empty) and only the password half is actually checked.
function extractPassword(decoded: string): string {
  const separatorIndex = decoded.indexOf(':');
  return separatorIndex === -1 ? decoded : decoded.slice(separatorIndex + 1);
}

export default async function proxy(request: Request): Promise<Response> {
  const sitePassword = process.env.SITE_PASSWORD;
  if (!sitePassword) {
    // Fail closed: a misconfigured deployment must never silently let everyone through. An "auth"
    // gate that quietly turns itself off under misconfiguration is worse than no gate at all,
    // since it looks protected but isn't.
    return new Response('Site is not configured for authentication. Set SITE_PASSWORD.', {
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
    const password = extractPassword(decoded);
    if (await timingSafeEqual(password, sitePassword)) {
      return NextResponse.next();
    }
  }

  return unauthorized();
}
