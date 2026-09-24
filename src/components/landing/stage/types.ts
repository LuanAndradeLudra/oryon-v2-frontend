/**
 * CONTRATO do palco do hero (landing e login) — SCRUM-1097, fase "porta de
 * entrada" (24/09/2026). Este arquivo é do orquestrador e está CONGELADO: as
 * três frentes (palco, landing, auth) constroem contra ele. Mudança aqui só
 * pelo orquestrador, com aviso às frentes.
 *
 * O palco reproduz a gramática visual das telas reais (Conversas, Funis,
 * Disparos) com primitivos de `ui/` e dados de demonstração — nunca importa
 * componentes do app logado (arrastariam api/socket/menus para a página
 * pública). Regra P14: o quadro carrega sempre o rótulo "Dados de demonstração".
 */

/** Cenas disponíveis — só módulos que existem e estão ligados por flag. */
export type StageScene = 'inbox' | 'funil' | 'disparo'

/** Quadros "posáveis" de uma cena (para o StagePoster e reduced-motion). */
export type StageFrameKey = 'inicio' | 'ia' | 'handoff' | 'humano' | 'final'

/** Layout do quadro: desktop = shell inteiro; compact = só a coluna do chat. */
export type StageLayout = 'desktop' | 'compact'

export interface HeroStageProps {
  /** Cena inicial. Default 'inbox'. */
  scene?: StageScene
  /** Abas exibidas, na ordem. Default: as três. */
  scenes?: StageScene[]
  /** Toca a timeline quando visível. Default true; false = comporta-se como poster. */
  autoplay?: boolean
  /** Reinicia ao terminar. Default true. */
  loop?: boolean
  onSceneChange?: (scene: StageScene) => void
  className?: string
}

export interface StagePosterProps {
  scene: StageScene
  /** Quadro estático. Default 'handoff'. */
  frame?: StageFrameKey
  /** Default 'desktop'. */
  layout?: StageLayout
  className?: string
}

/** Medidas de desenho do quadro; o StageFrame escala por ResizeObserver. */
export const STAGE_DESIGN = {
  width: 1120,
  height: 640,
  compactWidth: 360,
  compactHeight: 560,
} as const

// O rótulo "Dados de demonstração" mora em `demoLabel.ts` (só o palco importa):
// este arquivo é importado estaticamente pelo login e uma string aqui vaza
// para o chunk de entrada (prova de build, 24/09).
