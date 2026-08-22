// The page shown behind (and after a failed/cancelled attempt at) the browser's native Basic Auth
// dialog — see proxy.ts. Kept in its own module, as a plain string, rather than inline in proxy.ts:
// proxy.ts runs in the Edge runtime, which bundles everything into one snippet with no filesystem
// access, so an actual .html file can't be read at request time — this is the closest equivalent,
// a self-contained document with no external CSS/font/image requests.
export const UNAUTHORIZED_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Urheilu</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100%;
    padding: 1.5rem;
    background: #0a0a0b;
    background-image: radial-gradient(circle at 50% 32%, rgba(255, 59, 48, 0.14), transparent 60%);
    color: #e6e6e4;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    text-align: center;
  }
  .logo {
    width: 3.5rem;
    height: 3.5rem;
    margin: 0 0 1.25rem;
    display: block;
  }
  .wordmark {
    font-size: 1.125rem;
    font-weight: 900;
    font-style: italic;
    letter-spacing: -0.02em;
    margin: 0 0 0.75rem;
  }
  .divider {
    width: 2rem;
    height: 2px;
    background: #ff3b30;
    border: none;
    margin: 0 0 1rem;
  }
  .icon {
    width: 2.5rem;
    height: 2.5rem;
    margin: 0 0 1.25rem;
    color: #8e8e93;
    opacity: 0.5;
  }
  h1 {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
  }
  .message {
    color: #8e8e93;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 0.9rem;
    line-height: 1.55;
    margin: 0;
    max-width: 22rem;
  }
  .retry-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 2rem;
    padding: 0 1.75rem;
    height: 2.75rem;
    background: #e6e6e4;
    color: #0a0a0b;
    font-family: inherit;
    font-weight: 700;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.025em;
    border: none;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }
  .retry-btn:hover {
    background: #c7c7c5;
  }
  .retry-btn svg {
    width: 18px;
    height: 18px;
    fill: currentColor;
  }
</style>
</head>
<body>
  <svg class="logo" viewBox="0 0 100 100" aria-hidden="true">
    <path d="M16 11 L84 11 L84 54 Q84 80 50 95 Q16 80 16 54 Z" fill="#e6e6e4" />
    <path d="M40 11 L60 11 L50 24 Z" fill="#ff3b30" />
    <text x="50" y="68" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-style="italic" font-size="50" fill="#0a0a0b">U</text>
  </svg>
  <p class="wordmark">URHEILU</p>
  <hr class="divider" />
  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
  <h1>Site is private</h1>
  <p class="message">Enter your credentials when prompted to continue.</p>
  <button class="retry-btn" type="button" onclick="location.reload()">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.65 6.35A7.958 7.958 0 0 0 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
    Try again
  </button>
</body>
</html>`;

// Shown instead of UNAUTHORIZED_HTML when SITE_USERS is missing or malformed — see the fail-closed
// comment in proxy.ts. Distinct copy so an operator (or anyone else) sees this is a server
// misconfiguration, not a login they can solve by entering credentials.
export const SITE_NOT_CONFIGURED_HTML = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Urheilu</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    margin: 0;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100%;
    padding: 1.5rem;
    background: #0a0a0b;
    background-image: radial-gradient(circle at 50% 32%, rgba(255, 59, 48, 0.14), transparent 60%);
    color: #e6e6e4;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
    text-align: center;
  }
  .logo {
    width: 3.5rem;
    height: 3.5rem;
    margin: 0 0 1.25rem;
    display: block;
  }
  .wordmark {
    font-size: 1.125rem;
    font-weight: 900;
    font-style: italic;
    letter-spacing: -0.02em;
    margin: 0 0 0.75rem;
  }
  .divider {
    width: 2rem;
    height: 2px;
    background: #ff3b30;
    border: none;
    margin: 0 0 1rem;
  }
  .icon {
    width: 2.5rem;
    height: 2.5rem;
    margin: 0 0 1.25rem;
    color: #8e8e93;
    opacity: 0.5;
  }
  h1 {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0 0 0.5rem;
  }
  .message {
    color: #8e8e93;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 0.9rem;
    line-height: 1.55;
    margin: 0;
    max-width: 22rem;
  }
</style>
</head>
<body>
  <svg class="logo" viewBox="0 0 100 100" aria-hidden="true">
    <path d="M16 11 L84 11 L84 54 Q84 80 50 95 Q16 80 16 54 Z" fill="#e6e6e4" />
    <path d="M40 11 L60 11 L50 24 Z" fill="#ff3b30" />
    <text x="50" y="68" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-style="italic" font-size="50" fill="#0a0a0b">U</text>
  </svg>
  <p class="wordmark">URHEILU</p>
  <hr class="divider" />
  <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <path d="M12 9v4" />
    <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L14.71 3.86a2 2 0 0 0-3.42 0Z" />
    <path d="M12 17h.01" />
  </svg>
  <h1>Site not configured</h1>
  <p class="message">Authentication isn't set up for this deployment yet. Set the SITE_USERS environment variable to a JSON object mapping usernames to passwords.</p>
</body>
</html>`;
