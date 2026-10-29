import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png'],
      manifest: {
        id: '.',
        name: 'タイムトラベルティーチャー',
        short_name: 'タイムトラベルティーチャー',
        description: '歴史上の偉人や恐竜を転校させて最強のクラスを作る2〜5人用ボードゲーム',
        lang: 'ja',
        start_url: '.',
        scope: '.',
        display: 'standalone',
        orientation: 'landscape',
        background_color: '#268F5E',
        theme_color: '#16221d',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,jpg,ico}'],
        // SNSのリンクのカード用の画像は、アプリの中では使わないので端末に持たせない
        // 紹介ページ（/about/）は、アプリの中では使わないので端末に持たせない
        globIgnores: ['ogp.png', 'about/**'],
        // 紹介ページを開いたときに、アプリの画面に差し替えない
        navigateFallbackDenylist: [/\/about\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.(googleapis|gstatic)\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts',
              expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
});
