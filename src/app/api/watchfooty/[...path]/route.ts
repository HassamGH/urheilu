import { NextResponse } from 'next/server';
import { WATCHFOOTY_API_ORIGINS, ORIGIN_TIMEOUT_MS } from '../../../../api/watchfooty';

// The client-side counterpart to requestJson's own server-side primary/fallback loop in
// watchfooty.ts — browser calls (the sport-filter switch, the 90s poll/retry, and the match/stream
// pages' own client-side fetches) hit this relative path instead of attempting the origins
// themselves, so there's exactly one place that decides which origin actually served a given
// request. `x-api-origin` on the response tells requestJson's client branch which one that was, so
// it can resolve that response's relative poster/logo paths against the right host.
export async function GET(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const { search } = new URL(request.url);
  const upstreamPath = `/api/v1/${path.join('/')}${search}`;

  // See toError's comment in watchfooty.ts — AbortSignal.timeout()'s DOMException can't have its
  // `.message` written to, which crashes Next's own error handling if a raw one ever gets thrown.
  const toError = (err: unknown): Error => new Error(err instanceof Error ? err.message : String(err));

  let lastError: Error | undefined;
  for (const origin of WATCHFOOTY_API_ORIGINS) {
    try {
      // Same reasoning as requestJson's own ORIGIN_TIMEOUT_MS — a dead origin doesn't necessarily
      // fail fast, and with a chain of them, a hang on each adds up. `request.signal` reflects the
      // browser itself disconnecting (tab closed, a newer request superseding this one), combined
      // in so that doesn't get overridden by the timeout.
      const response = await fetch(`${origin}${upstreamPath}`, { signal: AbortSignal.any([request.signal, AbortSignal.timeout(ORIGIN_TIMEOUT_MS)]) });
      if (!response.ok) {
        lastError = new Error(`WatchFooty request failed: ${response.status}`);
        continue;
      }
      const body = await response.text();
      return new NextResponse(body, {
        status: response.status,
        headers: {
          'content-type': response.headers.get('content-type') || 'application/json',
          'x-api-origin': origin
        }
      });
    } catch (err) {
      if (request.signal.aborted) throw err;
      lastError = toError(err);
    }
  }

  return NextResponse.json(
    { error: `All ${WATCHFOOTY_API_ORIGINS.length} WatchFooty origins are unavailable: ${lastError?.message}` },
    { status: 502 }
  );
}
