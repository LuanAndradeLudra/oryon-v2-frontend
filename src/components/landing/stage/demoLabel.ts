/**
 * Rótulo obrigatório no chrome do quadro (P14 — nada falso na tela).
 *
 * Mora num módulo PRÓPRIO, fora de `types.ts`: o login importa `STAGE_DESIGN`
 * de `types.ts` estaticamente (para o Suspense ter a proporção certa) e o
 * Rollup não descarta constantes-string não usadas — a string vazou para o
 * chunk de entrada (prova de build, 24/09). Só os componentes do palco
 * importam daqui; a prova continua sendo
 * `grep -L "Dados de demonstração" dist/assets/<entrada>.js`.
 */
export const STAGE_DEMO_LABEL = 'Dados de demonstração'
