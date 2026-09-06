// ─── Arquétipos de agente (A5 / SCRUM-1016) ──────────────────────────────────
// Os 3 arquétipos do mockup `p2b-agentes.html#a5`, modelados como DADO PURO:
// nenhum JSX, nenhuma chamada de rede, nenhum hook. É o que permite testá-los
// sem montar componente e, principalmente, é o que permite trocar o conteúdo
// (se o PO trouxer uma lista curada) sem tocar em componente nenhum.
//
// O vocabulário de `can_do`/`cannot_do` sai dos presets que o produto já usa
// (`studio/steps/constants.tsx`) em vez de inventar frases novas — decisão 3 do
// `coord/A5-plano.md`.
import {
  ShoppingBag, Headset, HeartHandshake,
  Zap, GitBranch, BookOpen, Tag, CalendarCheck,
  type LucideIcon,
} from 'lucide-react'
import type { Accent } from '@/components/ui/accentColor'
import type { CrmCapabilityId, HandoffAction, HandoffRule } from '@/services/agentsApi'
import { CAN_DO_PRESETS, CANNOT_DO_PRESETS } from '@/components/agents/studio/steps/constants'

export type ArchetypeId = 'vendas' | 'suporte' | 'posvenda'

/** Uma bolha da conversa de exemplo. `cliente` = quem escreve pro agente. */
export interface ArchetypeBubble {
  autor: 'cliente' | 'agente'
  texto: string
}

/**
 * Regra de "passar para humano" do arquétipo. É um rascunho, não um
 * `HandoffRule` inteiro: `priority`, `enabled`, `aiGenerated` e os timestamps
 * são DERIVADOS em `applyArchetype` — dado puro não carimba data nem inventa
 * número de ordem que alguém teria de manter à mão.
 */
export interface ArchetypeHandoffRule {
  id: string
  name: string
  description: string
  keywords: string[]
  action: HandoffAction
  matchMode: HandoffRule['matchMode']
}

/**
 * Chip do rodapé do card. Há duas espécies, e a diferença é deliberada:
 *
 * - `contagem` **não guarda o número**: ele é lido do próprio dado do arquétipo
 *   na hora de renderizar (`chipLabel`). É o que torna estruturalmente
 *   impossível o chip "3 capacidades" aparecer num arquétipo com 2 — o critério
 *   firmado pelo Maestro ("número que mente é pior que número ausente") deixa
 *   de depender de alguém lembrar de atualizar os dois lados.
 * - `rotulo` é texto fixo, para o que não é contável ("base obrigatória"). Cada
 *   um traz `lastro`: o campo do arquétipo que sustenta a afirmação, para o
 *   teste conseguir cobrar que o rótulo também não minta.
 */
export type ArchetypeChip =
  | { tipo: 'contagem'; de: 'crm_capabilities' | 'handoff_rules'; substantivo: [string, string]; icone: LucideIcon }
  | { tipo: 'rotulo'; texto: string; lastro: string; icone: LucideIcon }

export interface Archetype {
  id: ArchetypeId
  nome: string
  descricao: string
  /** Cor categórica — nome de acento, nunca hex (Carta de Padrões §7). */
  acento: Accent
  icone: LucideIcon
  /** Selo do canto do card. Só o "Mais usado" de Vendas tem, no v1. */
  destaque?: string
  /** `primary` só no arquétipo recomendado; os outros são `secondary`. */
  enfase: 'primary' | 'secondary'
  exemplo: [ArchetypeBubble, ArchetypeBubble]
  chips: [ArchetypeChip, ArchetypeChip]

  // ─── O que vira rascunho do Studio (ver applyArchetype.ts) ───
  sector: string
  tone: string
  response_style: string[]
  can_do: string[]
  cannot_do: string[]
  handoff_rules: ArchetypeHandoffRule[]
  crm_capabilities: CrmCapabilityId[]
}

/**
 * Referência a um preset **por conteúdo**, não por posição.
 *
 * Isto aqui era `CAN_DO_PRESETS[0]`, com um comentário meu afirmando que o
 * typecheck acusaria uma reordenação de `constants.tsx`. **Não acusava**: a
 * lista é `string[]`, então todo índice tem o mesmo tipo, e o Prumo provou por
 * mutação — trocar `[0]` com `[1]` dava `tsc` limpo e 53/53 verdes, com todo
 * arquétipo carregando a frase trocada em silêncio. O teste que existia só
 * checava pertinência (`toContain`), nunca *qual* frase.
 *
 * Agora a frase é a chave e o índice não existe. Reordenar `constants.tsx`
 * passa a ser inofensivo (é o certo — ordem não devia importar) e **remover ou
 * reescrever** uma frase estoura no import, alto e na hora, em vez de sair
 * calado num arquétipo. É o mesmo princípio do chip que não pode mentir,
 * aplicado à origem do dado.
 */
