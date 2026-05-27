/**
 * Custom HTML wrapper — Expo Router serves this as the document on web,
 * pre-rendered into every route's HTML at static-export time. Native
 * builds ignore this file.
 *
 * Holds the SEO + PWA scaffolding that has to be in <head> for crawlers
 * and install prompts to work:
 *   • PWA manifest + iOS install hints
 *   • OpenGraph + Twitter card defaults
 *   • JSON-LD structured data (Organization + SoftwareApplication)
 *   • Theme color
 *   • Service-worker registration on first paint
 *   • beforeinstallprompt capture (so the React-side hook can fire it)
 *
 * Per-route titles / descriptions are layered on top via
 * `<Head>` from 'expo-router/head' inside individual screens.
 *
 * Reference: https://docs.expo.dev/router/reference/static-rendering/
 */
import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

// Canonical site URL — used for og:image, og:url, canonical, and JSON-LD.
// Set EXPO_PUBLIC_SITE_URL in Vercel env to your actual deploy URL
// (e.g. https://cairn-lac.vercel.app or https://cairn.app once domain
// lands). Default is a placeholder — social previews break if it's wrong.
const SITE_URL = (process.env.EXPO_PUBLIC_SITE_URL ?? 'https://cairn.app').replace(/\/$/, '');
const DEFAULT_DESCRIPTION =
  'AI career mentor with eight specialist companions. State your goal, get a step-by-step path with daily tasks. Goal-first, not a chatbot.';

const ORG_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Cairn',
  url: SITE_URL,
  logo: `${SITE_URL}/assets/icon.png`,
};

const APP_JSONLD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Cairn',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web, iOS, Android',
  description: DEFAULT_DESCRIPTION,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
  },
  aggregateRating: undefined, // add once you have real reviews
};

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

        {/* Title + description — per-route <Head> overrides these. */}
        <title>Cairn — AI Career Companion</title>
        <meta name="description" content={DEFAULT_DESCRIPTION} />
        <link rel="canonical" href={SITE_URL} />

        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.webmanifest" />
        <meta name="theme-color" content="#A24F33" />
        <meta name="background-color" content="#F8F7F4" />

        {/* Favicon + browser tab icons */}
        <link rel="icon" type="image/png" sizes="48x48" href="/assets/favicon.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/assets/icon-192.png" />
        <link rel="icon" type="image/png" sizes="512x512" href="/assets/icon-512.png" />

        {/* iOS Safari install hints — required for "Add to Home Screen" */}
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Cairn" />
        <link rel="apple-touch-icon" sizes="192x192" href="/assets/icon-192.png" />
        <link rel="apple-touch-icon" sizes="512x512" href="/assets/icon-512.png" />
        <link rel="apple-touch-icon" href="/assets/icon.png" />

        {/* OpenGraph (Facebook, LinkedIn, iMessage, Slack) */}
        <meta property="og:site_name" content="Cairn" />
        <meta property="og:title" content="Cairn — AI Career Companion" />
        <meta property="og:description" content={DEFAULT_DESCRIPTION} />
        <meta property="og:type" content="website" />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={`${SITE_URL}/assets/og.png`} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="en_US" />

        {/* Twitter / X */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Cairn — AI Career Companion" />
        <meta name="twitter:description" content={DEFAULT_DESCRIPTION} />
        <meta name="twitter:image" content={`${SITE_URL}/assets/og.png`} />

        {/* Search engine hints */}
        <meta name="robots" content="index, follow, max-image-preview:large" />
        <meta name="googlebot" content="index, follow" />

        {/* JSON-LD structured data — improves rich-result eligibility */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_JSONLD) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(APP_JSONLD) }}
        />

        <ScrollViewStyleReset />

        {/* SW registration + beforeinstallprompt capture. Wrapped in try
            so any failure (dev HMR, unsupported browser) is non-fatal. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
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
