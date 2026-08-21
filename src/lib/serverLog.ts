// Every place in this app that catches a failed upstream fetch or an aborted request builds a log
// line — this is the one place that actually builds it, so every WARN in the server console reads
// identically instead of each call site inventing its own shape or, worse, letting the raw caught
// value hit console.warn/error directly (a DOMException or a mid-body-read undici error can crash
// Next's own error handling when it tries to serialize them — see toError's callers). Never call
// console.warn with a raw `err` anywhere else in this app; route it through here instead.
//
// ANSI codes rather than a color-logging dependency — this only ever runs server-side, straight to
// the terminal Next's dev server already prints its own colored `GET /path 200 in 123ms` lines to,
// so plain escape codes match that output instead of introducing a different look.
const ANSI_RED = '\x1b[31m';
const ANSI_RESET = '\x1b[0m';

// `AbortSignal.timeout()`'s abort reason is a DOMException, not a plain Error — and unlike a plain
// Error, DOMException's `message` is a getter-only prototype property with no setter. Next's own
// error handling tries to write to `.message` when logging/serializing a thrown value, which is
// silent for a normal Error but throws a totally unrelated TypeError for a raw DOMException — seen
// in practice: exhausting every origin surfaced "Cannot set property message of [object
// DOMException] which has only a getter" instead of the actual WatchFooty failure. The same applies
// to a raw Node/undici error mid-body-read ("The destination stream closed early" and its
// relatives). Normalizing whatever was caught into a real `Error` before it's ever stored, logged,
// or rethrown avoids that regardless of what specifically caused it — call this on every caught
// value before it goes anywhere else, never pass a raw caught value to console.warn or throw.
export function toError(err: unknown): Error {
  return new Error(err instanceof Error ? err.message : String(err));
}

// TIMEOUT is our own withOriginTimeout firing (origin never answered at all). ABORTED covers the
// connection dropping mid-response — "The destination stream closed early" and its relatives
// (ECONNRESET, "socket hang up") all mean the same thing: something between us and the origin closed
// the pipe before the body finished, most often because the client that originally asked for this
// page navigated away or the app was backgrounded (common on mobile PWAs) and Next canceled the
// in-flight render — not a WatchFooty outage, so it gets its own label rather than folding into the
// generic ERROR bucket a real 4xx/5xx/DNS failure gets.
export function classifyFetchError(err: unknown): { label: string; status: number } {
  const message = err instanceof Error ? err.message : String(err);
  if (/timeout|timed out/i.test(message)) return { label: 'TIMEOUT', status: 504 };
  if (/closed early|aborted|econnreset|socket hang up/i.test(message)) return { label: 'ABORTED', status: 499 };
  return { label: 'ERROR', status: 500 };
}

function formatDuration(ms: number): string {
  // Same switch-over Next's own request log uses (`123ms` to `4.1s` past one second), so a
  // slow-but-not-timed-out entry reads consistently next to Next's own lines instead of standing
  // out as a raw millisecond count.
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

// The standard shape: `WARN GET /path 504 in 10.3s [TIMEOUT]`. Use whenever a start time is
// available — i.e. this call wrapped a single fetch/operation from just before it began.
export function logFetchFailure(method: string, path: string, err: unknown, startedAt: number, suffix?: string) {
  const { status, label } = classifyFetchError(err);
  const duration = formatDuration(Date.now() - startedAt);
  // `WARN` level prefix — the pino/winston convention — makes this greppable/filterable by severity
  // the way a bare Next-style request line (no level marker) isn't. One line, not a multi-line
  // `console.warn(msg, err)` dump (Next's console intercept renders an Error argument's full
  // source-mapped stack trace, many times longer than the one line that actually matters here).
  console.warn(
    ` ${ANSI_RED}WARN${ANSI_RESET} ${method} ${path} ${ANSI_RED}${status}${ANSI_RESET} in ${duration} ${ANSI_RED}[${label}]${ANSI_RESET}${suffix ? ` ${suffix}` : ''}`
  );
}

// Same labeling, for contexts with no clean start time to measure from (Next's onRequestError hook
// fires after the fact, with no reference point this app controls) — omits the status/duration
// fields rather than fabricating numbers that aren't real.
export function logRequestFailure(method: string, path: string, err: unknown) {
  const { label } = classifyFetchError(err);
  const message = err instanceof Error ? err.message : String(err);
  console.warn(` ${ANSI_RED}WARN${ANSI_RESET} ${method} ${path} ${ANSI_RED}[${label}]${ANSI_RESET} ${message}`);
}
