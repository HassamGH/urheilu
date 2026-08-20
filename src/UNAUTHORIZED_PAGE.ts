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
    align-items: center;
    justify-content: center;
    background: #0a0a0b;
    background-image: radial-gradient(circle at 50% 0%, rgba(230, 230, 228, 0.06), transparent 60%);
    color: #e6e6e4;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
  }
  .card {
    width: 100%;
    max-width: 22rem;
    margin: 1.5rem;
    padding: 2.5rem 2rem;
    text-align: center;
    background: #161618;
    border: 1px solid #2c2c2e;
    border-radius: 1rem;
  }
  .logo {
    width: 3.5rem;
    height: 3.5rem;
    margin: 0 auto 1.25rem;
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
    margin: 0 auto 1rem;
  }
  .message {
    color: #8e8e93;
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 0.9rem;
    line-height: 1.55;
    margin: 0;
  }
</style>
</head>
<body>
  <div class="card">
    <svg class="logo" viewBox="0 0 100 100" aria-hidden="true">
      <path d="M16 11 L84 11 L84 54 Q84 80 50 95 Q16 80 16 54 Z" fill="#e6e6e4" />
      <path d="M40 11 L60 11 L50 24 Z" fill="#ff3b30" />
      <text x="50" y="68" text-anchor="middle" font-family="Arial, Helvetica, sans-serif" font-weight="900" font-style="italic" font-size="50" fill="#0a0a0b">U</text>
    </svg>
    <p class="wordmark">URHEILU</p>
    <hr class="divider" />
    <p class="message">This site is private. Enter your credentials when prompted to continue.</p>
  </div>
</body>
</html>`;
