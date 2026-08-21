import { logRequestFailure } from './src/lib/serverLog';

// Next's own internal response-streaming pipe throws "The destination stream closed early" (and
// relatives — ECONNRESET, "socket hang up") whenever a client disconnects mid-response: a mobile
// PWA getting backgrounded/suspended mid-navigation is the common case here. It fires from inside
// Next's own machinery, after the page's data-fetching already succeeded — no application code is
// on the stack to catch it (hence "ignore-listed frames" with no file/line info), so it can only be
// intercepted here, via the one hook Next runs for every server-side error regardless of where it
// originated. Reclassified into the same WARN/[LABEL] shape every other fetch-failure log in this
// app uses (see src/lib/serverLog.ts), instead of Next's raw multi-line digest dump, since it's the
// same underlying situation (a connection closing before a response finished) and reads better
// logged consistently. Scoped to just this error class, not every error this hook sees — a genuine
// application bug reaching here should still get Next's normal full-stack-trace treatment, not get
// flattened into a one-line WARN that would hide the trace worth investigating.
export async function onRequestError(err: unknown, errorRequest: { path: string; method: string }) {
  const message = err instanceof Error ? err.message : String(err);
  if (!/closed early|econnreset|socket hang up|aborted/i.test(message)) return;
  logRequestFailure(errorRequest.method, errorRequest.path, err);
}
