import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import localFont from 'next/font/local';
import '../styles.css';
import { ServiceWorkerRegistration } from './service-worker-registration';
import { ContentProtection } from './content-protection';
import { NavigationProgress } from '../lib/navigation';
import { AppLoadingScreen } from '../components/common/AppLoadingScreen';

// Self-hosted at build time instead of the old `<link>` to fonts.googleapis.com — that request
// was already preconnected, but this removes it (and the CSS-then-font-file round trip behind it)
// entirely: the font files ship from our own origin alongside the rest of the build output, with
// zero external DNS/TLS/request needed before text can render. `display: 'swap'` keeps the same
// no-invisible-text behavior the old `<link>` had; `variable` feeds styles.css's `--font-sans`
// (see @theme in styles.css) rather than setting font-family directly, so nothing about how the
// rest of the app references the font has to change. Same weights as before — 800 was requested but
// never used (grepped for font-extrabold), 900 is used constantly via font-black.
const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '900'],
  display: 'swap',
  variable: '--font-inter'
});

// `next/font/google` (used for Inter above) wasn't an option here: Material Symbols is a variable
// icon font pinned to one exact wght/FILL combination via the old URL's `@400,0`, and next/font's
// google-axis handling is built around ordinary text fonts' weight/style — there was no confirmed-
// safe way to carry that exact pinning through it without risking every icon silently rendering as
// the wrong glyph. `next/font/local` sidesteps that concern entirely: `src/fonts/material-symbols-
// outlined.woff2` is the literal static file Google's own css2 API serves for this exact `wght,
// FILL@400,0` request (fetched directly from the same `fonts.gstatic.com` URL the old `<link>`
// pulled at runtime) — self-hosting the identical bytes, not re-deriving them, so there's no axis-
// pinning risk to begin with. Same self-hosting payoff as Inter: no external DNS/TLS/CSS-then-font
// round trip on first load.
const materialSymbols = localFont({
  src: '../fonts/material-symbols-outlined.woff2',
  display: 'swap',
  weight: '400',
  style: 'normal',
  variable: '--font-material-symbols'
});

export const metadata: Metadata = {
  title: 'Urheilu',
  description: 'Live sports streams across football, basketball, cricket, and more.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: '/favicon.svg',
    apple: '/icons/icon-192.png'
  }
};

export const viewport: Viewport = {
  themeColor: '#0a0a0b',
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${materialSymbols.variable}`}>
      <head>
        {/* The actual data/image origins the app talks to directly (see WATCHFOOTY_API_ORIGINS in
            watchfooty.ts, ESPN_BASE in cricinfo.ts, STREAMED_BASE in streamed.ts) — an early
            connection means the DNS+TLS handshake is already done by the time the first real
            fetch to each of them fires. `.ru`/`.su` are preconnected too, not just the primary
            `.st` — they're only actually used on a failover, but that's exactly when shaving a
            DNS+TLS round trip off matters most. Unlike the fallback fetch logic itself (which costs
            nothing when the primary's healthy, since a later origin is never even attempted), each
            of these IS a small fixed cost on every single page load regardless of whether it's ever
            used — a few extra sockets opened and idled — so this isn't "free" the way trying more
            origins in requestJson is. Worth it here since `.st` has proven flaky enough in practice
            to matter; wouldn't reflexively add a 4th without the same being true of it. */}
        <link rel="preconnect" href="https://api.watchfooty.st" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.watchfooty.ru" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://api.watchfooty.su" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://site.web.api.espn.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://streamed.pk" crossOrigin="anonymous" />
      </head>
      <body className="bg-brand-bg text-white font-sans">
        <NavigationProgress>{children}</NavigationProgress>
        <AppLoadingScreen />
        <ServiceWorkerRegistration />
        <ContentProtection />
      </body>
    </html>
  );
}
