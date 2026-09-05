// ─── AudienceBlock ─────────────────────────────────────────────────────────
// O bloco "Público" do Composer (D6/SCRUM-1021) — é isto que a D2 importa e
// monta. Interface só por props: o bloco não conhece a barra fixa do Composer
// (Custo / Falta / Enviar teste / Agendar) nem os outros 3 blocos; devolve o
// que descobriu por `onResolvedChange` e sinaliza o fim da configuração por
// `onConfirm`. Assinatura publicada em coord/D6-plano.md.
//
// Duas colunas, como no mockup: regras à esquerda, número vivo à direita
// (380px). Sem BE.3 no ar a tela degrada — ver `degraded` abaixo.
import { useCallback, useEffect, useMemo, useReducer, useState } from 'react'
import { Bookmark, ArrowRight, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { stagesApi, tagsApi } from '@/services/api'
import { segmentsApi } from '@/services/campaignsV2Api'
import { withFallback } from '@/services/withFallback'
import type { Tag, TenantStage } from '@/types'
import type { CampaignSegmentSaved, SegmentExclusions } from '@/types/campaignsV2'
import { ConditionRow, type ValueOption } from './ConditionRow'
import { ExclusionGroup } from './ExclusionGroup'
import { LiveCount } from './LiveCount'
import { SampleList } from './SampleList'
import { SavedSegmentsBar } from './SavedSegmentsBar'
import { OrDivider, SegmentGroup } from './SegmentGroup'
import type { FieldSpec } from './fieldCatalog'
import {
  createEmptyDefinition,
  fromSegmentDefinition,
  segmentBuilderReducer,
  toSegmentDefinition,
  type AudienceDefinition,
  type AudienceDraft,
  type EditorCondition,
  type SegmentBuilderAction,
} from './segmentBuilder'
import { useAudienceEvaluate } from './useAudienceEvaluate'

export interface AudienceResolved {
  /** Quem realmente vai receber, depois das exclusões. */
  eligible: number
  /** Quem atende às condições, antes das exclusões. */
  matched: number
}

export interface AudienceBlockProps {
  value: AudienceDraft
  onChange: (next: AudienceDraft) => void
  /** Última avaliação conhecida. `null` = ainda não dá para saber (nenhuma
   *  condição montada, ou o cálculo falhou). Nunca devolve 0 por erro:
   *  público desconhecido não é público vazio. */
  onResolvedChange?: (result: AudienceResolved | null) => void
  /** "Usar N": o operador terminou de configurar o público.
   *
   *  `count` é **`eligible`**, nunca `matched` — é o número que aparece no
   *  botão e o único que corresponde a quem vai receber mensagem de fato.
   *  `matched` é o bruto antes das exclusões (opt-out, disparo recente,
   *  conversa com a IA) e serve só para a frase "de N que atendem às
   *  condições". Usar `matched` para custo ou para a cota da linha
   *  superestimaria o envio. Quem precisar dos dois números pega em
   *  `onResolvedChange`, que devolve o par. */
  onConfirm?: (definition: AudienceDefinition, count: number) => void
  /** "ver os N": a D2 abre o `ContactListModal` dela com esta definição. */
  onViewAll?: (definition: AudienceDefinition) => void
  /** Custo estimado em centavos, quando a D2 já souber o template. */
  estimatedCostCents?: number
  className?: string
}

export function AudienceBlock({
  value, onChange, onResolvedChange, onConfirm, onViewAll, estimatedCostCents, className,
}: AudienceBlockProps) {
  // O estado canônico é o do pai (a D2 é dona do rascunho da campanha), mas a
  // mecânica de edição é do redutor; `load_definition` reconcilia quando o
  // valor troca por fora.
  const [definition, dispatch] = useReducer(segmentBuilderReducer, value.definition ?? createEmptyDefinition())
  const [editingId, setEditingId] = useState<string | null>(null)
  const [tags, setTags] = useState<Tag[]>([])
  const [stages, setStages] = useState<TenantStage[]>([])
  const [saved, setSaved] = useState<CampaignSegmentSaved[]>([])
  const [savingName, setSavingName] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const { result, loading, error, unsupported } = useAudienceEvaluate(definition)

  // Sem BE.3 no ar o motor antigo não tem grupos, nem OU, nem exclusão de
  // verdade: a tela trava em 1 grupo E, com opt-out imposto.
  const degraded = result !== null && !result.available

  useEffect(() => {
    if (value.definition !== definition) {
      dispatch({ type: 'load_definition', definition: value.definition })
    }
    // Só reage a troca vinda de fora; edições locais já saíram pelo `emit`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.definition])

  useEffect(() => {
    let stale = false
    Promise.all([tagsApi.list(), stagesApi.list()])
      .then(([tagRes, stageRes]) => {
        if (stale) return
        setTags(tagRes.data)
        setStages(stageRes.data)
      })
      .catch(() => {
        // Sem etiquetas/situações o construtor ainda funciona (os demais
        // campos são enums fixos); a linha afetada mostra "Nada configurado".
      })
    return () => { stale = true }
  }, [])

  // Segmentos salvos só existem com BE.3; 404 devolve lista vazia e a barra
  // de chips some inteira.
  useEffect(() => {
    let stale = false
    withFallback(() => segmentsApi.list().then((r) => r.data), [] as CampaignSegmentSaved[])
      .then(({ data }) => { if (!stale) setSaved(data) })
      .catch(() => { /* lista de segmentos é acessório: não bloqueia a tela */ })
    return () => { stale = true }
  }, [])

  useEffect(() => {
    onResolvedChange?.(result ? { eligible: result.eligible, matched: result.matched } : null)
  }, [result, onResolvedChange])

  // Contagem parcial de cada linha. Só entra no estado local: é exibição, o
  // pai não precisa saber, e `toEvaluateGroups` descarta `count`, então isto
  // não realimenta o hook nem gera uma segunda avaliação.
  useEffect(() => {
    if (result?.available && result.perCondition.length > 0) {
      dispatch({ type: 'apply_counts', perCondition: result.perCondition })
    }
  }, [result])

  const run = useCallback(
    (action: SegmentBuilderAction) => {
      const next = segmentBuilderReducer(definition, action)
      if (next === definition) return
      dispatch(action)
      // Toda edição manual desfaz o vínculo com o segmento salvo: a definição
      // deixa de ser a que está gravada em `campaign_segments`.
      onChange({ definition: next })
    },
    [definition, onChange],
  )

  const optionsFor = useCallback(
    (spec: FieldSpec): ValueOption[] => {
      if (spec.options === 'tags') return tags.map((t) => ({ value: t.id, label: t.name }))
      if (spec.options === 'stages') return stages.map((s) => ({ value: s.key, label: s.label }))
      return Array.isArray(spec.options) ? spec.options : []
    },
    [tags, stages],
  )

  const stageLabel = useCallback(
    (key: string) => stages.find((s) => s.key === key)?.label ?? key,
    [stages],
  )

  function selectSaved(segment: CampaignSegmentSaved) {
    const loaded = fromSegmentDefinition(segment.definition)
    dispatch({ type: 'load_definition', definition: loaded })
    onChange({ segmentId: segment.id, definition: loaded })
  }

  function selectCustom() {
    onChange({ definition })
  }

  async function saveSegment() {
    const name = savingName?.trim()
    if (!name) return
    setSaving(true)
    try {
      const created = await segmentsApi.create(name, toSegmentDefinition(definition))
      setSaved((list) => [...list, created.data])
      onChange({ segmentId: created.data.id, definition })
      setSavingName(null)
    } finally {
      setSaving(false)
    }
  }

  // Só o primeiro grupo sobrevive ao modo degradado — os demais não têm como
  // ser avaliados pelo motor antigo, e mostrá-los sugeriria que contam.
  const visibleGroups = useMemo(
    () => (degraded ? definition.groups.slice(0, 1) : definition.groups),
    [degraded, definition.groups],
  )

  const eligible = result?.eligible ?? 0

  return (
    <div className={cn('grid grid-cols-[1fr_380px] min-h-0 flex-1', className)}>
      {/* ── Coluna de regras ── */}
      <div className="px-7 py-5 overflow-auto min-w-0">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <h2 className="text-[22px] text-surface-50">Quem recebe?</h2>
            <p className="text-xs text-surface-400 mt-1">
              {saved.length > 0
                ? 'Comece por um segmento salvo ou monte as condições.'
                : 'Monte as condições do público.'}
            </p>
          </div>
          <SavedSegmentsBar
            segments={saved}
            activeId={value.segmentId}
            onSelect={selectSaved}
            onSelectCustom={selectCustom}
          />
        </div>

        {visibleGroups.map((group, groupIndex) => (
          <div key={group.id}>
            {groupIndex > 0 && <OrDivider />}
            <SegmentGroup
              title={
                groupIndex === 0 ? (
                  <>Incluir quem atende a <b className="text-surface-100">{group.op === 'and' ? 'todas' : 'qualquer'}</b></>
                ) : (
                  'Incluir também'
                )
              }
              op={degraded ? undefined : group.op}
              onOpChange={degraded ? undefined : (op) => run({ type: 'set_group_op', groupId: group.id, op })}
              onAddCondition={() => run({ type: 'add_condition', groupId: group.id })}
              onRemove={
                visibleGroups.length > 1 ? () => run({ type: 'remove_group', groupId: group.id }) : undefined
              }
              removeLabel={`Remover grupo ${groupIndex + 1} de condições`}
            >
              {group.conditions.map((condition, conditionIndex) => (
                <ConditionRow
                  key={condition.id}
                  condition={condition}
                  connector={conditionIndex === 0 ? '' : group.op === 'and' ? 'E' : 'OU'}
                  optionsFor={optionsFor}
                  editing={editingId === condition.id}
                  onToggleEdit={() => setEditingId((id) => (id === condition.id ? null : condition.id))}
                  onChange={(patch: Partial<Omit<EditorCondition, 'id'>>) =>
                    run({ type: 'update_condition', groupId: group.id, conditionId: condition.id, patch })
                  }
                  onRemove={() => run({ type: 'remove_condition', groupId: group.id, conditionId: condition.id })}
                  disabled={unsupported.includes(condition.id)}
                />
              ))}
              {group.conditions.length === 0 && (
                <p className="text-xs text-surface-500 mb-2">Sem condições: este grupo não entra no público.</p>
              )}
            </SegmentGroup>
          </div>
        ))}

        {!degraded && (
          <button
            type="button"
            onClick={() => run({ type: 'add_group' })}
            className="mt-2.5 inline-flex items-center gap-1.5 text-xs text-surface-400 hover:text-surface-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Incluir também outro grupo
          </button>
        )}

        <ExclusionGroup
          value={definition.exclude}
          onChange={(patch: Partial<SegmentExclusions>) => run({ type: 'set_exclude', patch })}
          counts={result?.available ? result.excluded : undefined}
          degraded={degraded}
        />
      </div>

      {/* ── Coluna viva ── */}
      {/* `min-w-0` nas DUAS colunas, como o mockup faz em `.aud>div` — sem
          isso o `min-width:auto` do grid deixa um nome de contato longo ou o
          texto do insight empurrar a coluna além dos 380 e quebrar o layout,
          justamente quando o público tem alguém de nome comprido. */}
      <div className="border-l border-surface-800 bg-surface-900 p-5 flex flex-col gap-3.5 overflow-auto min-w-0">
        <LiveCount
          evaluation={result}
          loading={loading}
          error={error}
          estimatedCostCents={estimatedCostCents}
        />

        {result?.available && (
          <SampleList
            contacts={result.sample}
            total={result.eligible}
            stageLabel={stageLabel}
            onViewAll={onViewAll ? () => onViewAll(definition) : undefined}
          />
        )}

        <div className="mt-auto flex flex-col gap-2">
          {savingName !== null && (
            <div className="flex gap-2">
              <Input
                autoFocus
                value={savingName}
                onChange={(e) => setSavingName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') void saveSegment() }}
                placeholder="Nome do segmento"
                aria-label="Nome do segmento a salvar"
              />
              <Button variant="secondary" onClick={() => void saveSegment()} disabled={saving || !savingName.trim()}>
                Salvar
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            {/* Sem BE.3 não existe `campaign_segments` onde gravar. */}
            {!degraded && savingName === null && (
              <Button variant="secondary" className="flex-1" onClick={() => setSavingName('')}>
                <Bookmark className="w-4 h-4" />
                Salvar segmento
              </Button>
            )}
            <Button
              variant="primary"
              className="flex-1"
              disabled={!result || eligible === 0}
              onClick={() => onConfirm?.(definition, eligible)}
            >
              Usar {eligible.toLocaleString('pt-BR')}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
