import type { HeroCue } from './useHeroTimeline'

/**
 * O ROTEIRO — uma operação real atravessando os módulos do Oryon.
 *
 * O palco roda o PRÓPRIO app em modo demonstração (`src/demo/`). O roteiro não
 * desenha nada: cada cue muda o estado do backend de demonstração (`state`) ou
 * navega o app para outro módulo (`composition` = cena), e as telas reagem
 * pelos próprios mecanismos de produção.
 *
 * A história, em quatro capítulos:
 *  1. Disparos — a campanha "Renovação Pro" sai e o relatório mostra o retorno;
 *  2. Atendimento com IA — a Marina responde, o Agente IA atende com o preço
 *     do catálogo e atualiza o CRM sozinho;
 *  3. Funil de vendas — o negócio avança de etapa junto com a conversa;
 *  4. A equipe no controle — ela pede uma pessoa, a Ana assume e fecha.
 *
 * A tela de Agentes IA saiu do roteiro a pedido do PO (24/09): a interface
 * ainda vai mudar.
 *
 * Regra de direção: a troca de módulo acontece ANTES da mudança que ele existe
 * para mostrar, e cada mudança tem tempo de leitura antes da próxima.
 */

export type HeroState =
  | 'inicio'     // a campanha está saindo; a Marina recebe o modelo
  | 'demanda'    // Marina responde pedindo a proposta
  | 'resposta'   // o Agente responde com a condição do catálogo
  | 'confirma'   // Marina confirma o interesse
  | 'situacao'   // o Agente muda a situação do contato
  | 'etiqueta'   // o Agente etiqueta a conversa
  | 'avanco'     // o Agente avança o negócio de etapa
  | 'pedido'     // Marina pede falar com uma pessoa
  | 'assumido'   // o Agente chama a atendente e põe a conversa na fila
  | 'humano'     // a Atendente intervém (a IA pausa) e responde
  | 'ganho'      // a Atendente fecha o negócio como ganho

/** O módulo do app em cena. Cada um é uma rota real. */
export type HeroCena = 'disparos' | 'relatorio' | 'conversa' | 'funil' | 'reinicio'

export const HERO_ROTAS: Record<Exclude<HeroCena, 'reinicio'>, string> = {
  disparos: '/campaigns',
  // O relatório real da campanha abre por cima da lista (a gaveta do produto).
  relatorio: '/campaigns?report=cp-renovacao',
  conversa: '/conversations?id=demo-conv-0',
  funil: '/pipelines/pl-vendas',
}

type Cue = HeroCue<HeroState, HeroCena>
const S = (t: number, state: HeroState): Cue => ({ t, state })
const C = (t: number, composition: HeroCena): Cue => ({ t, composition })

/**
 * RITMO (25/09, pedido do PO): o palco corria rápido demais para quem vê pela
 * primeira vez. Todo o roteiro é esticado por este fator — as proporções entre
 * os passos ficam as mesmas; muda só o tempo para entender cada um.
 */
export const HERO_RITMO = 1.3

const CUES_BASE: readonly Cue[] = [
  // ── 1 · Disparos: a campanha sai; o relatório abre com os números dela ────
  { t: 0, state: 'inicio', composition: 'disparos' },
  C(1900, 'relatorio'),

  // ── 2 · Atendimento com IA ────────────────────────────────────────────────
  C(7200, 'conversa'),
  S(8600, 'demanda'),
  S(11400, 'resposta'),
  // Parado: a resposta traz preço e condição — precisa ser lida.
  S(15400, 'confirma'),
  S(17400, 'situacao'),
  S(19600, 'etiqueta'),

  // ── 3 · Funil: o negócio anda junto com a conversa ────────────────────────
  C(22600, 'funil'),
  S(24200, 'avanco'),

  // ── 4 · A equipe no controle: a passagem para a pessoa, que fecha ─────────
  C(29600, 'conversa'),
  S(30800, 'pedido'),
  S(33200, 'assumido'),
  S(35800, 'humano'),
  // O fechamento é o clímax: mais tempo em cena (6,2 s) para ser lido.
  S(38800, 'ganho'),

  // ── Reinício: o palco esvazia antes de os dados voltarem ao começo ────────
  C(45000, 'reinicio'),
] as const

