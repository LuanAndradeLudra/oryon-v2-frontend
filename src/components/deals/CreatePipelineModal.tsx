import { useState, useEffect, useMemo } from 'react'
import { Plus, X, GripVertical, Lock, Check, Trophy, Loader2 } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { FormField } from '@/components/ui/FormField'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { ColorPicker } from '@/components/ui/ColorPicker'
import { Button } from '@/components/ui/Button'
import { Tooltip } from '@/components/ui/Tooltip'
import { DEFAULT_ENTITY_COLOR } from '@/lib/colorPalette'
import { getApiErrorMessage, cn } from '@/lib/utils'
import { PIPELINE_KIND_OPTIONS, pipelineKindOption, pipelineKindOf, DEFAULT_PIPELINE_KIND } from '@/lib/pipelineKinds'
import { useDragReorder } from '@/hooks/useDragReorder'
import { pipelinesApi } from '@/services/api'
import type { CreatePipelineStageInput, Pipeline, PipelineKind, PipelineTemplate } from '@/types'
import {
  type DraftStage,
  stagesFromTemplate,
  fallbackStages,
  defaultTemplateFor,
  normalStages,
  orderedStages,
  addNormalStage,
  removeStage,
  renameStage,
  recolorStage,
  reorderNormalStages,
  NEW_STAGE_COLORS,
  createBlocker,
  CREATE_BLOCKER_HINT,
  toCreatePipelineDto,
} from './createPipelineForm'

/** Próxima cor do rodízio — clique no ponto de cor troca a cor da etapa sem abrir um picker dentro da linha. */
function nextStageColor(current: string): string {
  const idx = NEW_STAGE_COLORS.findIndex((c) => c.toLowerCase() === current.toLowerCase())
  return NEW_STAGE_COLORS[(idx + 1) % NEW_STAGE_COLORS.length]
}

/** Dados que o modal entrega ao chamador. Na criação (F7) vai `kind` + `stages[]`; na edição só nome/cor. */
export interface CreatePipelineData {
  name: string
  color: string
  kind?: PipelineKind
  stages?: CreatePipelineStageInput[]
}

interface CreatePipelineModalProps {
  open: boolean
  onClose: () => void
  onSave: (data: CreatePipelineData) => Promise<void>
  /** Presente = edita este pipeline (renomear/cor) em vez de criar um novo. O tipo é imutável. */
  editPipeline?: Pipeline | null
}

/**
 * "Novo funil" — prancheta 1 do canvas (F7 · SCRUM-865/866, Modelo B §4.2).
 *
 * Nome · Tipo (dois cards: Vendas / Processo) · Etapas (modelo por tipo +
 * lista editável). O tipo decide o vocabulário e os terminais: os dois
 * terminais existem SEMPRE (fixos, renomeáveis — invariante I2) e o funil só
 * é criado com pelo menos uma etapa normal. Chama `POST /settings/pipelines`
 * com `kind` + `stages[]` (F1) — o funil nasce utilizável e o chamador abre o
 * board direto (SCRUM-867), sem o redirect antigo para o editor de estágios.
 *
 * Edição (`editPipeline`): só nome/cor — o tipo é imutável após a criação
 * (mudar o tipo de um funil com registros trocaria o vocabulário do histórico).
 */