export function preset(lista: readonly string[], frase: string): string {
  if (!lista.includes(frase)) {
    throw new Error(
      `[archetypes] preset sumiu de studio/steps/constants.tsx: "${frase}". `
      + 'Se a frase mudou de propósito, atualize a referência aqui junto.',
    )
  }
  return frase
}

const CAN = {
  produtos:    preset(CAN_DO_PRESETS, 'Responder perguntas sobre produtos/serviços'),
  qualificar:  preset(CAN_DO_PRESETS, 'Qualificar leads e coletar informações'),
  pedidos:     preset(CAN_DO_PRESETS, 'Verificar status de pedidos'),
  materiais:   preset(CAN_DO_PRESETS, 'Enviar links, catálogos e materiais'),
  contato:     preset(CAN_DO_PRESETS, 'Coletar dados de contato'),
  faq:         preset(CAN_DO_PRESETS, 'Responder perguntas frequentes (FAQ)'),
  followUp:    preset(CAN_DO_PRESETS, 'Fazer follow-up de conversas'),
  reclamacoes: preset(CAN_DO_PRESETS, 'Registrar reclamações e sugestões'),
  promocoes:   preset(CAN_DO_PRESETS, 'Apresentar promoções e ofertas'),
  entregas:    preset(CAN_DO_PRESETS, 'Auxiliar no rastreamento de entregas'),
} as const

const NAO = {
  pagamentos:   preset(CANNOT_DO_PRESETS, 'Processar pagamentos diretamente'),
  bancarios:    preset(CANNOT_DO_PRESETS, 'Acessar dados bancários ou senhas'),
  garantir:     preset(CANNOT_DO_PRESETS, 'Garantir resultados específicos'),
  confidencial: preset(CANNOT_DO_PRESETS, 'Compartilhar informações confidenciais'),
  promessas:    preset(CANNOT_DO_PRESETS, 'Fazer promessas não autorizadas pela empresa'),
  emergencias:  preset(CANNOT_DO_PRESETS, 'Substituir atendimento humano em emergências'),
} as const

const CHIP_CAPACIDADES: ArchetypeChip = {
  tipo: 'contagem', de: 'crm_capabilities',
  substantivo: ['capacidade', 'capacidades'], icone: Zap,
}
const CHIP_REGRAS: ArchetypeChip = {
  tipo: 'contagem', de: 'handoff_rules',
  substantivo: ['regra', 'regras'], icone: GitBranch,
}