export const HERO_CUES: readonly Cue[] = CUES_BASE.map((c) => ({ ...c, t: Math.round(c.t * HERO_RITMO) }))

/** Tempo com o palco vazio, antes de recomeçar. */
export const HERO_TAIL_MS = 900

/**
 * O quadro estático (`prefers-reduced-motion`, aba oculta na primeira
 * pintura): o funil logo depois de o Agente avançar o negócio — o único
 * instante que se explica sozinho parado.
 */
export const HERO_STATIC_CUE = HERO_CUES.findIndex((c) => c.state === 'avanco')

// ─── Capítulos: o que o visitante lê embaixo do palco ────────────────────────

export type HeroCapituloId = 'disparos' | 'atendimento' | 'funil' | 'equipe'

export interface HeroCapitulo {
  id: HeroCapituloId
  titulo: string
  /** O valor entregue — o "por que isso importa", em uma frase. */
  valor: string
  /** Índice do cue em que o capítulo começa (clicar pula para ele). */
  cue: number
}

const idx = (pred: (c: Cue) => boolean) => HERO_CUES.findIndex(pred)

export const HERO_CAPITULOS: readonly HeroCapitulo[] = [
  {
    id: 'disparos',
    titulo: 'Campanhas no WhatsApp',
    valor: 'Dispare para a base inteira e acompanhe entrega, leitura e resposta em tempo real.',
    cue: 0,
  },
  {
    id: 'atendimento',
    titulo: 'Atendimento com IA',
    valor: 'O Agente IA responde na hora, com o preço do seu catálogo, e atualiza o CRM sozinho.',
    cue: idx((c) => c.composition === 'conversa'),
  },
  {
    id: 'funil',
    titulo: 'Funil que anda sozinho',
    valor: 'Cada conversa move o negócio de etapa — o funil reflete o que está acontecendo agora.',
    cue: idx((c) => c.composition === 'funil'),
  },
  {
    id: 'equipe',
    titulo: 'A equipe no controle',
    valor: 'A IA chama a pessoa certa na hora certa — e quem fecha a venda é sempre a sua equipe.',
    cue: idx((c) => c.state === 'pedido') - 1,
  },
]

/** Em que capítulo a história está. */
export function capituloDe(estado: HeroState, cena: HeroCena, index: number): HeroCapituloId {
  if (cena === 'disparos' || cena === 'relatorio') return 'disparos'
  if (cena === 'funil') return 'funil'
  if (cena === 'reinicio') return 'equipe'
  return index >= HERO_CAPITULOS[3].cue ? 'equipe' : 'atendimento'
}

/**
 * A NARRAÇÃO do momento — uma linha curta que diz o que acabou de acontecer
 * na tela. Cada frase foi conferida contra a auditoria de capacidades: a IA
 * não define valor, não se pausa e não fecha venda.
 */
export function batidaDe(estado: HeroState, cena: HeroCena): string {
  if (cena === 'disparos') return 'A campanha "Renovação Pro" sai para 1.240 clientes'
  if (cena === 'relatorio') return 'O relatório mostra quem recebeu, leu e respondeu'
  if (cena === 'funil') {
    return estado === 'avanco'
      ? 'O negócio da Marina passa de Qualificação para Proposta'
      : 'O funil de vendas, com o negócio da Marina em Qualificação'
  }
  switch (estado) {
    case 'inicio': return 'A Marina recebe a campanha no WhatsApp'
    case 'demanda': return 'A Marina responde pedindo uma proposta'
    case 'resposta': return 'O Agente IA responde na hora, com o preço do catálogo'
    case 'confirma': return 'A Marina confirma o interesse'
    case 'situacao': return 'A IA atualiza a situação do contato no CRM'
    case 'etiqueta': return 'e etiqueta a conversa como "proposta enviada"'
    case 'avanco': return 'O negócio já está em Proposta'
    case 'pedido': return 'A Marina pede para falar com uma pessoa'
    case 'assumido': return 'A IA chama a Ana e coloca a conversa na fila'
    case 'humano': return 'A Ana assume — a IA fica em pausa enquanto ela atende'
    case 'ganho': return 'A Ana fecha a venda: o negócio vai para Ganho'
  }
}
