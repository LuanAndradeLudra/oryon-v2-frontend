import type { HeroCue } from './useHeroTimeline'

/**
 * O ROTEIRO — uma operação real atravessando os módulos da Oryon.
 *
 * O palco roda o PRÓPRIO app em modo demonstração (`src/demo/`). O roteiro não
 * desenha nada: cada cue muda o estado do backend de demonstração (`state`) ou
 * navega o app para outro módulo (`composition` = cena), e as telas reagem
 * pelos próprios mecanismos de produção.
 *
 * A história, em quatro capítulos:
 *  1. Atendimento com IA — a campanha de retorno chega no WhatsApp da Marina,
 *     ela pede horário e o Agente IA responde com valor, convênio e agenda;
 *  2. Funil — o atendimento avança de etapa junto com a conversa;
 *  3. A equipe no controle — ela pede um encaixe, a Ana assume e confirma;
 *  4. De onde veio a conversa — o relatório da campanha de retorno.
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
export type HeroCena =
  | 'disparos' | 'relatorio' | 'conversa' | 'funil' | 'reinicio'
  // Seção Plataforma (26/09): a configuração do agente e o Dashboard — cada
  // cena é uma aba ou um ponto da MESMA tela real; o Hero não as usa.
  | 'agente-instrucoes' | 'agente-conhecimento' | 'agente-catalogo'
  // Seção Limites da IA: a aba Capacidades do mesmo agente.
  | 'agente-capacidades' | 'agente-capacidades-funil'
  | 'painel' | 'painel-fila' | 'painel-indicadores' | 'painel-volume'

export const HERO_ROTAS: Record<Exclude<HeroCena, 'reinicio'>, string> = {
  disparos: '/campaigns',
  // O relatório real da campanha abre por cima da lista (a gaveta do produto).
  relatorio: '/campaigns?report=cp-retorno',
  conversa: '/conversations?id=demo-conv-0',
  funil: '/pipelines/pl-consultas',
  'agente-instrucoes': '/agents?agent=ag-recepcao&tab=prompt',
  'agente-conhecimento': '/agents?agent=ag-recepcao&tab=knowledge',
  'agente-catalogo': '/agents?agent=ag-recepcao&tab=catalog',
  'agente-capacidades': '/agents?agent=ag-recepcao&tab=capabilities',
  'agente-capacidades-funil': '/agents?agent=ag-recepcao&tab=capabilities',
  painel: '/dashboard',
  'painel-fila': '/dashboard',
  'painel-indicadores': '/dashboard',
  'painel-volume': '/dashboard',
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
  // ── 1 · Atendimento com IA: a campanha chega no celular, a Marina responde ─
  // A primeira cena É a promessa do H1 (26/09): o WhatsApp atendendo. Antes o
  // Hero abria pela lista de Disparos e o relatório — a campanha agora fecha
  // o laço como "de onde veio a conversa".
  { t: 0, state: 'inicio', composition: 'conversa' },
  S(1900, 'demanda'),
  S(4700, 'resposta'),
  // Parado: a resposta traz valor, convênio e horários — precisa ser lida.
  S(9200, 'confirma'),
  S(11200, 'situacao'),
  S(13400, 'etiqueta'),

  // ── 2 · Funil: o atendimento anda junto com a conversa ────────────────────
  C(16400, 'funil'),
  // A tela abre inteira e o card recebe o contorno antes de mudar de coluna.
  S(19600, 'avanco'),

  // ── 3 · A equipe no controle: a Marina quer um encaixe; a Ana confirma ────
  C(23400, 'conversa'),
  S(24600, 'pedido'),
  S(27000, 'assumido'),
  S(29600, 'humano'),
  // O desfecho é o clímax: mais tempo em cena para ser lido.
  S(32600, 'ganho'),

  // ── 4 · De onde veio a conversa: o relatório da campanha de retorno ───────
  C(38800, 'relatorio'),

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
    id: 'atendimento',
    titulo: 'Atendimento com IA',
    valor: 'O agente responde com as informações configuradas e mantém a situação e as etiquetas atualizadas.',
    cue: 0,
  },
  {
    id: 'funil',
    titulo: 'Funil em dia',
    valor: 'A IA move o negócio para a próxima etapa, e a equipe acompanha tudo no quadro.',
    cue: idx((c) => c.composition === 'funil'),
  },
  {
    id: 'equipe',
    titulo: 'A equipe no controle',
    valor: 'Quando a paciente pede ajuda, a IA chama a recepção. A decisão final fica com a equipe.',
    cue: idx((c) => c.state === 'pedido') - 1,
  },
  {
    id: 'disparos',
    titulo: 'De onde veio a conversa',
    valor: 'As respostas às campanhas entram direto no atendimento.',
    cue: idx((c) => c.composition === 'relatorio'),
  },
]

/** Em que capítulo a história está. */
export function capituloDe(estado: HeroState, cena: HeroCena, index: number): HeroCapituloId {
  if (cena === 'disparos' || cena === 'relatorio' || cena === 'reinicio') return 'disparos'
  if (cena === 'funil') return 'funil'
  return index >= HERO_CAPITULOS[2].cue ? 'equipe' : 'atendimento'
}

/**
 * A NARRAÇÃO do momento — uma linha curta que diz o que acabou de acontecer
 * na tela. Cada frase foi conferida contra a auditoria de capacidades: a IA
 * não define valor, não se pausa e não fecha venda.
 */
export function batidaDe(estado: HeroState, cena: HeroCena): string {
  if (cena === 'disparos') return 'A campanha de retorno sai para 1.240 pacientes'
  if (cena === 'relatorio') return 'O relatório mostra quem recebeu, leu e respondeu à campanha'
  if (cena === 'funil') {
    return estado === 'avanco'
      ? 'A IA move o negócio de Avaliação para Agendado'
      : 'O negócio da Marina aparece na etapa Avaliação'
  }
  switch (estado) {
    case 'inicio': return 'A campanha de retorno chega no WhatsApp da Marina'
    case 'demanda': return 'A Marina pede um horário com a Dra. Helena'
    case 'resposta': return 'A IA responde com valor, convênio e horários usando os dados da clínica'
    case 'confirma': return 'A Marina escolhe quinta às 14h30'
    case 'situacao': return 'A IA atualiza a situação da Marina no CRM'
    case 'etiqueta': return 'A IA adiciona a etiqueta "retorno" à conversa'
    case 'avanco': return 'O atendimento já está em Agendado'
    case 'pedido': return 'Marina pede ajuda para conseguir um encaixe'
    case 'assumido': return 'A IA avisa Ana e transfere a conversa com todo o histórico'
    case 'humano': return 'Quando Ana responde, a IA pausa enquanto ela atende'
    case 'ganho': return 'Ana confirma o encaixe e move o negócio para Confirmado'
  }
}
