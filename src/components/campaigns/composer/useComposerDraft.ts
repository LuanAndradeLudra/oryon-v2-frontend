// ─── useComposerDraft ──────────────────────────────────────────────────────
// Hook do Composer de 4 blocos (D2/SCRUM-1020). Nome reaproveitado: até a
// W0.4 ele designava o hook do wizard, que agora se chama `useWizardDraft`.
//
// Usa o mesmo núcleo do wizard (`useCampaignDraftCore`) e acrescenta só o
// que é do Composer: o público no modelo novo (`AudienceDraft`), a
// recorrência do BE.4 e o estado de conclusão POR BLOCO — sem `step` nenhum,
// porque aqui os 4 blocos são um acordeão, não uma esteira.
//
// Zero lógica de segmento: quem resolve, conta e desenha o público é o
// `AudienceBlock` do Crivo (`campaigns/audience/**`), que conversa com o
// Composer só por props (coord/D6-plano.md §1, coord/D2-plano.md §9).
import { useState, useCallback, useMemo } from 'react'
import { useCampaignDraftCore, type SubmitAudienceFields } from './useCampaignDraftCore'
import type { Campaign } from '@/types'
import type { CampaignSegmentDefinition, CampaignRecurrence } from '@/types/campaignsV2'

/** O rascunho de público que o `AudienceBlock` mantém.
 *
 *  Tipado aqui contra os contratos compartilhados (`types/campaignsV2.ts`,
 *  W0.6/Buril) em vez de contra `campaigns/audience/segmentBuilder.ts`, que é
 *  do Crivo e ainda não existe — quando ele publicar, este alias passa a
 *  apontar para lá sem mudar nenhum consumidor. `segmentId` presente quer
 *  dizer "veio de um segmento salvo"; ele some no primeiro edit manual, e é
 *  isso que decide a forma do body no submit (§9.1 do D2-plano). */
export interface AudienceDraft {
  segmentId?: string
  definition: CampaignSegmentDefinition
}

/** Resultado mais recente do evaluate, como o `AudienceBlock` o entrega.
 *  `eligible` é quem de fato recebe (o "Vão receber" do mockup) e é o número
 *  que o Composer usa em tudo: trava do "Agendar", custo e duração estimada.
 *  `matched` fica só na coluna do próprio bloco (§9.2 do D2-plano). */
export interface AudienceResolved {
  eligible: number
  matched: number
}

export type BlockId = 'template' | 'publico' | 'variaveis' | 'envio'

export type BlockStatus = 'done' | 'pending'

/** Ordem canônica dos blocos — vale para o acordeão e para o "Falta: …" da
 *  barra fixa, que aponta o primeiro pendente nesta ordem. */
export const BLOCK_ORDER: BlockId[] = ['template', 'publico', 'variaveis', 'envio']

export const BLOCK_LABELS: Record<BlockId, string> = {
  template:  'Template',
  publico:   'Público',
  variaveis: 'Variáveis',
  envio:     'Envio',
}

export interface ComposerDraftOptions {
  /** Presente em `/campaigns/:id/edit` — o submit vira PATCH e o envio
   *  imediato não acontece. */
  campaignId?: string
  initialName?: string
  onSaved?: (campaign: Campaign) => void
}

export function useComposerDraft({ campaignId, initialName, onSaved }: ComposerDraftOptions = {}) {
  // O Composer é uma página: nasce ativo e não abre/fecha como o modal.
  const core = useCampaignDraftCore({ active: true, initialName })

  const [audience, setAudience]     = useState<AudienceDraft | null>(null)
  const [resolved, setResolved]     = useState<AudienceResolved | null>(null)
  const [recurrence, setRecurrence] = useState<CampaignRecurrence | null>(null)

  /** Última contagem elegível conhecida. Guardada à parte de propósito: o
   *  `AudienceBlock` manda `null` durante o debounce do evaluate e no modo
   *  fallback, e um `null` transitório não pode fazer o bloco Público piscar
   *  de verde para vermelho na barra fixa (§9.3 do D2-plano). Só uma troca
   *  real de `definition` invalida a contagem. */
  const [lastEligible, setLastEligible] = useState<number | null>(null)

  const onAudienceChange = useCallback((next: AudienceDraft) => {
    setAudience((prev) => {
      // Mudou a definição de verdade → a contagem antiga não vale mais.
      if (!prev || !sameDefinition(prev.definition, next.definition)) {
        setLastEligible(null)
      }
      return next
    })
  }, [])

  const onAudienceResolved = useCallback((next: AudienceResolved | null) => {
    setResolved(next)
    if (next) setLastEligible(next.eligible)
  }, [])

  /** Quantas pessoas o disparo atinge, na melhor informação disponível. */
  const audienceCount = resolved?.eligible ?? lastEligible

  // ── Conclusão por bloco ───────────────────────────────────────────────────
  const blocks = useMemo((): Record<BlockId, BlockStatus> => ({
    template:  core.selectedTemplate && core.campaignName.trim().length > 0 ? 'done' : 'pending',
    publico:   audience && (audienceCount ?? 0) > 0 ? 'done' : 'pending',
    variaveis: core.mappings.length === 0 || core.mappingsComplete ? 'done' : 'pending',
    envio:     core.scheduleReady && !core.needsExplicitLine ? 'done' : 'pending',
  }), [core.selectedTemplate, core.campaignName, core.mappings.length, core.mappingsComplete,
       core.scheduleReady, core.needsExplicitLine, audience, audienceCount])

  /** Primeiro bloco pendente na ordem canônica — o que a barra fixa mostra
   *  em "Falta: …". `null` quando os 4 estão verdes. */
  const firstPending = BLOCK_ORDER.find((id) => blocks[id] === 'pending') ?? null

  const canSchedule = firstPending === null

  // ── Submissão ─────────────────────────────────────────────────────────────
  const { submitCampaign } = core

  const submit = useCallback(async () => {
    if (!audience) return null
    // Exatamente uma das três formas (Decisão D25). Segmento salvo e ainda
    // não editado viaja por id; o resto viaja inline. O `segment` legado
    // nunca sai do Composer — é só do wizard antigo.
    const audienceFields: SubmitAudienceFields = audience.segmentId
      ? { segmentId: audience.segmentId }
      : { audience: audience.definition }

    const result = await submitCampaign({ audienceFields, campaignId })
    if (result.ok) onSaved?.(result.campaign)
    return result
  }, [audience, campaignId, submitCampaign, onSaved])

  return {
    ...core,
    // público (modelo novo)
    audience, setAudience: onAudienceChange, onAudienceResolved,
    resolved, audienceCount,
    // recorrência (BE.4) — a opção só é renderizada quando o endpoint
    // existir; até lá este estado fica em `null` e ninguém o mexe (§8 do
    // D2-plano: oculta, não desabilitada).
    recurrence, setRecurrence,
    // acordeão
    blocks, firstPending, canSchedule,
    // submissão
    campaignId, submit,
  }
}

/** Comparação estrutural barata das definições de público. Serve só para
 *  saber se a contagem guardada ainda vale — não é validação de shape. */
function sameDefinition(a: CampaignSegmentDefinition, b: CampaignSegmentDefinition): boolean {
  return JSON.stringify(a) === JSON.stringify(b)
}
