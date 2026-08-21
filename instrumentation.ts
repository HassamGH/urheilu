const ANSI_RED = '\x1b[31m';
const ANSI_RESET = '\x1b[0m';

// Next's own internal response-streaming pipe throws "The destination stream closed early" (and
// relatives — ECONNRESET, "socket hang up") whenever a client disconnects mid-response: a mobile
// PWA getting backgrounded/suspended mid-navigation is the common case here. It fires from inside
// Next's own machinery, after the page's data-fetching already succeeded — no application code is
// on the stack to catch it (hence "ignore-listed frames" with no file/line info), so it can only be
// intercepted here, via the one hook Next runs for every server-side error regardless of where it
// originated. Reclassified into the same WARN/[LABEL] shape watchfooty.ts's own fetch-failure
// logging uses, instead of Next's raw multi-line digest dump, since it's the same underlying
// situation (a connection closing before a response finished) and reads better logged consistently.
export async function onRequestError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  if (!/closed early|econnreset|socket hang up|aborted/i.test(message)) return;
  console.warn(` ${ANSI_RED}WARN${ANSI_RESET} ${ANSI_RED}[ABORTED]${ANSI_RESET} client disconnected mid-response — ${message}`);
}
