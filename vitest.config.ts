/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    // 15s em vez do padrao de 5s. Config compartilhada, encostada aqui como
    // excecao autorizada pelo Maestro: nesta maquina o padrao e apertado o
    // bastante para falhar sozinho — o Compasso reproduziu no tip, com
    // arquivos intocados, um timeout de 5s num import dinamico do smoke de
    // login, e outras falhas so aparecem quando varios agentes rodam suite
    // ao mesmo tempo. Mascarar falha real com timeout curto e pior que
    // esperar 10 segundos a mais.
    testTimeout: 15_000,
  },
})
