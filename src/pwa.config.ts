/**
 * PWA Configuration Presets for Vite PWA Plugin
 * 
 * Provides:
 * 1. Heavy Offline Caching Strategy (Offline-First precache + runtime caches)
 * 2. Minimal Install-Only Strategy (Network-First without stale cache risks)
 */

export interface PwaPluginOptions {
  projectName?: string;
  shortName?: string;
  themeColor?: string;
  backgroundColor?: string;
  description?: string;
}

/**
 * Heavy Offline-First PWA Configuration
 * Precaches core HTML, CSS, JS, Fonts, and SVG assets, with runtime caching for images and APIs.
 */
export function getHeavyPwaConfig(options: PwaPluginOptions = {}) {
  const {
    projectName = 'UpScramble',
    shortName = 'UpScramble',
    themeColor = '#4f46e5',
    backgroundColor = '#020617',
    description = 'Fast-paced offline-first word scramble puzzle game',
  } = options;

  return {
    registerType: 'autoUpdate' as const,
    includeAssets: ['favicon.png', 'pwa-icon.png', 'pwa-icon.svg'],
    manifest: {
      name: projectName,
      short_name: shortName,
      description: description,
      theme_color: themeColor,
      background_color: backgroundColor,
      display: 'standalone' as const,
      orientation: 'portrait' as const,
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: '/pwa-icon.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/pwa-icon.svg',
          sizes: '192x192 512x512',
          type: 'image/svg+xml',
          purpose: 'any',
        },
        {
          src: '/pwa-icon.svg',
          sizes: '512x512',
          type: 'image/svg+xml',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      // Precache app shell, assets, and word dictionary files
      globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff,woff2,txt}'],
      // Increase max file size limit to 5MB to accommodate offline dictionary text files
      maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
      cleanupOutdatedCaches: true,
      clientsClaim: true,
      skipWaiting: true,
      runtimeCaching: [
        {
          // App Navigation (index.html) - Network-first with instant offline fallback
          urlPattern: ({ request }: { request: Request }) => request.mode === 'navigate',
          handler: 'NetworkFirst' as const,
          options: {
            cacheName: 'html-cache',
            networkTimeoutSeconds: 3,
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          // Word Dictionaries (/words/*) - Stale-While-Revalidate so offline is instant & updates sync in background
          urlPattern: /\/words\/.*\.txt$/i,
          handler: 'StaleWhileRevalidate' as const,
          options: {
            cacheName: 'word-dictionaries-cache',
            expiration: {
              maxEntries: 100,
              maxAgeSeconds: 60 * 60 * 24 * 90, // 90 days
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          // Cache Google Fonts Stylesheets
          urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
          handler: 'StaleWhileRevalidate' as const,
          options: {
            cacheName: 'google-fonts-stylesheets',
            expiration: {
              maxEntries: 10,
              maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
            },
          },
        },
        {
          // Cache Google Fonts Webfonts
          urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
          handler: 'CacheFirst' as const,
          options: {
            cacheName: 'google-fonts-webfonts',
            expiration: {
              maxEntries: 30,
              maxAgeSeconds: 60 * 60 * 24 * 365,
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
        {
          // Runtime caching for static images / icons
          urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/i,
          handler: 'StaleWhileRevalidate' as const,
          options: {
            cacheName: 'images-cache',
            expiration: {
              maxEntries: 60,
              maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
            },
          },
        },
        {
          // Network-first for dynamic API calls
          urlPattern: /\/api\/.*/i,
          handler: 'NetworkFirst' as const,
          options: {
            cacheName: 'api-runtime-cache',
            networkTimeoutSeconds: 5,
            expiration: {
              maxEntries: 50,
              maxAgeSeconds: 60 * 60 * 24, // 1 day
            },
            cacheableResponse: {
              statuses: [0, 200],
            },
          },
        },
      ],
    },
  };
}

/**
 * Minimal Installability-Only PWA Configuration (Network-First)
 * Provides manifest, home screen installation, and service worker registration
 * without caching static or HTML assets (all requests go straight to network).
 */
export function getMinimalPwaConfig(options: PwaPluginOptions = {}) {
  const {
    projectName = 'Vite App',
    shortName = 'ViteApp',
    themeColor = '#4f46e5',
    backgroundColor = '#0f172a',
    description = 'Installable Progressive Web Application',
  } = options;

  return {
    registerType: 'autoUpdate' as const,
    includeAssets: ['favicon.png', 'pwa-icon.png', 'pwa-icon.svg'],
    manifest: {
      name: projectName,
      short_name: shortName,
      description: description,
      theme_color: themeColor,
      background_color: backgroundColor,
      display: 'standalone' as const,
      orientation: 'portrait' as const,
      scope: '/',
      start_url: '/',
      icons: [
        {
          src: '/pwa-icon.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any maskable',
        },
        {
          src: '/pwa-icon.svg',
          sizes: '192x192 512x512',
          type: 'image/svg+xml',
          purpose: 'any',
        },
        {
          src: '/pwa-icon.svg',
          sizes: '512x512',
          type: 'image/svg+xml',
          purpose: 'maskable',
        },
      ],
    },
    workbox: {
      // Precache only verified static icons
      globPatterns: ['pwa-icon.svg'],
      navigateFallback: null,
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          // Always query network first, never serve stale app builds
          urlPattern: /.*/i,
          handler: 'NetworkFirst' as const,
          options: {
            cacheName: 'network-first-cache',
            networkTimeoutSeconds: 4,
          },
        },
      ],
    },
  };
}

export const minimalPwaConfig = getMinimalPwaConfig({
  projectName: 'UpScramble',
  shortName: 'UpScramble',
  description: 'Word scramble puzzle and solver game',
  themeColor: '#4f46e5',
  backgroundColor: '#0f172a',
});

export const heavyPwaConfig = getHeavyPwaConfig({
  projectName: 'UpScramble',
  shortName: 'UpScramble',
  description: 'Word scramble puzzle and solver game',
  themeColor: '#4f46e5',
  backgroundColor: '#0f172a',
});
