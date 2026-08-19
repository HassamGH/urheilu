import type { Metadata, Viewport } from 'next';
import '../styles.css';
import { ServiceWorkerRegistration } from './service-worker-registration';
import { NavigationProgress } from '../lib/navigation';
import { AppLoadingScreen } from '../components/common/AppLoadingScreen';

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* The actual data/image origins the app talks to directly (see ASSET_ORIGIN in
            watchfooty.ts, ESPN_BASE in cricinfo.ts, STREAMED_BASE in streamed.ts) — an early
            connection means the DNS+TLS handshake is already done by the time the first real
            fetch to each of them fires. */}
        <link rel="preconnect" href="https://api.watchfooty.st" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://site.web.api.espn.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://streamed.pk" crossOrigin="anonymous" />
        {/* Only the exact weight/fill instance actually used (wght 400, FILL 0 — see the fixed
            font-weight: normal in styles.css's .material-symbols-outlined utility and the fact
            FILL is never varied anywhere) rather than the full variable font range. */}
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@400,0&display=swap" rel="stylesheet" />
        {/* 800 was requested but never used (grepped for font-extrabold); 900 is used constantly
            via font-black but was missing, so font-black elements were silently falling back to a
            browser-synthesized faux bold instead of the real weight. */}
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;900&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-brand-bg text-white font-sans">
        <NavigationProgress>{children}</NavigationProgress>
        <AppLoadingScreen />
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}
