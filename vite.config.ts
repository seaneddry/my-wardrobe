import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json';

// VITE_BASE is set by the GitHub Actions workflow to "/<repo-name>/" so the
// app works when served from https://<username>.github.io/<repo-name>/.
export default defineConfig({
  base: process.env.VITE_BASE || '/',
  build: {
    // supabase-js and React make up most of the bundle; it's cached after the first load.
    chunkSizeWarningLimit: 800,
  },
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-64.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'My Wardrobe',
        short_name: 'Wardrobe',
        description: 'Catalogue your clothes and decide what to wear.',
        theme_color: '#f2f2f7',
        background_color: '#f2f2f7',
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg}'],
        runtimeCaching: [
          {
            // Photos from Supabase Storage (signed URLs). Cached on the device so
            // the wardrobe loads fast and uses less of the free bandwidth quota.
            urlPattern: ({ url }) => url.pathname.includes('/storage/v1/object/sign/'),
            handler: 'CacheFirst',
            options: {
              cacheName: 'wardrobe-photos',
              expiration: { maxEntries: 2000, maxAgeSeconds: 60 * 60 * 24 * 30 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
