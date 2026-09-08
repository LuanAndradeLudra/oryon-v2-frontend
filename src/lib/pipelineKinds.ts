import { Target, Repeat, type LucideIcon } from 'lucide-react'
import type { Pipeline, PipelineKind, TerminalLabels } from '@/types'

/**
 * Vocabulário por tipo de funil (Modelo B §4.2, F7 · SCRUM-816).
 *
 * O backend é a fonte da verdade (`pipeline.kind`, `pipeline.terminalLabels`);
 * este módulo só concentra o que a UI precisa dizer a partir do tipo — o
 * card de escolha no "Novo funil", os rótulos dos terminais quando o objeto
 * ainda não existe (formulário de criação) ou veio de um backend anterior ao
 * épico (sem `kind`), e o substantivo do card ("negócio" × "registro",
 * decisão (a) do modelo). Nunca duplica regra de negócio: sem Ganho/Perdido
 * "reais" aqui, só texto.
 */
export const DEFAULT_PIPELINE_KIND: PipelineKind = 'sales'

export interface PipelineKindOption {
  kind: PipelineKind
  label: string
  description: string
  icon: LucideIcon
  terminalLabels: TerminalLabels
  /** Substantivo do card no board e nos textos de apoio (decisão (a): "Registro" em funil de processo). */
  noun: string
  nounPlural: string
}

export const PIPELINE_KIND_OPTIONS: ReadonlyArray<PipelineKindOption> = [
  {
    kind: 'sales',
    label: 'Vendas',
    description: 'Negócios com valor. Fecha em Ganho ou Perdido. Entra nos relatórios de receita.',
    icon: Target,
    terminalLabels: { won: 'Ganho', lost: 'Perdido' },
    noun: 'negócio',
    nounPlural: 'negócios',
  },
  {
    kind: 'process',
    label: 'Processo',
    description: 'Atendimento, onboarding, pós-venda. Sem valor. Fecha em Concluído ou Cancelado.',
    icon: Repeat,
    terminalLabels: { won: 'Concluído', lost: 'Cancelado' },
    noun: 'registro',
    nounPlural: 'registros',
  },
]

export function pipelineKindOption(kind: PipelineKind | undefined | null): PipelineKindOption {
  return PIPELINE_KIND_OPTIONS.find((o) => o.kind === (kind ?? DEFAULT_PIPELINE_KIND)) ?? PIPELINE_KIND_OPTIONS[0]
}

/** `kind` efetivo de um funil — backend anterior ao épico (sem o campo) = venda. */
export function pipelineKindOf(pipeline: Pick<Pipeline, 'kind'> | null | undefined): PipelineKind {
  return pipeline?.kind ?? DEFAULT_PIPELINE_KIND
}

/** Rótulos dos terminais: os do backend quando vieram, senão os do tipo. */
export function terminalLabelsOf(pipeline: Pick<Pipeline, 'kind' | 'terminalLabels'> | null | undefined): TerminalLabels {
  return pipeline?.terminalLabels ?? pipelineKindOption(pipelineKindOf(pipeline)).terminalLabels
}

/** "negócio" × "registro" (singular/plural) para textos do board e dos empty states. */
export function pipelineNoun(pipeline: Pick<Pipeline, 'kind'> | null | undefined, plural = false): string {
  const opt = pipelineKindOption(pipelineKindOf(pipeline))
  return plural ? opt.nounPlural : opt.noun
}

/**
 * Funil de VENDA padrão do tenant — o destino do botão primário "Novo negócio"
 * (A3 · SCRUM-925), que aparece onde não cabe um menu de funis: cabeçalho do
 * chat, ficha, menu da linha da tabela e estados vazios. O diálogo de 2 passos
 * deixa trocar o funil depois, então errar para o padrão é barato; devolver
 * `null` (tenant só com funis de processo) é o sinal de esconder o botão —
 * criar negócio em funil de processo não existe.
 */
export function defaultSalesPipeline(pipelines: Pipeline[] | null | undefined): Pipeline | null {
  const actives = (pipelines ?? []).filter((p) => !p.isArchived)
  return (
    actives.find((p) => pipelineKindOf(p) === 'sales' && p.isDefault) ??
    actives.find((p) => pipelineKindOf(p) === 'sales') ??
    null
  )
}
