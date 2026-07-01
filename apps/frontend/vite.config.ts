/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
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

