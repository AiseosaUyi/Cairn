/**
 * Custom HTML wrapper — Expo Router serves this as the document on web.
 *
 * Injects the PWA manifest link, iOS Safari install hints (Apple's
 * `apple-mobile-web-app-*` meta tags), the theme color, and registers
 * the service worker on first paint. Native builds ignore this file.
 *
 * Reference: https://docs.expo.dev/router/reference/static-rendering/
 */
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1.0, user-scalable=0, viewport-fit=cover"
        />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#A24F33" />
        <meta name="background-color" content="#F8F7F4" />

        {/* iOS Safari install hints — iOS ignores the manifest's display:
            standalone for "Add to Home Screen" unless these are present. */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Cairn" />
        <link rel="apple-touch-icon" href="/assets/icon.png" />

        {/* Social card defaults */}
        <meta property="og:title" content="Cairn — AI Career Companion" />
        <meta
          property="og:description"
          content="Goal-first AI career coach. Pick a specialist, get a path, not a chatbot."
        />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />

        <ScrollViewStyleReset />

        {/* Inline SW registration. Wrapped in try so any registration
            failure (e.g. dev HMR, unsupported browser) is non-fatal. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
              // Capture the install prompt so the React-side hook can fire it
              // on demand. Without this, the event would fire and be lost
              // before any component had a chance to listen.
              window.__deferredInstallPrompt = null;
              window.addEventListener('beforeinstallprompt', (e) => {
                e.preventDefault();
                window.__deferredInstallPrompt = e;
                window.dispatchEvent(new CustomEvent('cairn:install-available'));
              });
              window.addEventListener('appinstalled', () => {
                window.__deferredInstallPrompt = null;
                window.dispatchEvent(new CustomEvent('cairn:installed'));
              });
            `,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