export const ARCHETYPES: Archetype[] = [
  {
    id: 'vendas',
    nome: 'Vendas',
    descricao: 'Qualifica, recomenda produtos do catálogo e conduz ao checkout. Passa para humano em reembolso e reclamação.',
    acento: 'blue',
    icone: ShoppingBag,
    destaque: 'Mais usado',
    enfase: 'primary',
    exemplo: [
      { autor: 'cliente', texto: 'Tem o vestido midi em M?' },
      { autor: 'agente',  texto: 'Tem sim! Veste solto — quer que eu separe? Posso aplicar seu cupom de boas-vindas 💚' },
    ],
    chips: [CHIP_CAPACIDADES, CHIP_REGRAS],

    sector: 'ecommerce',
    tone: 'casual',
    response_style: ['Respostas concisas', 'Usa emojis', 'Faz perguntas de acompanhamento'],
    can_do: [CAN.produtos, CAN.qualificar, CAN.materiais, CAN.promocoes],
    cannot_do: [NAO.pagamentos, NAO.promessas, NAO.garantir],
    // As duas regras que a descrição promete, nesta ordem.
    handoff_rules: [
      {
        id: 'reembolso',
        name: 'Pedido de reembolso',
        description: 'Devolução e estorno são decisão de gente — a IA entrega o caso pronto e sai.',
        keywords: ['reembolso', 'estorno', 'devolver', 'devolução', 'cancelar compra'],
        action: 'human_handoff', matchMode: 'any_keyword',
      },
      {
        id: 'reclamacao',
        name: 'Reclamação',
        description: 'Cliente insatisfeito vai direto para um atendente, sem passar por script.',
        keywords: ['reclamação', 'reclamar', 'péssimo', 'processo', 'procon'],
        action: 'human_handoff', matchMode: 'any_keyword',
      },
    ],
    crm_capabilities: ['tag_contact', 'manage_contact_pipeline', 'manage_conversation_tags'],
  },
  {
    id: 'suporte',
    nome: 'Suporte',
    descricao: 'Responde com base nos seus documentos, abre chamado quando não sabe e escala urgências para a equipe.',
    acento: 'violet',
    icone: Headset,
    enfase: 'secondary',
    exemplo: [
      { autor: 'cliente', texto: 'A integração parou de sincronizar' },
      { autor: 'agente',  texto: 'Vamos resolver. Isso costuma ser o token expirado — te mando o passo a passo. Se não resolver em 5 min, abro um chamado.' },
    ],
    chips: [
      // Rótulo, não trava: o v1 não bloqueia publicar sem documento (decisão 4
      // do plano). O lastro é a capacidade de responder pela base — é o que a
      // frase afirma.
      { tipo: 'rotulo', texto: 'base obrigatória', lastro: CAN.faq, icone: BookOpen },
      CHIP_REGRAS,
    ],

    sector: 'tecnologia',
    tone: 'tecnico',
    response_style: ['Usa exemplos práticos', 'Usa listas e estrutura', 'Linguagem simples e acessível'],
    can_do: [CAN.faq, CAN.produtos, CAN.reclamacoes, CAN.pedidos],
    cannot_do: [NAO.bancarios, NAO.confidencial, NAO.emergencias],
    // As três regras que sustentam "abre chamado quando não sabe e escala urgências".
    handoff_rules: [
      {
        id: 'urgencia',
        name: 'Urgência',
        description: 'Sistema fora do ar ou perda de dados não espera fila.',
        keywords: ['urgente', 'fora do ar', 'parou tudo', 'perdi os dados', 'emergência'],
        action: 'human_handoff', matchMode: 'any_keyword',
      },
      {
        id: 'fora-da-base',
        name: 'Fora da base de conhecimento',
        description: 'Quando a resposta não está nos documentos, abre chamado em vez de improvisar.',
        keywords: ['não sei', 'não encontrei', 'não consta', 'abrir chamado'],
        action: 'human_handoff', matchMode: 'any_keyword',
      },
      {
        id: 'falar-com-humano',
        name: 'Pedido explícito de atendente',
        description: 'Quem pede uma pessoa recebe uma pessoa, sem insistir.',
        keywords: ['falar com humano', 'atendente', 'pessoa de verdade', 'suporte humano'],
        action: 'human_handoff', matchMode: 'any_keyword',
      },
    ],
    crm_capabilities: ['manage_conversation_status', 'assign_conversation_to_user', 'manage_conversation_tags'],
  },
  {
    id: 'posvenda',
    nome: 'Pós-venda',
    descricao: 'Acompanha entrega, coleta satisfação (NPS) e reativa clientes. Aplica tags e cria follow-ups sozinho.',
    acento: 'green',
    icone: HeartHandshake,
    enfase: 'secondary',
    exemplo: [
      { autor: 'cliente', texto: 'Chegou antes do prazo, obrigada!' },
      { autor: 'agente',  texto: 'Que ótimo, Carla! De 0 a 10, quanto você recomendaria a gente? Sua resposta ajuda muito 🙏' },
    ],
    chips: [
      // Os dois lastros são verificáveis: a etiquetagem é uma capacidade ligada,
      // o follow-up é um item de `can_do`.
      { tipo: 'rotulo', texto: 'tags automáticas', lastro: 'tag_contact',  icone: Tag },
      { tipo: 'rotulo', texto: 'follow-up',        lastro: CAN.followUp,   icone: CalendarCheck },
    ],

    sector: 'ecommerce',
    tone: 'empatico',
    response_style: ['Faz perguntas de acompanhamento', 'Usa emojis', 'Respostas concisas'],
    can_do: [CAN.entregas, CAN.followUp, CAN.contato, CAN.reclamacoes],
    cannot_do: [NAO.garantir, NAO.promessas],
    handoff_rules: [
      {
        id: 'insatisfacao',
        name: 'Cliente insatisfeito',
        description: 'Nota baixa de NPS ou queixa aberta viram conversa com gente, não outro formulário.',
        keywords: ['insatisfeito', 'decepcionado', 'nunca mais', 'quero cancelar'],
        action: 'human_handoff', matchMode: 'any_keyword',
      },
    ],
    crm_capabilities: ['tag_contact', 'manage_contact_pipeline'],
  },
]

/**
 * Texto do chip. Para `contagem`, o número sai do dado do próprio arquétipo —
 * é aqui que mora a garantia de que o chip não mente.
 */
export function chipLabel(chip: ArchetypeChip, arquetipo: Archetype): string {
  if (chip.tipo === 'rotulo') return chip.texto
  const n = arquetipo[chip.de].length
  const [singular, plural] = chip.substantivo
  return `${n} ${n === 1 ? singular : plural}`
}
