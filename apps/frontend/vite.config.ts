/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    // PWA instalable (ícono en pantalla de inicio, arranque a pantalla completa).
    // prompt: tras un deploy, las pestañas abiertas siguen con el JS viejo en
    // memoria; UpdatePrompt ofrece recargar en vez de hacerlo por sorpresa.
    // Las llamadas al API son a otro origen, así que el SW no las intercepta.
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.png'],
      manifest: {
        name: "Mari's Nails Academy",
        short_name: "Mari's Nails",
        description: 'Formación profesional en uñas.',
        theme_color: '#e84393',
        background_color: '#fdf8f5',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Permite precachear el worker de pdfjs y el bundle (ambos > 2 MB default).
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // El SW importa nuestros handlers de push/notificationclick (web-push).
        importScripts: ['/push-listener.js'],
      },
    }),
  ],
  resolve: {
    alias: {
      '@maris-nails/shared': path.resolve(__dirname, '../../packages/shared/index.ts'),
    },
  },
  // Configuración de Vitest. `environment: 'jsdom'` simula un DOM de navegador
  // para renderizar hooks/componentes de React en Node. `setupFiles` registra
  // los matchers de jest-dom antes de cada archivo de test.
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',
  },
})

