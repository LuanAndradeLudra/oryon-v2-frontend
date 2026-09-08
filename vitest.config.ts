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
    // ── Teto de processos, FIXADO em 4 ────────────────────────────────────
    // Sem isto o padrao do vitest e `nucleos - 1` = 15 nesta maquina, e 15
    // forks foram CAUSA RAIZ DE DOIS INCIDENTES: mortes de processo por falta
    // de memoria e um `npm install` interrompido que deixou o `node_modules`
    // quebrado.
    //
    // MEDIDO, uma variavel so, mesmos 11 arquivos e 122 testes, todos passando
    // nos dois lados:
    //
    //   -w4   1,18 GB   17 s   4 forks
    //   -w1   0,69 GB   36 s   1 fork
    //
    // 42% menos memoria ao preco de dobrar o tempo — e NAO e proporcional:
    // 4x menos workers nao da 4x menos memoria, porque ha custo fixo de
    // processo principal e de grafo de modulos. Medido tambem que o teto pesa
    // MAIS que a quantidade de arquivos: de 1 para 11 arquivos custou +0,21 GB;
    // de 1 para 4 workers custou +0,49 GB.
    //
    // VALE PARA VITEST, NAO PARA JEST. No jest a mesma variavel e ruido:
    // `-w2` deu 3,59 GB contra `-w4` com 3,50 GB na mesma arvore. Quem
    // replicar isto no backend nao ganha nada — os dois runners sao diferentes
    // de verdade, e essa era a duvida que podia derrubar este pino.
    //
    // FORMA: no vitest 4 isto e' opcao de TOPO. O `poolOptions.forks.maxForks`
    // da documentacao antiga foi REMOVIDO na v4 e e' ignorado em silencio — o
    // unico sinal e' uma linha `DEPRECATED` no meio do log, com a suite
    // passando normalmente. Escrito assim porque a primeira versao desta
    // mudanca usava a forma velha e NAO CAPAVA NADA.
    //
    // Fixado no config, e nao deixado como flag de linha de comando, porque
    // FLAG QUE SE ESQUECE NAO E CONTROLE: os dois incidentes aconteceram com a
    // flag disponivel e nao usada.
    maxWorkers: 4,
  },
})