export function CreatePipelineModal({ open, onClose, onSave, editPipeline }: CreatePipelineModalProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState(DEFAULT_ENTITY_COLOR)
  const [kind, setKind] = useState<PipelineKind>(DEFAULT_PIPELINE_KIND)
  const [templates, setTemplates] = useState<PipelineTemplate[] | null>(null)
  const [templatesFailed, setTemplatesFailed] = useState(false)
  const [templateKey, setTemplateKey] = useState<string>('')
  const [stages, setStages] = useState<DraftStage[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEdit = !!editPipeline

  // Reset a cada abertura. Na criação, busca os modelos (uma chamada, todos os
  // tipos) e pré-carrega o modelo padrão de Vendas; se a rota não existir
  // (backend anterior ao épico), cai no rascunho mínimo do tipo.
  useEffect(() => {
    if (!open) return
    setName(editPipeline?.name ?? '')
    setColor(editPipeline?.color ?? DEFAULT_ENTITY_COLOR)
    setKind(pipelineKindOf(editPipeline))
    setError('')
    setSaving(false)
    if (editPipeline) return

    let cancelled = false
    setTemplates(null)
    setTemplatesFailed(false)
    setTemplateKey('')
    setStages([])
    pipelinesApi
      .templates()
      .then((res) => {
        if (cancelled) return
        const list = Array.isArray(res.data) ? res.data : []
        setTemplates(list)
        const def = defaultTemplateFor(list, DEFAULT_PIPELINE_KIND)
        setTemplateKey(def?.key ?? '')
        setStages(def ? stagesFromTemplate(def) : fallbackStages(DEFAULT_PIPELINE_KIND))
      })
      .catch(() => {
        if (cancelled) return
        setTemplates([])
        setTemplatesFailed(true)
        setTemplateKey('')
        setStages(fallbackStages(DEFAULT_PIPELINE_KIND))
      })
    return () => { cancelled = true }
  }, [open, editPipeline])

  const templatesOfKind = useMemo(() => (templates ?? []).filter((t) => t.kind === kind), [templates, kind])
  const kindOption = pipelineKindOption(kind)

  const applyTemplate = (key: string, nextKind: PipelineKind) => {
    const tpl = (templates ?? []).find((t) => t.key === key && t.kind === nextKind) ?? null
    setTemplateKey(tpl?.key ?? '')
    setStages(tpl ? stagesFromTemplate(tpl) : fallbackStages(nextKind))
  }

  // Trocar o tipo troca o vocabulário inteiro: modelo padrão do novo tipo e
  // terminais do novo tipo. Edições feitas nas etapas do tipo anterior não
  // sobrevivem — é o comportamento esperado ("tipo antes de tudo").
  const handleKindChange = (nextKind: PipelineKind) => {
    if (nextKind === kind || isEdit) return
    setKind(nextKind)
    const def = defaultTemplateFor(templates ?? [], nextKind)
    applyTemplate(def?.key ?? '', nextKind)
  }

  const normals = normalStages(stages)
  const { overIdx, handleDragStart, handleDragOver, handleDrop, handleDragEnd } = useDragReorder(
    normals,
    (reordered) => setStages((prev) => reorderNormalStages(prev, reordered)),
  )

  const blocker = isEdit ? (name.trim() ? null : 'name') : createBlocker(name, stages)
  const loadingTemplates = !isEdit && templates === null

  const handleSave = async () => {
    if (blocker) { setError(CREATE_BLOCKER_HINT[blocker]); return }
    setSaving(true)
    setError('')
    try {
      if (isEdit) {
        await onSave({ name: name.trim(), color })
      } else {
        await onSave(toCreatePipelineDto(name, kind, color, stages))
      }
      onClose()
    } catch (e: unknown) {
      setError(getApiErrorMessage(e, isEdit ? 'Erro ao salvar funil.' : 'Erro ao criar funil.'))
    } finally {
      setSaving(false)
    }
  }

  const footer = (
    <div className="flex items-center justify-between gap-3 w-full">
      <p className="text-xs text-surface-500 min-h-[1rem]" data-testid="create-pipeline-hint">
        {!isEdit && blocker && name.trim() ? CREATE_BLOCKER_HINT[blocker] : ''}
      </p>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={onClose}>Cancelar</Button>
        <Button
          type="button"
          variant="primary"
          onClick={handleSave}
          loading={saving}
          disabled={saving || loadingTemplates || !!blocker}
          data-testid="create-pipeline-submit"
        >
          {isEdit ? 'Salvar alterações' : 'Criar funil'}
        </Button>
      </div>
    </div>
  )

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEdit ? 'Editar funil' : 'Novo funil'}
      className={isEdit ? 'max-w-md' : 'max-w-2xl'}
      footer={footer}
    >
      <div className="flex flex-col gap-5">
        <FormField label="Nome do funil" error={error} required>
          <Input
            value={name}
            onChange={(e) => { setName(e.target.value); setError('') }}
            placeholder="Ex: Suporte, Renovação, Pós-venda"
            autoFocus
          />
        </FormField>

        {/* Cor só é editável depois, via "Editar funil" — na criação o funil
            nasce com a cor padrão para manter o formulário enxuto. */}
        {isEdit && (
          <FormField label="Cor" hint="Identifica o funil no segmentado e nas listagens.">
            <ColorPicker value={color} onChange={setColor} />
          </FormField>
        )}

        {/* Tipo — decide vocabulário, campos e terminais. Na edição vira só leitura. */}
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-surface-400">Tipo</span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5" role="radiogroup" aria-label="Tipo do funil">
            {PIPELINE_KIND_OPTIONS.map((opt) => {
              const active = opt.kind === kind
              const Icon = opt.icon
              return (
                <button
                  key={opt.kind}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  disabled={isEdit && !active}
                  onClick={() => handleKindChange(opt.kind)}
                  data-testid={`pipeline-kind-${opt.kind}`}
                  className={cn(
                    'relative text-left p-3 rounded-2xl border transition-all',
                    active
                      ? 'border-brand-500 bg-brand-500/10 text-surface-50'
                      : 'border-surface-700 bg-surface-800 text-surface-200 hover:border-surface-600',
                    isEdit && !active && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  {active && <Check className="absolute top-2.5 right-2.5 w-4 h-4 text-brand-500" />}
                  <div className="flex items-center gap-2 font-semibold text-sm">
                    <Icon className="w-4 h-4" /> {opt.label}
                  </div>
                  <p className={cn('text-xs mt-1.5 leading-relaxed', active ? 'text-surface-300' : 'text-surface-400')}>
                    {opt.description}
                  </p>
                </button>
              )
            })}
          </div>
          {isEdit && (
            <p className="text-[11px] text-surface-500">O tipo não muda depois de criado — ele define o vocabulário do histórico.</p>
          )}
        </div>

        {/* Etapas — modelo por tipo + lista editável (terminais fixos e renomeáveis) */}
        {!isEdit && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-xs font-semibold text-surface-400">Etapas</span>
              {templatesOfKind.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-surface-500">Modelo:</span>
                  <Select
                    aria-label="Modelo de etapas"
                    value={templateKey}
                    onChange={(e) => applyTemplate(e.target.value, kind)}
                    className="py-1 text-xs w-48"
                  >
                    {templatesOfKind.map((t) => (
                      <option key={t.key} value={t.key}>{t.name}</option>
                    ))}
                  </Select>
                </div>
              )}
            </div>

            {loadingTemplates ? (
              <div className="flex items-center gap-2 text-xs text-surface-500 py-6 justify-center">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando modelos…
              </div>
            ) : (
              <ul className="flex flex-col gap-1.5" aria-label="Etapas do funil">
                {orderedStages(stages).map((stage) => {
                  const normalIdx = stage.role === 'normal' ? normals.findIndex((s) => s.id === stage.id) : -1
                  const isTerminal = stage.role !== 'normal'
                  return (
                    <li
                      key={stage.id}
                      draggable={!isTerminal}
                      onDragStart={!isTerminal ? () => handleDragStart(normalIdx) : undefined}
                      onDragOver={!isTerminal ? (e) => handleDragOver(e, normalIdx) : undefined}
                      onDrop={!isTerminal ? () => handleDrop(normalIdx) : undefined}
                      onDragEnd={!isTerminal ? handleDragEnd : undefined}
                      data-testid={`stage-row-${stage.role}`}
                      className={cn(
                        'flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl border bg-surface-800 border-surface-700 transition-colors',
                        !isTerminal && overIdx === normalIdx && 'border-brand-500 bg-brand-500/10',
                      )}
                    >
                      <GripVertical className={cn('w-4 h-4 flex-shrink-0', isTerminal ? 'text-surface-800' : 'text-surface-600 cursor-grab')} />
                      <button
                        type="button"
                        onClick={() => setStages((prev) => recolorStage(prev, stage.id, nextStageColor(stage.color)))}
                        aria-label="Trocar cor da etapa"
                        title="Trocar cor"
                        className="w-3.5 h-3.5 rounded-full flex-shrink-0 border-2 transition-transform hover:scale-110"
                        style={{ backgroundColor: stage.color, borderColor: stage.color }}
                      />
                      <input
                        value={stage.label}
                        onChange={(e) => setStages((prev) => renameStage(prev, stage.id, e.target.value))}
                        placeholder={isTerminal ? kindOption.terminalLabels[stage.role === 'won' ? 'won' : 'lost'] : 'Nome da etapa'}
                        aria-label={isTerminal ? `Etapa terminal (${stage.role === 'won' ? kindOption.terminalLabels.won : kindOption.terminalLabels.lost})` : 'Nome da etapa'}
                        className="flex-1 min-w-0 bg-transparent text-sm text-surface-100 placeholder:text-surface-600 focus:outline-none"
                      />
                      {stage.role === 'won' && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full color-chip border" style={{ ['--chip']: 'var(--color-success)' } as React.CSSProperties}>
                          <Trophy className="w-2.5 h-2.5" /> {kindOption.terminalLabels.won}
                        </span>
                      )}
                      {stage.role === 'lost' && (
                        <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full color-chip border" style={{ ['--chip']: 'var(--color-danger)' } as React.CSSProperties}>
                          <X className="w-2.5 h-2.5" /> {kindOption.terminalLabels.lost}
                        </span>
                      )}
                      {isTerminal ? (
                        <Tooltip content="Os dois terminais existem sempre — dá para renomear, não para apagar." side="top">
                          <span className="inline-flex items-center gap-1 text-[10px] text-surface-500 whitespace-nowrap">
                            <Lock className="w-3 h-3" /> fixo · renomeável
                          </span>
                        </Tooltip>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setStages((prev) => removeStage(prev, stage.id))}
                          aria-label={`Remover etapa ${stage.label || ''}`.trim()}
                          className="p-1 rounded-lg text-surface-500 hover:text-red-400 hover:bg-red-900/20 transition-all"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </li>
                  )
                })}
                <li>
                  <button
                    type="button"
                    onClick={() => setStages((prev) => addNormalStage(prev))}
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-500 hover:text-brand-400 px-1 py-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> adicionar etapa
                  </button>
                </li>
              </ul>
            )}

            <p className="text-[11px] text-surface-500 leading-relaxed">
              Os dois terminais existem sempre — dá para renomear, não para apagar. O funil só é criado com pelo menos uma etapa normal.
              {templatesFailed && ' Modelos indisponíveis neste ambiente — monte as etapas à mão.'}
            </p>
          </div>
        )}
      </div>
    </Modal>
  )
}
