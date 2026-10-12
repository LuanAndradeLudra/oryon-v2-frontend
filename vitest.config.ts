/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      // `src/lib/icons.tsx` reexporta o pacote original por este nome (o
      // alias vive em vite.config.ts). Sem ele, qualquer teste que monte a
      // NavSidebar — como o de rotas da demonstração — falha ao importar.
      'lucide-react-original': path.resolve(__dirname, './node_modules/lucide-react'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
