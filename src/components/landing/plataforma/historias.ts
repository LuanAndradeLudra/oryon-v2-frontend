import type { Recorte } from './DemoRecorte'
import { HERO_ROTAS, type HeroCena, type HeroState } from '../stage/hero/heroStory'
import type { HeroCue } from '../stage/hero/useHeroTimeline'

/**
 * OS ROTEIROS de cada etapa da Plataforma — a mini-história que a demonstração
 * conta (cues) e a região do app que cada capítulo mostra (recorte).
 *
 * Num módulo próprio (30/09) porque são usados por dois lugares: os capítulos
 * das páginas de produto (`SecaoPlataforma`, com os cartões de evidência e
 * seus componentes reais) e o "Como funciona" da home (`SecaoComoFunciona`,
 * só a demonstração) — que assim não carrega os componentes dos cartões.
 */

export type Cue = HeroCue<HeroState, HeroCena>
const S = (t: number, state: HeroState): Cue => ({ t, state })

/** Regiões do app (1280 × 720) — medidas no app real em 25/09. */
export const RECORTES: Record<string, Recorte> = {
  // Conversa + painel do contato.
  conversa: { x: 421, y: 44, w: 859, h: 676 },
  // Quadro do funil, panorâmico: Avaliação, Agendado e Aguardando guia — o card
  // anda entre as duas primeiras, e a terceira mostra que o funil continua.
  // Medido em 1280×720 (30/09): colunas de x = 336 a 1110; começa no
  // cabeçalho das colunas (y = 136 — a faixa de filtros acima saía cortada à
  // esquerda) e termina no vão abaixo do 2º card de Avaliação e Aguardando guia.
  funil: { x: 334, y: 136, w: 778, h: 236 },
  // A gaveta do relatório da campanha.
  // Até a legenda do gráfico (a 640 px ela saía cortada).
  relatorio: { x: 684, y: 0, w: 596, h: 656 },
  // A página do agente (direção D, 27/09 — medido em 1280×720): cabeçalho de
  // identidade, a navegação em três grupos e a seção até o fim dos cartões.
  // Até a borda do app (30/09): em w = 1104 o cabeçalho do agente saía cortado
  // no meio dos botões ("Ligad…").
  agente: { x: 62, y: 48, w: 1218, h: 672 },
  // O Dashboard de ponta a ponta: indicadores, volume, funil, fila e equipe —
  // um recorte mais estreito cortava cartões pela metade.
  painel: { x: 62, y: 56, w: 1218, h: 382 },
}

export interface Historia { rota: string; estado: HeroState; cues: readonly Cue[]; recorte: Recorte; titulo: string }

export const HISTORIAS: Record<string, Historia> = {
  // A configuração do agente, aba por aba: instruções → conhecimento → catálogo.
  conhecer: {
    titulo: 'Oryon · Agentes IA',
    rota: HERO_ROTAS['agente-instrucoes'], estado: 'inicio', recorte: RECORTES.agente,
    cues: [
      { t: 0, state: 'inicio', composition: 'agente-instrucoes' },
      { t: 4600, composition: 'agente-conhecimento' },
      { t: 9400, composition: 'agente-catalogo' },
      { t: 14800, composition: 'agente-catalogo' },
    ],
  },
  atender: {
    titulo: 'Oryon · Conversas',
    rota: HERO_ROTAS.conversa, estado: 'inicio', recorte: RECORTES.conversa,
    cues: [
      { t: 0, state: 'inicio', composition: 'conversa' },
      S(1400, 'demanda'), S(3800, 'resposta'), S(7800, 'confirma'), S(9600, 'situacao'), S(11600, 'etiqueta'),
      S(15800, 'etiqueta'),
    ],
  },
  equipe: {
    titulo: 'Oryon · Conversas',
    rota: HERO_ROTAS.conversa, estado: 'avanco', recorte: RECORTES.conversa,
    cues: [
      { t: 0, state: 'avanco', composition: 'conversa' },
      S(1400, 'pedido'), S(3800, 'assumido'), S(6600, 'humano'), S(9800, 'ganho'),
      S(13800, 'ganho'),
    ],
  },
  funil: {
    titulo: 'Oryon · Funis · Consultas',
    rota: HERO_ROTAS.funil, estado: 'etiqueta', recorte: RECORTES.funil,
    cues: [
      { t: 0, state: 'etiqueta', composition: 'funil' },
      S(2200, 'avanco'),
      S(7600, 'avanco'),
    ],
  },
  campanhas: {
    titulo: 'Oryon · Disparos',
    rota: HERO_ROTAS.disparos, estado: 'ganho', recorte: RECORTES.relatorio,
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
    rota: HERO_ROTAS.painel, estado: 'assumido', recorte: RECORTES.painel,
    cues: [
      { t: 0, state: 'assumido', composition: 'painel' },
      { t: 2400, composition: 'painel-fila' },
      { t: 7000, composition: 'painel-indicadores' },
      { t: 11600, composition: 'painel-volume' },
      { t: 16200, composition: 'painel-volume' },
    ],
  },
}
