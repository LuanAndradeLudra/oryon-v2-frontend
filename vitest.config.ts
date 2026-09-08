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
    // FORMA: no vitest 4 isto e' opcao de TOPO. O `poolOptions.forks.maxForks`
    // da documentacao antiga foi REMOVIDO na v4 e e' ignorado em silencio — a
    // primeira versao desta mudanca usava a forma velha, o typecheck passou, a
    // suite passou, e o unico sinal era uma linha `DEPRECATED` no meio do log.
    //
    // COMO CONFERIR QUE O TETO PEGA — e NAO SEJA POR TEMPO. Comparar 4 contra
    // 1 mostra o tempo dobrar, mas isso so descarta "o teto virou 1", que
    // ninguem levantou. Nao descarta "o teto nao existe": com poucos arquivos
    // o paralelismo nao satura e 4 e 15 dao tempos parecidos — ou seja, um
    // config IGNORADO produz os mesmos numeros que um config funcionando.
    // (Achado do Esquadro contra a primeira prova deste PR, que era por tempo.)
    //
    // O que discrimina e CONTAGEM DE PROCESSO. Medido aqui, mesmo escopo,
    // repouso de 9 processos node:
    //
    //   sem flag (este config)   pico 16   delta  7
    //   --maxWorkers=15          pico 25   delta 16
    //
    // O delta MAIS QUE DOBRA. No mesmo par, o tempo foi 17,3 s contra 11,4 s —
    // isto e', o cenario sem teto saiu MAIS RAPIDO, e quem olhasse so o relogio
    // concluiria o oposto do que aconteceu.
    //
    // POR QUE 4, e nao outro numero: medicao do Andaime (mesmos 11 arquivos,
    // uma variavel so) — `-w4` consome 1,18 GB contra 0,69 GB do `-w1`, com o
    // tempo indo de 17 s para 36 s. Menos workers reduz memoria de verdade,
    // mas NAO proporcionalmente: ha custo fixo de processo principal e de grafo
    // de modulos, e o teto pesa mais que a quantidade de arquivos. 4 e' o
    // ponto em que a folga desta maquina cabe sem dobrar o tempo de todo mundo.
    //
    // NAO REPLIQUE NO JEST. Os dois runners se comportam de forma diferente e o
    // teto de workers nao governa o custo no jest do mesmo jeito — medicoes em
    // `coord/DEV-SLOTS.md`, com os donos de cada uma. O mesmo problema existe no
    // backend e esta na triagem como divida ABERTA de proposito, porque o
    // backend do epico ja' fechou.
    //
    // Fixado no config, e nao deixado como flag de linha de comando, porque
    // FLAG QUE SE ESQUECE NAO E CONTROLE: os dois incidentes aconteceram com a
    // flag disponivel e nao usada.
    maxWorkers: 4,
  },
})
