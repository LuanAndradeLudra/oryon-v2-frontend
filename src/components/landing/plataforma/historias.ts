import type { Recorte } from './DemoRecorte'
import { HERO_ROTAS, type HeroCena, type HeroState } from '../stage/hero/heroStory'
import type { HeroCue } from '../stage/hero/useHeroTimeline'

/**
 * OS ROTEIROS de cada etapa da Plataforma — a mini-história que a demonstração
 * conta (cues), a rota e o estado em que o app nasce.
 *
 * Num módulo próprio (30/09) porque são usados por dois lugares: os capítulos
 * das páginas de produto (`SecaoPlataforma`, com os cartões de evidência e
 * seus componentes reais) e o "Como funciona" da home (`SecaoComoFunciona`,
 * só a demonstração) — que assim não carrega os componentes dos cartões.
 */

export type Cue = HeroCue<HeroState, HeroCena>
const S = (t: number, state: HeroState): Cue => ({ t, state })

/**
 * O quadro de TODAS as etapas: o app inteiro (1280 × 720). Até 30/09 cada
 * etapa mostrava uma região ampliada (o chat, o quadro do funil, a gaveta do
 * relatório), com proporções de 0,91 a 1,83 — e a moldura mudava de tamanho de
 * uma etapa para outra. Com o app inteiro, a janela é a mesma na home e nos
 * capítulos das páginas, e a etapa seguinte é o app navegando entre os módulos.
 */
export const APP_INTEIRO: Recorte = { x: 0, y: 0, w: 1280, h: 720 }

export interface Historia { rota: string; estado: HeroState; cues: readonly Cue[]; titulo: string }

export const HISTORIAS: Record<string, Historia> = {
  // A configuração do agente, aba por aba: instruções → conhecimento → catálogo.
  conhecer: {
    titulo: 'Oryon · Agentes IA',
    rota: HERO_ROTAS['agente-instrucoes'], estado: 'inicio',
    cues: [
      { t: 0, state: 'inicio', composition: 'agente-instrucoes' },
      { t: 4600, composition: 'agente-conhecimento' },
      { t: 9400, composition: 'agente-catalogo' },
      { t: 14800, composition: 'agente-catalogo' },
    ],
  },
  atender: {
    titulo: 'Oryon · Conversas',
    rota: HERO_ROTAS.conversa, estado: 'inicio',
    cues: [
      { t: 0, state: 'inicio', composition: 'conversa' },
      S(1400, 'demanda'), S(3800, 'resposta'), S(7800, 'confirma'), S(9600, 'situacao'), S(11600, 'etiqueta'),
      S(15800, 'etiqueta'),
    ],
  },
  equipe: {
    titulo: 'Oryon · Conversas',
    rota: HERO_ROTAS.conversa, estado: 'avanco',
    cues: [
      { t: 0, state: 'avanco', composition: 'conversa' },
      S(1400, 'pedido'), S(3800, 'assumido'), S(6600, 'humano'), S(9800, 'ganho'),
      S(13800, 'ganho'),
    ],
  },
  funil: {
    titulo: 'Oryon · Funis · Consultas',
    rota: HERO_ROTAS.funil, estado: 'etiqueta',
    cues: [
      { t: 0, state: 'etiqueta', composition: 'funil' },
      S(2200, 'avanco'),
      S(7600, 'avanco'),
    ],
  },
  campanhas: {
    titulo: 'Oryon · Disparos',
    rota: HERO_ROTAS.disparos, estado: 'ganho',
    // Direto no relatório: começando na lista de Disparos, o recorte (a metade
    // direita da tela) mostrava só faixas vazias até a gaveta abrir.
    // Campanha CONCLUÍDA (estado 'ganho'): em 'inicio' ela ainda está saindo e
    // o funil do relatório contradizia os números dos cartões ao lado.
    cues: [
      { t: 0, state: 'ganho', composition: 'relatorio' },
      { t: 9600, composition: 'relatorio' },
    ],
  },
  // O Dashboard no momento em que a Marina espera na fila: o holofote passa
  // pela fila (aba Agora) e depois pelos indicadores e pelo volume da semana
  // (aba Relatórios). A tela não muda de dado (o Dashboard
  // real busca uma vez ao abrir) — só o olhar percorre.
  medir: {
    titulo: 'Oryon · Dashboard',
    rota: HERO_ROTAS.painel, estado: 'assumido',
    cues: [
      { t: 0, state: 'assumido', composition: 'painel' },
      { t: 2400, composition: 'painel-fila' },
      { t: 7000, composition: 'painel-indicadores' },
      { t: 11600, composition: 'painel-volume' },
      { t: 16200, composition: 'painel-volume' },
    ],
  },
}
