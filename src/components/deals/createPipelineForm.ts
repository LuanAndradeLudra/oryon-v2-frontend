import type { CreatePipelineStageInput, PipelineKind, PipelineTemplate } from '@/types'
import { pipelineKindOption } from '@/lib/pipelineKinds'

/**
 * Lógica pura do formulário "Novo funil" (F7 · SCRUM-865/866). Sem React,
 * sem API — só o estado da lista de etapas e a regra de quando o funil pode
 * ser criado, para o modal ficar declarativo e isto ser testável de forma
 * direta.
 *
 * Invariante I2 (validado também no backend, `assertValidStageSet`): o funil
 * nasce com ≥1 etapa normal, exatamente 1 Ganho e 1 Perdido. Aqui os dois
 * terminais são FIXOS (existem sempre, não se removem) e RENOMEÁVEIS — o
 * usuário nunca precisa saber "qual etapa é Ganho"; o que ele edita é o
 * rótulo ("Concluído", "Fechou", "Matriculado"…).
 */

export type DraftStageRole = 'normal' | 'won' | 'lost'

export interface DraftStage {
  /** Id local (só para React keys e edição); nunca vai para o backend. */
  id: string
  label: string
  color: string
  role: DraftStageRole
}

let seq = 0
export function nextDraftId(): string {
  seq += 1
  return `draft-${seq}`
}

/** Cores das etapas normais adicionadas à mão, em rodízio. */
export const NEW_STAGE_COLORS: ReadonlyArray<string> = ['#6366f1', '#f59e0b', '#3b82f6', '#a855f7', '#ec4899', '#14b8a6']

/** Converte as etapas de um modelo (`GET /settings/pipelines/templates`) em rascunho editável. */
export function stagesFromTemplate(template: Pick<PipelineTemplate, 'stages'>): DraftStage[] {
  return template.stages.map((s) => ({
    id: nextDraftId(),
    label: s.label,
    color: s.color,
    role: s.isWon ? 'won' : s.isLost ? 'lost' : 'normal',
  }))
}

/** Rascunho mínimo quando não há modelo (backend sem `/templates`): 1 normal + os 2 terminais do tipo. */
export function fallbackStages(kind: PipelineKind): DraftStage[] {
  const labels = pipelineKindOption(kind).terminalLabels
  return [
    { id: nextDraftId(), label: 'Novo', color: NEW_STAGE_COLORS[0], role: 'normal' },
    { id: nextDraftId(), label: labels.won, color: '#10b981', role: 'won' },
    { id: nextDraftId(), label: labels.lost, color: '#ef4444', role: 'lost' },
  ]
}

/** Modelo a pré-selecionar para um tipo: o `isDefault` do tipo, senão o primeiro. */
export function defaultTemplateFor(templates: ReadonlyArray<PipelineTemplate>, kind: PipelineKind): PipelineTemplate | null {
  const ofKind = templates.filter((t) => t.kind === kind)
  return ofKind.find((t) => t.isDefault) ?? ofKind[0] ?? null
}

export function normalStages(stages: ReadonlyArray<DraftStage>): DraftStage[] {
  return stages.filter((s) => s.role === 'normal')
}

/** Ordem canônica de exibição/envio: normais (na ordem do usuário) → Ganho → Perdido. */
export function orderedStages(stages: ReadonlyArray<DraftStage>): DraftStage[] {
  const won = stages.filter((s) => s.role === 'won')
  const lost = stages.filter((s) => s.role === 'lost')
  return [...normalStages(stages), ...won, ...lost]
}

export function addNormalStage(stages: ReadonlyArray<DraftStage>, label = ''): DraftStage[] {
  const normals = normalStages(stages)
  const color = NEW_STAGE_COLORS[normals.length % NEW_STAGE_COLORS.length]
  return orderedStages([...stages, { id: nextDraftId(), label, color, role: 'normal' }])
}

/** Remove uma etapa NORMAL. Terminais nunca saem (I2) — chamada com terminal é no-op. */
export function removeStage(stages: ReadonlyArray<DraftStage>, id: string): DraftStage[] {
  const target = stages.find((s) => s.id === id)
  if (!target || target.role !== 'normal') return [...stages]
  return stages.filter((s) => s.id !== id)
}

export function renameStage(stages: ReadonlyArray<DraftStage>, id: string, label: string): DraftStage[] {
  return stages.map((s) => (s.id === id ? { ...s, label } : s))
}

export function recolorStage(stages: ReadonlyArray<DraftStage>, id: string, color: string): DraftStage[] {
  return stages.map((s) => (s.id === id ? { ...s, color } : s))
}

/** Reordena só as etapas normais (os terminais ficam sempre no fim). */
export function reorderNormalStages(stages: ReadonlyArray<DraftStage>, reorderedNormals: ReadonlyArray<DraftStage>): DraftStage[] {
  const terminals = stages.filter((s) => s.role !== 'normal')
  return orderedStages([...reorderedNormals, ...terminals])
}

export type CreateBlocker = 'name' | 'no_normal_stage' | 'empty_label'

/**
 * Por que o botão "Criar funil" está desabilitado — `null` = pode criar.
 * Ordem: nome → pelo menos 1 etapa normal → nenhuma etapa sem rótulo.
 */
export function createBlocker(name: string, stages: ReadonlyArray<DraftStage>): CreateBlocker | null {
  if (!name.trim()) return 'name'
  if (normalStages(stages).length === 0) return 'no_normal_stage'
  if (stages.some((s) => !s.label.trim())) return 'empty_label'
  return null
}

export const CREATE_BLOCKER_HINT: Record<CreateBlocker, string> = {
  name: 'Dê um nome ao funil.',
  no_normal_stage: 'O funil precisa de pelo menos uma etapa normal (além dos dois terminais).',
  empty_label: 'Toda etapa precisa de um nome.',
}

/** Payload de `POST /settings/pipelines` (F1-825): `kind` + `stages[]` na ordem canônica; a `key` é derivada do rótulo pelo backend. */
export function toCreatePipelineDto(name: string, kind: PipelineKind, color: string, stages: ReadonlyArray<DraftStage>): {
  name: string
  color: string
  kind: PipelineKind
  stages: CreatePipelineStageInput[]
} {
  return {
    name: name.trim(),
    color,
    kind,
    stages: orderedStages(stages).map((s) => ({
      label: s.label.trim(),
      color: s.color,
      ...(s.role === 'won' ? { isWon: true } : {}),
      ...(s.role === 'lost' ? { isLost: true } : {}),
    })),
  }
}
