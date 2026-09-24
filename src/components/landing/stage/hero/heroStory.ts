import type { HeroCue } from './useHeroTimeline'

/**
 * O ROTEIRO — uma operação real atravessando os módulos do Oryon.
 *
 * Rodada de 24/09 (noite): o palco passou a rodar o PRÓPRIO app em modo
 * demonstração (`src/demo/`). O roteiro não desenha mais nada: cada cue
 * muda o estado do backend de demonstração (`state`) ou navega o app para
 * outro módulo (`cena`), e as telas reagem pelos próprios mecanismos de
 * produção — eventos de tempo real, recarga de dados, rotas.
 *
 * A história, em uma frase: uma campanha chega no WhatsApp da Marina, ela pede
 * uma proposta, o Agente IA responde com o preço do catálogo, atualiza o
 * contato e avança o negócio no funil; ela pede uma pessoa, a Ana assume e
 * fecha a venda. Cada módulo aparece fazendo a sua parte da mesma operação.
 *
 * Regra de direção mantida: a troca de módulo acontece ANTES da mudança que
 * ele existe para mostrar (o visitante já está olhando o funil quando o card
 * anda), e cada mudança tem tempo de leitura antes da próxima.
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
export type HeroCena = 'disparos' | 'conversa' | 'funil' | 'agente' | 'reinicio'

export const HERO_ROTAS: Record<Exclude<HeroCena, 'reinicio'>, string> = {
  disparos: '/campaigns',
  conversa: '/conversations?id=demo-conv-0',
  funil: '/pipelines/pl-vendas',
  agente: '/agents?agent=ag-vendas&tab=capabilities',
}

type Cue = HeroCue<HeroState, HeroCena>
const S = (t: number, state: HeroState): Cue => ({ t, state })
const C = (t: number, composition: HeroCena): Cue => ({ t, composition })

export const HERO_CUES: readonly Cue[] = [
  // ── Disparos: a campanha sai e chega no WhatsApp da Marina ────────────────
  { t: 0, state: 'inicio', composition: 'disparos' },

  // ── Conversas: ela responde, o Agente IA atende sozinho ───────────────────
  C(5200, 'conversa'),
  S(6600, 'demanda'),
  S(9400, 'resposta'),
  // Parado: a resposta traz preço e condição — precisa ser lida.
  S(13400, 'confirma'),
  S(15400, 'situacao'),
  S(17600, 'etiqueta'),

  // ── Funis: o negócio anda junto com a conversa ────────────────────────────
  C(20600, 'funil'),
  S(22200, 'avanco'),

  // ── Agentes IA: o que o agente pode (e não pode) fazer ────────────────────
  C(26600, 'agente'),

  // ── Conversas: a passagem para a pessoa, e quem fecha é ela ───────────────
  C(32200, 'conversa'),
  S(33400, 'pedido'),
  S(35800, 'assumido'),
  S(38400, 'humano'),
  S(41400, 'ganho'),

  // ── Reinício: o palco esvazia antes de os dados voltarem ao começo ────────
  C(45600, 'reinicio'),
] as const

/** Tempo com o palco vazio, antes de recomeçar. */
export const HERO_TAIL_MS = 900

/**
 * O quadro estático (`prefers-reduced-motion`, aba oculta na primeira
 * pintura): o funil logo depois de o Agente avançar o negócio — o único
 * instante que se explica sozinho parado.
 */
export const HERO_STATIC_CUE = HERO_CUES.findIndex((c) => c.state === 'avanco')

/**
 * O registro do Agente IA (satélite): o que a IA fez, na voz do produto.
 * Cada frase foi conferida contra a auditoria de capacidades: a IA não
 * define valor, não se pausa e não fecha venda.
 */
export const HERO_NOTES: Partial<Record<HeroState, string>> = {
  resposta: 'Respondeu com o preço do catálogo',
  situacao: 'Atualizou a situação do contato',
  avanco: 'Avançou o negócio para Proposta',
  assumido: 'Chamou uma atendente para fechar',
  humano: 'A Ana entrou na conversa: a IA fica em pausa',
  ganho: 'Venda fechada pela Ana — a IA não fecha negócio',
}
