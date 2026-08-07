import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'icons/*.png'],
      manifest: {
        name: 'Dashboard Consórcio',
        short_name: 'Dashboard',
        description: 'Dashboard de assessores de consórcio',
        theme_color: '#F5C000',
        background_color: '#000000',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // NÃO faz precache do index.html: a "casca" do app vem sempre fresca
        // da rede, evitando que mudanças de frontend "voltem atrás" no reload.
        globPatterns: ['**/*.{js,css,ico,png,svg}'],
        navigateFallback: null,
        cleanupOutdatedCaches: true,
        // Sem skipWaiting/clientsClaim: no modo 'prompt' o novo SW fica em espera
        // até o usuário clicar em "Atualizar" (updateServiceWorker(true) aplica e
        // recarrega). Assim o aviso só aparece quando há build novo do frontend.
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/.*\/api\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-cache',
              networkTimeoutSeconds: 10,
            },
          },
        ],
      },
    }),
  ],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
