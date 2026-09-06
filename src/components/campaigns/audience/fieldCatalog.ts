// ─── fieldCatalog ──────────────────────────────────────────────────────────
// O que uma condição pode dizer: campo, rótulo em português, ícone, operadores
// aceitos e como o valor é escolhido. A lista de campos/operadores é a tabela
// do BE.3 (CONTRATOS.md § "Campos permitidos por condição") — nada de campo
// que o backend rejeitaria com 400.
//
// `lastCartAt` (o "Último carrinho" do mockup) NÃO está aqui de propósito:
// Decisão D4 do BE.3 tirou o campo do contrato porque não existe conceito de
// carrinho em nenhum módulo do CRM. Se e-commerce virar produto, isso é uma
// história própria.
import {
  Tag as TagIcon, BarChart2, MessageCircle, Gauge, Smile, ShieldCheck,
  Clock, Search, MessagesSquare, SlidersHorizontal,
  type LucideIcon,
} from 'lucide-react'
import type { SegmentField, SegmentOperator } from '@/types/campaignsV2'

/** Como a linha edita o valor — decide qual controle o popover mostra. */
export type ValueKind = 'multi' | 'boolean' | 'text' | 'days'

export interface OperatorSpec {
  value: SegmentOperator
  /** Rótulo lido no meio da frase: "Tag <contém qualquer> carrinho". */
  label: string
}

export interface FieldSpec {
  field: SegmentField
  label: string
  icon: LucideIcon
  operators: OperatorSpec[]
  valueKind: ValueKind
  /** De onde saem as opções de um `valueKind: 'multi'`. `tags` e `stage` vêm
   *  das Configurações da conta; o resto é enum fixo do produto. */
  options?: 'tags' | 'stages' | { value: string; label: string }[]
}

const SOURCE_OPTIONS = [
  { value: 'whatsapp',  label: 'WhatsApp' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'website',   label: 'Website' },
  { value: 'referral',  label: 'Indicação' },
  { value: 'campaign',  label: 'Campanha' },
  { value: 'manual',    label: 'Manual' },
  { value: 'import',    label: 'Importação' },
  { value: 'meta_ads',  label: 'Meta Ads' },
  { value: 'other',     label: 'Outra' },
]

const INTENT_OPTIONS = [
  { value: 'high',    label: 'Alta' },
  { value: 'medium',  label: 'Média' },
  { value: 'low',     label: 'Baixa' },
  { value: 'unknown', label: 'Indefinida' },
]

const SENTIMENT_OPTIONS = [
  { value: 'positive', label: 'Positivo' },
  { value: 'neutral',  label: 'Neutro' },
  { value: 'negative', label: 'Negativo' },
  { value: 'unknown',  label: 'Desconhecido' },
]

export const FIELD_CATALOG: FieldSpec[] = [
  {
    field: 'tags',
    label: 'Etiqueta',
    icon: TagIcon,
    valueKind: 'multi',
    options: 'tags',
    operators: [
      { value: 'includes_any', label: 'contém qualquer' },
      { value: 'includes_all', label: 'contém todas' },
      { value: 'excludes',     label: 'não contém' },
    ],
  },
  {
    // "Situação" é o nome fixado no glossário para o ciclo de vida do contato
    // (Carta de Padrões §3) — a coluna no banco continua sendo `stage`.
    field: 'stage',
    label: 'Situação do contato',
    icon: BarChart2,
    valueKind: 'multi',
    options: 'stages',
    operators: [
      { value: 'in',     label: 'é' },
      { value: 'not_in', label: 'não é' },
    ],
  },
  {
    field: 'source',
    label: 'Origem',
    icon: MessageCircle,
    valueKind: 'multi',
    options: SOURCE_OPTIONS,
    operators: [{ value: 'in', label: 'é' }],
  },
  {
    field: 'intent',
    label: 'Intenção',
    icon: Gauge,
    valueKind: 'multi',
    options: INTENT_OPTIONS,
    operators: [{ value: 'in', label: 'é' }],
  },
  {
    field: 'sentiment',
    label: 'Sentimento da IA',
    icon: Smile,
    valueKind: 'multi',
    options: SENTIMENT_OPTIONS,
    operators: [{ value: 'in', label: 'é' }],
  },
  {
    field: 'optIn',
    label: 'Opt-in de marketing',
    icon: ShieldCheck,
    valueKind: 'boolean',
    operators: [{ value: 'eq', label: 'é' }],
  },
  {
    field: 'lastActivityAt',
    label: 'Última atividade',
    icon: Clock,
    valueKind: 'days',
    operators: [
      { value: 'within_days', label: 'nos últimos' },
      { value: 'before',      label: 'há mais de' },
      { value: 'after',       label: 'há menos de' },
    ],
  },
  {
    field: 'search',
    label: 'Nome ou telefone',
    icon: Search,
    valueKind: 'text',
    operators: [{ value: 'contains', label: 'contém' }],
  },
  {
    field: 'hasConversations',
    label: 'Já conversou',
    icon: MessagesSquare,
    valueKind: 'boolean',
    operators: [{ value: 'eq', label: 'é' }],
  },
]

const FALLBACK_SPEC: FieldSpec = {
  field: 'search',
  label: 'Campo personalizado',
  icon: SlidersHorizontal,
  valueKind: 'text',
  operators: [{ value: 'eq', label: 'é' }],
}

/** Campos `custom:<key>` são abertos por contrato (qualquer chave de
 *  `customFields`), então não cabem numa lista fixa — caem no genérico. */
export function fieldSpec(field: SegmentField): FieldSpec {
  return FIELD_CATALOG.find((f) => f.field === field) ?? FALLBACK_SPEC
}

export function operatorLabel(field: SegmentField, operator: SegmentOperator): string {
  return fieldSpec(field).operators.find((o) => o.value === operator)?.label ?? operator
}
