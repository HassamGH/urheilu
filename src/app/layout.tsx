import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import '../styles.css';
import { ServiceWorkerRegistration } from './service-worker-registration';
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
    <html lang="en" className={inter.variable}>
      <head>
        {/* Inter no longer needs these (self-hosted via next/font, see above) — Material Symbols is
            the only thing left still loaded from Google Fonts directly. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
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
        {/* Only the exact weight/fill instance actually used (wght 400, FILL 0 — see the fixed
            font-weight: normal in styles.css's .material-symbols-outlined utility and the fact
            FILL is never varied anywhere) rather than the full variable font range. Left on Google
            Fonts rather than migrated to next/font/google like Inter above: this is a variable icon
            font pinned to specific wght/FILL axis values via the URL itself, and next/font's axes
            support is built around ordinary text fonts' weight/style — there's no confirmed-safe way
            to carry that exact axis pinning through it without risking every icon on the site
            silently rendering as the wrong glyph, so it's not worth the migration here. */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@400,0&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-brand-bg text-white font-sans">
        <NavigationProgress>{children}</NavigationProgress>
        <AppLoadingScreen />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
